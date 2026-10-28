"""BizLens Semantic Role Resolver: Deterministic, priority-weighted mapping of dataset columns to analytical roles."""

from typing import Dict, Any, Optional, List
import re

# Priority rankings for column resolution when multiple columns match a role
ROLE_PRIORITY_NAMES: Dict[str, List[str]] = {
    "revenue": [
        "revenue", "sales", "total_sales", "salesamount", "total_amount", "amount",
        "turnover", "gross_sales", "arr_amount", "mrp", "net_sales", "invoice_value", "gmv", "val"
    ],
    "profit": [
        "profit", "gross_profit", "net_profit", "operating_profit", "total_profit",
        "earnings", "net_income", "margin_amount"
    ],
    "cost": [
        "cost", "cogs", "costamount", "total_cost", "purchase_cost", "unit_cost",
        "wholesale_cost", "expense", "cogs_amount", "spend", "shipping_cost"
    ],
    "quantity": [
        "quantity", "units", "qty", "units_sold",
        "order_qty", "sales_volume", "pieces", "cartons", "packs"
    ],
    "category": [
        "category", "productcategory", "product_category", "item_category",
        "department", "dept", "sub_category", "subcategory", "segment",
        "product_type", "platform", "tier", "division", "group"
    ],
    "region": [
        "region", "state", "country", "city", "zone", "territory", "district",
        "province", "location", "hub", "market"
    ],
    "date": [
        "order_date", "orderdate", "date", "txn_date", "transaction_date",
        "sale_date", "billing_date", "postdate", "signupdate", "timestamp", "period"
    ],
    "customer": [
        "customer_name", "customername", "customer_id", "customerid",
        "client_name", "client", "buyer", "customer_email"
    ],
    "product": [
        "product_name", "productname", "item_name", "product_id", "productid",
        "sku", "product", "item"
    ],
    "id": [
        "order_id", "orderid", "transaction_id", "transactionid", "invoice_id",
        "postid", "subscription_id", "id", "trans_id", "bill_no"
    ],
    "margin": [
        "margin", "gross_margin", "profit_margin", "margin_percentage", "margin_pct"
    ],
    "discount": [
        "discount", "discount_amount", "discount_percentage", "discount_pct", "disc"
    ],
}

# Column name substrings that should be heavily penalized for specific roles
PENALIZED_NAMES: Dict[str, List[str]] = {
    "revenue": ["profit", "cost", "cogs", "discount", "qty", "quantity", "units", "id"],
    "profit": ["revenue", "sales", "cost", "cogs", "quantity", "discount", "id"],
    "quantity": ["score", "paper", "hour", "sleep", "study", "age", "rating", "index", "id", "year", "date", "price", "amount", "cost", "revenue", "profit", "margin", "discount", "percent", "pct", "km", "capacity"],
    "category": ["priority", "order_priority", "mode", "ship_mode", "status", "is_", "flag", "gender"],
    "date": ["is_", "new", "flag", "status", "ship_date", "dispatch_date", "due_date"],
    "region": ["postal", "zip", "code", "pincode"],
}


def score_column_for_role(col_name: str, role: str, item_meta: Dict[str, Any]) -> float:
    """Calculates a deterministic suitability score for a column given a candidate role."""
    clean_name = col_name.lower().replace(" ", "_").replace("-", "_")
    score = 10.0

    # 1. Exact priority name match (highest precedence)
    priorities = ROLE_PRIORITY_NAMES.get(role, [])
    if clean_name in priorities:
        rank_idx = priorities.index(clean_name)
        score += max(0, 100 - (rank_idx * 5))
    else:
        # Substring matches in priorities
        for idx, p in enumerate(priorities):
            if p in clean_name:
                score += max(0, 50 - (idx * 3))
                break

    # 2. Penalize inappropriate column names
    penalties = PENALIZED_NAMES.get(role, [])
    for p in penalties:
        if p in clean_name:
            score -= 60.0

    # 3. Confidence from profiling/inference
    if isinstance(item_meta, dict):
        conf = float(item_meta.get("confidence", 0.5))
        score += conf * 20.0
        if item_meta.get("confirmed"):
            score += 30.0

        dtype = str(item_meta.get("data_type") or "").upper()
        if role == "date" and any(t in dtype for t in ("TIME", "DATE")):
            score += 25.0
        elif role in ("revenue", "profit", "cost", "quantity", "margin", "discount"):
            if any(t in dtype for t in ("INT", "FLOAT", "DOUBLE", "NUMERIC", "DECIMAL", "REAL")):
                score += 20.0
            elif "VARCHAR" in dtype or "TEXT" in dtype:
                score -= 40.0
        elif role in ("category", "region", "product", "customer"):
            if any(t in dtype for t in ("VARCHAR", "TEXT", "STRING")):
                score += 15.0

    return score


def resolve_role_to_col(mapping: Optional[Dict[str, Any]]) -> Dict[str, str]:
    """
    Given a raw column mapping dictionary, returns the optimal single column for each semantic role.
    Prevents secondary or low-quality columns from overriding primary canonical columns.
    """
    if not mapping:
        return {}

    # Group candidate columns by their stated or inferred roles
    role_candidates: Dict[str, List[tuple[str, Dict[str, Any]]]] = {}

    for col_name, item in mapping.items():
        if isinstance(item, dict):
            role = item.get("role")
            meta = item
        elif isinstance(item, str):
            role = item
            meta = {"role": item, "confidence": 0.8}
        else:
            continue

        if not role or role == "ignore":
            continue

        # Detect columns named 'profit' that were misassigned to 'revenue'
        clean_name = col_name.lower().replace(" ", "_")
        if role == "revenue" and ("profit" in clean_name or clean_name == "profit"):
            role = "profit"

        # Safeguard quantity role: only accept columns genuinely representing commercial unit/item counts
        if role == "quantity":
            valid_qty = any(k in clean_name for k in ["quantity", "qty", "units", "pieces", "cartons", "packs", "order_qty", "units_sold", "sales_volume", "seats"])
            is_penalized = any(p in clean_name for p in ["score", "paper", "hour", "sleep", "study", "age", "rating", "index", "km", "capacity", "like", "click", "share", "view", "reach", "impression", "follower"])
            if not valid_qty or is_penalized:
                continue

        if role not in role_candidates:
            role_candidates[role] = []
        role_candidates[role].append((col_name, meta))

    # Also detect if profit exists in the dataset even if mapped under another role
    if "profit" not in role_candidates:
        for col_name, item in mapping.items():
            clean_name = col_name.lower().replace(" ", "_")
            if clean_name in ("profit", "gross_profit", "net_profit", "total_profit"):
                meta = item if isinstance(item, dict) else {"role": "profit", "confidence": 0.95}
                role_candidates["profit"] = [(col_name, meta)]
                break

    resolved: Dict[str, str] = {}

    for role, candidates in role_candidates.items():
        if not candidates:
            continue
        scored = [
            (col_name, score_column_for_role(col_name, role, meta))
            for col_name, meta in candidates
        ]
        # Sort descending by score
        scored.sort(key=lambda x: x[1], reverse=True)
        resolved[role] = scored[0][0]

    return resolved
