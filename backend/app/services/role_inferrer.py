"""BizLens Column Role Inferrer: Two-tier deterministic heuristic and Gemini AI semantic column role classifier with confidence scoring and provenance."""

import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from rapidfuzz import fuzz

from app.core.config import settings
from app.core.logging import logger
from app.services.profiler import ColumnProfile

ROLE_TAXONOMY = [
    "date",
    "revenue",
    "profit",
    "cost",
    "quantity",
    "category",
    "region",
    "product",
    "customer",
    "margin",
    "discount",
    "id",
    "text",
]

# Standard synonym dictionaries for enterprise & Indian commerce datasets
ROLE_SYNONYMS: Dict[str, List[str]] = {
    "date": [
        "date", "order_date", "invoice_date", "txn_date", "timestamp", "created_at",
        "sale_date", "billing_date", "period", "month", "year", "quarter", "day",
        "transaction_date", "ship_date", "dispatch_date"
    ],
    "revenue": [
        "revenue", "sales", "total_sales", "amount", "total_amount", "gross_sales",
        "turnover", "net_sales", "price", "unit_price", "selling_price", "mrp",
        "bill_amount", "invoice_value", "total", "subtotal", "gmv", "val", "value"
    ],
    "profit": [
        "profit", "net_profit", "gross_profit", "operating_profit", "total_profit",
        "earnings", "net_income", "ebitda", "ebit"
    ],
    "cost": [
        "cost", "cogs", "unit_cost", "purchase_cost", "purchase_price", "expense",
        "wholesale_cost", "cost_price", "procurement_cost", "landed_cost", "expenditure"
    ],
    "quantity": [
        "quantity", "qty", "units", "units_sold", "order_qty", "sales_volume",
        "pieces", "cartons", "packs"
    ],
    "category": [
        "category", "sub_category", "department", "dept", "product_category", "segment",
        "line", "group", "class", "family", "product_type", "vertical", "division"
    ],
    "region": [
        "state", "city", "region", "zone", "territory", "province", "country",
        "district", "location", "hub", "pincode", "postal_code", "zip", "place",
        "destination", "origin", "area"
    ],
    "product": [
        "product", "product_name", "item", "item_name", "sku", "description",
        "product_description", "title", "item_description", "article", "model"
    ],
    "customer": [
        "customer", "customer_name", "client", "client_name", "buyer", "account_name",
        "consumer", "customer_id", "party_name", "dealer", "distributor"
    ],
    "margin": [
        "margin", "gross_margin", "profit_margin", "margin_percentage", "markup",
        "net_margin", "margin_pct", "profit_pct", "spread"
    ],
    "discount": [
        "discount", "discount_amount", "discount_percentage", "rebate", "markdown",
        "concession", "scheme_discount", "promo_discount", "disc"
    ],
    "id": [
        "id", "order_id", "invoice_id", "transaction_id", "txn_id", "bill_no",
        "invoice_no", "doc_no", "order_number", "trans_id", "code", "reference_no"
    ],
    "text": [
        "customer_feedback", "feedback", "review", "reviews", "notes", "remarks", "comments", "address", "memo", "details", "narrative"
    ],
}

KNOWN_INDIAN_STATES_AND_CITIES = {
    "karnataka", "maharashtra", "delhi", "tamil nadu", "telangana", "uttar pradesh",
    "gujarat", "west bengal", "rajasthan", "kerala", "bengaluru", "bangalore", "mumbai",
    "delhi", "hyderabad", "chennai", "kolkata", "pune", "ahmedabad", "jaipur"
}


@dataclass
class RoleInference:
    column_name: str
    original_name: str
    suggested_role: str
    confidence: float
    reasoning: str
    alternative_roles: List[Tuple[str, float]]
    confirmed: bool = False


class ColumnRoleInferrer:
    def infer_roles(
        self,
        profiles: Dict[str, ColumnProfile],
        sample_rows: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, RoleInference]:
        """Infers semantic roles for all columns using deterministic rules with optional LLM refinement."""
        inferences: Dict[str, RoleInference] = {}

        for col_name, profile in profiles.items():
            inference = self._infer_single_column(profile)
            inferences[col_name] = inference

        # If any columns have low confidence (< 0.85) and Gemini API key is configured, refine via Gemini
        low_confidence_cols = [
            (col_name, inf)
            for col_name, inf in inferences.items()
            if inf.confidence < 0.85
        ]

        if low_confidence_cols and settings.GEMINI_API_KEY:
            try:
                self._refine_with_gemini(low_confidence_cols, profiles, inferences)
            except Exception as e:
                logger.warning("Gemini role refinement skipped: %s", e)

        return inferences

    def _infer_single_column(self, profile: ColumnProfile) -> RoleInference:
        """Tier 1: High-precision deterministic heuristic scoring."""
        name = profile.column_name.lower()
        orig = profile.original_name.lower()
        family = profile.semantic_family

        scores: Dict[str, float] = {role: 0.05 for role in ROLE_TAXONOMY}
        reasons: Dict[str, List[str]] = {role: [] for role in ROLE_TAXONOMY}

        # 1. Exact Name Matches
        for role, syns in ROLE_SYNONYMS.items():
            if name in syns or orig in syns:
                scores[role] += 0.85
                reasons[role].append(f"exact name match '{orig}'")
            else:
                # Token or substring matches
                for s in syns:
                    if s in name or s in orig:
                        scores[role] += 0.50
                        reasons[role].append(f"contains keyword '{s}'")
                        break
                    # Fuzzy match
                    ratio = fuzz.token_sort_ratio(orig, s)
                    if ratio > 85:
                        scores[role] += 0.45
                        reasons[role].append(f"fuzzy match '{s}' ({ratio}%)")
                        break

        # 2. Semantic Data Type & Value Distribution Signals
        if family == "temporal":
            scores["date"] += 0.70
            reasons["date"].append("temporal SQL data type")
        elif family == "numeric":
            scores["date"] -= 0.30
            # Numeric column can be revenue, cost, quantity, margin, discount
            if profile.numeric_stats:
                max_v = profile.numeric_stats.get("max")
                min_v = profile.numeric_stats.get("min")
                zeros = profile.numeric_stats.get("zeros_count", 0)

                if max_v is not None and max_v <= 1.0 and (min_v is None or min_v >= 0.0):
                    scores["margin"] += 0.30
                    scores["discount"] += 0.30
                    reasons["margin"].append("fractional range (0 to 1)")

                # If large monetary magnitude
                if max_v is not None and max_v > 1000:
                    scores["revenue"] += 0.25
                    scores["cost"] += 0.20
                    reasons["revenue"].append(f"large positive magnitude (max: {max_v})")

                # Only score quantity if column name genuinely indicates commercial item/unit counts
                if "INT" in profile.duckdb_type and any(k in name for k in ["qty", "quantity", "units", "pieces", "cartons", "units_sold", "order_qty"]):
                    scores["quantity"] += 0.35
                    reasons["quantity"].append("explicit quantity naming with integer distribution")

        elif family == "categorical":
            # Categorical cannot be revenue or cost
            scores["revenue"] = max(0.0, scores["revenue"] - 0.50)
            scores["cost"] = max(0.0, scores["cost"] - 0.50)
            scores["quantity"] = max(0.0, scores["quantity"] - 0.50)

            # Check for geographic values in top values
            if profile.categorical_stats and profile.categorical_stats.get("top_values"):
                top_vals = [
                    str(tv.get("value", "")).lower()
                    for tv in profile.categorical_stats["top_values"]
                ]
                geo_matches = [v for v in top_vals if v in KNOWN_INDIAN_STATES_AND_CITIES]
                if geo_matches:
                    scores["region"] += 0.75
                    reasons["region"].append(f"matched regional locations: {geo_matches[:3]}")

            # Unique / ID check
            if profile.is_unique or profile.cardinality_ratio > 0.8:
                if any(k in name for k in ["id", "no", "code", "num", "key"]):
                    scores["id"] += 0.60
                    reasons["id"].append("high uniqueness with ID suffix")
                else:
                    scores["product"] += 0.25
                    scores["customer"] += 0.25

            # Low to medium cardinality indicates category
            if 2 <= profile.distinct_count <= 40 and not profile.is_unique:
                if any(k in name for k in ["priority", "mode", "ship_mode", "status"]):
                    scores["category"] = max(0.05, scores["category"] - 0.30)
                else:
                    scores["category"] += 0.35
                    reasons["category"].append(f"discrete cardinality ({profile.distinct_count} unique classes)")

            if name in ("category", "product_category", "productcategory", "item_category", "department"):
                scores["category"] += 0.50
                reasons["category"].append("canonical category column name")

        # Sort candidates by score
        sorted_candidates = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_role, top_score = sorted_candidates[0]
        # Normalize score into [0.1, 0.99]
        normalized_confidence = min(0.99, max(0.20, round(top_score, 2)))

        reasoning_text = "; ".join(reasons.get(top_role, ["heuristic rules"]))
        if not reasoning_text:
            reasoning_text = f"best heuristic alignment with {top_role}"

        alternatives = [
            (role, round(score, 2))
            for role, score in sorted_candidates[1:4]
            if score > 0.2
        ]

        return RoleInference(
            column_name=profile.column_name,
            original_name=profile.original_name,
            suggested_role=top_role,
            confidence=normalized_confidence,
            reasoning=reasoning_text,
            alternative_roles=alternatives,
            confirmed=False,
        )

    def _refine_with_gemini(
        self,
        low_confidence_cols: List[Tuple[str, RoleInference]],
        profiles: Dict[str, ColumnProfile],
        inferences: Dict[str, RoleInference],
    ):
        """Tier 2: LLM refinement using Gemini Flash for ambiguous columns."""
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        columns_payload = []
        for col_name, inf in low_confidence_cols:
            prof = profiles[col_name]
            top_vals = []
            if prof.categorical_stats and prof.categorical_stats.get("top_values"):
                top_vals = [tv["value"] for tv in prof.categorical_stats["top_values"][:3]]
            columns_payload.append({
                "column_name": prof.original_name,
                "clean_name": col_name,
                "data_type": prof.duckdb_type,
                "distinct_count": prof.distinct_count,
                "sample_values": top_vals,
                "heuristic_guess": inf.suggested_role,
            })

        system_instruction = (
            "You are a semantic data architect for BizLens enterprise intelligence. "
            "Given column metadata, map each column to the most accurate role from this taxonomy: "
            f"{', '.join(ROLE_TAXONOMY)}. "
            "CRITICAL: Only assign 'quantity' to columns that represent physical units/items sold, ordered, or shipped in a commercial transaction. "
            "Generic non-sales counts or numerical scores/measurements (such as hours studied, practice papers, test scores, age, ratings, percentages, survey counts) "
            "MUST NOT be assigned 'quantity' - map them to 'text' or leave unassigned. "
            "Output JSON object with a 'classifications' array."
        )

        prompt = (
            f"Allowed roles: {ROLE_TAXONOMY}\n"
            f"Columns to classify:\n{columns_payload}\n\n"
            "Return JSON matching: {\"classifications\": [{\"clean_name\": str, \"role\": str, \"confidence\": float, \"reasoning\": str}]}"
        )

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.0,
            ),
        )

        import json
        data = json.loads(response.text)
        for item in data.get("classifications", []):
            col_name = item.get("clean_name")
            role = item.get("role")
            conf = item.get("confidence", 0.90)
            reason = item.get("reasoning", "Refined via Gemini Flash")

            if col_name in inferences and role in ROLE_TAXONOMY:
                orig_inf = inferences[col_name]
                inferences[col_name] = RoleInference(
                    column_name=orig_inf.column_name,
                    original_name=orig_inf.original_name,
                    suggested_role=role,
                    confidence=min(0.99, max(orig_inf.confidence, conf)),
                    reasoning=f"AI Refinement: {reason}",
                    alternative_roles=orig_inf.alternative_roles,
                    confirmed=False,
                )


role_inferrer = ColumnRoleInferrer()
