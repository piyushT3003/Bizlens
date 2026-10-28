"""BizLens AI Orchestrator: Multi-Context Resolution, Function Calling Whitelist,
Deterministic Fact Pre-Computation, Safe Prompt Wrapping, Post-Generation Guardrails,
and Real-Time SSE Streaming.

RULES.md Mandate:
"Analytics calculates. GenAI explains. Gemini is not the calculator. Gemini is not allowed to invent dataset numbers."
"""

import re
import time
import json
from typing import Dict, Any, List, Optional, Tuple, Set, Generator
from pathlib import Path

from app.core.logging import logger
from app.services.analytics_engine import analytics_engine, AnalyticsQueryResult, format_metric_value
from app.services.metric_registry import metric_registry
from app.services.guardrails import guardrail, GuardrailResult
from app.services.gemini_client import gemini_client
from app.schemas.chat import (
    ChatMessageBlock,
    ShowYourWorkMetadata,
    ChatMessageResponse,
    SuggestedPrompt,
)


# PII Regex Patterns
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_REGEX = re.compile(r'\b(?:\+91[\-\s]?)?[6-9]\d{9}\b')
AADHAAR_REGEX = re.compile(r'\b\d{4}\s\d{4}\s\d{4}\b')
CREDIT_CARD_REGEX = re.compile(r'\b(?:\d{4}[\-\s]?){3}\d{4}\b')

# Whitelisted Operations
WHITELISTED_OPERATIONS = {
    "describe_dataset",
    "get_kpis",
    "compare_periods",
    "top_n",
    "trend",
    "breakdown",
    "filter_preview",
    "data_quality_summary",
    "find_anomalies",
    "forecast",
    "root_cause",
    "geo_breakdown",
}


def detect_pii(text: str) -> Tuple[bool, Optional[str]]:
    """Detects presence of PII (emails, phone numbers, identity numbers) in text."""
    found: List[str] = []
    if EMAIL_REGEX.search(text):
        found.append("Email Address")
    if PHONE_REGEX.search(text):
        found.append("Phone Number")
    if AADHAAR_REGEX.search(text):
        found.append("Aadhaar Number")
    if CREDIT_CARD_REGEX.search(text):
        found.append("Payment Card")

    if found:
        return True, f"Potential sensitive personal data detected: {', '.join(found)}. Please review privacy settings."
    return False, None


def sanitize_untrusted_input(text: str) -> str:
    """Wraps untrusted input in delimited tags and strips system command overrides."""
    # Defend against prompt injection patterns
    cleaned = re.sub(
        r'(?i)(ignore\s+all\s+(?:previous|above)\s+instructions|you\s+are\s+now|system\s+override|dan\s+mode)',
        '[REDACTED_COMMAND]',
        text,
    )
    return f"=== BEGIN USER QUERY ===\n{cleaned.strip()}\n=== END USER QUERY ==="


def parse_nl_filter_spec(query: str, role_to_col: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Parses natural language filters like 'sales above 1 lakh' or 'region South' into validated filter specs."""
    q_lower = query.lower()

    # Number expander for Indian lakh/crore and k
    val: Optional[float] = None
    lakh_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:lakh|lac|lacs)', q_lower)
    crore_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:crore|cr)', q_lower)
    k_match = re.search(r'(\d+(?:\.\d+)?)\s*k\b', q_lower)
    raw_num_match = re.search(r'(?:above|over|greater than|exceeding|>|>=|<|<=|under|below)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)', q_lower)

    if lakh_match:
        val = float(lakh_match.group(1)) * 100_000
    elif crore_match:
        val = float(crore_match.group(1)) * 10_000_000
    elif k_match:
        val = float(k_match.group(1)) * 1_000
    elif raw_num_match:
        val = float(raw_num_match.group(1).replace(",", ""))

    # Operator detection
    op = ">="
    if any(w in q_lower for w in ("below", "under", "less than", "<")):
        op = "<=" if ("<=" in q_lower or "at most" in q_lower) else "<"
    elif any(w in q_lower for w in ("above", "over", "greater than", ">", "at least", "exceeding")):
        op = ">="
    elif "equal" in q_lower or "=" in q_lower:
        op = "="

    target_col = role_to_col.get("revenue") or role_to_col.get("quantity")
    if target_col and val is not None:
        return {
            "column": target_col,
            "operator": op,
            "value": val,
            "display": f"Filter: {target_col} {op} {val:,.0f}",
        }

    return None


class AIOrchestrator:
    def get_suggested_prompts(self, role_to_col: Dict[str, str]) -> List[SuggestedPrompt]:
        """Generate high-relevance suggested questions based on confirmed semantic roles."""
        prompts: List[SuggestedPrompt] = []

        if "revenue" in role_to_col:
            prompts.append(
                SuggestedPrompt(
                    id="p_revenue_summary",
                    prompt="Summarize our overall revenue and profitability performance.",
                    category="Performance",
                )
            )

        if "category" in role_to_col and "revenue" in role_to_col:
            prompts.append(
                SuggestedPrompt(
                    id="p_top_categories",
                    prompt="What were our top-performing product categories by revenue and share?",
                    category="Breakdown",
                )
            )

        if "cost" in role_to_col and "revenue" in role_to_col:
            prompts.append(
                SuggestedPrompt(
                    id="p_margin_analysis",
                    prompt="Analyze our gross margin health and cost efficiency.",
                    category="Profitability",
                )
            )

        if "date" in role_to_col and "revenue" in role_to_col:
            prompts.append(
                SuggestedPrompt(
                    id="p_trend_trajectory",
                    prompt="How has our revenue progressed over the recorded periods?",
                    category="Trends",
                )
            )

        if "region" in role_to_col:
            prompts.append(
                SuggestedPrompt(
                    id="p_geo_breakdown",
                    prompt="Which geographic markets represent our strongest presence?",
                    category="Geography",
                )
            )

        return prompts

    def classify_intent(
        self, query: str, role_to_col: Dict[str, str], context_mode: str = "current_dataset"
    ) -> str:
        """Classifies query into 'general_inquiry' vs 'dataset_grounded'."""
        q_lower = query.strip().lower()

        # 1. Greetings, Bot Identity & Casual Banter (ALWAYS general_inquiry)
        greeting_patterns = [
            r'^(?:hi+|hello+|hey+|greetings|good\s+(?:morning|afternoon|evening)|sup|yo+|hola+|bonjour)\b',
            r'\bwho\s+are\s+you\b',
            r'\bwhat\s+can\s+you\s+do\b',
            r'\bhelp\s+me\b',
            r'\bintroduce\s+yourself\b',
            r'\bwhat\s+is\s+bizlens\b',
            r'\bhow\s+are\s+you\b',
            r'\bhow(?:\'s|\s+is)\s+it\s+going\b',
            r'\btell\s+me\s+a\s+joke\b',
            r'\bthank(?:s|\s+you)\b',
            r'\bwhat\s+is\s+your\s+name\b',
            r'\btell\s+me\s+about\s+yourself\b',
        ]
        if any(re.search(p, q_lower) for p in greeting_patterns):
            return "general_inquiry"

        # Casual jokes, humor, fun, greetings
        if any(w in q_lower for w in ("joke", "humor", "funny", "riddle", "pun", "laugh", "cheer me up")):
            return "general_inquiry"

        # 2. Programming / SQL / Scripting inquiries without dataset reference
        coding_patterns = [
            r'\b(?:write|create|show|give\s+me)\s+(?:a\s+)?(?:python|sql|bash|javascript|typescript|r|regex)\b',
            r'\bpython\s+(?:code|script|function|program)\b',
            r'\bsql\s+(?:query|syntax|script|statement)\b',
            r'\bhow\s+to\s+(?:write|code|implement|use)\s+(?:pandas|duckdb|sql|python|scikit|numpy)\b',
        ]
        if any(re.search(p, q_lower) for p in coding_patterns) and not any(w in q_lower for w in ("in dataset", "our dataset", "this dataset")):
            return "general_inquiry"

        # 3. Conceptual definitions / general business formulas (EBITDA, CAGR, CAC, etc.)
        finance_concepts = [
            r'\bebitda\b', r'\bcagr\b', r'\bltv\b', r'\bcac\b', r'\bcltv\b', r'\broas\b', r'\broi\b',
            r'\bwacc\b', r'\bnpv\b', r'\birr\b', r'\bnps\b', r'\bchurn\b', r'\bworking\s+capital\b',
            r'\bcurrent\s+ratio\b', r'\bquick\s+ratio\b', r'\bdiscount\s+rate\b', r'\bcap\s+rate\b'
        ]
        if any(re.search(p, q_lower) for p in finance_concepts):
            if not any(w in q_lower for w in ("in our dataset", "in this dataset", "our dataset", "my dataset", "for this data")):
                return "general_inquiry"

        conceptual_patterns = [
            r'^(?:what\s+is|what\s+are|define|meaning\s+of)\s+(?:ebitda|cagr|roi|roas|ltv|cac|cltv|arr|mrr|nps|churn|wacc|npv|irr|gross\s+margin|contribution\s+margin|operating\s+margin|inventory\s+turnover|working\s+capital|current\s+ratio|quick\s+ratio|pareto|data\s+lake|parquet|duckdb|olap|oltp|etl|elt)\b',
            r'\bhow\s+(?:do\s+(?:i|we)\s+|to\s+)?calculate\s+(?:ebitda|cagr|roi|roas|ltv|cac|cltv|churn|working\s+capital|margin)\b',
            r'^(?:formula|definition)\s+for\s+',
            r'^difference\s+between\s+',
            r'^best\s+practices\s+for\s+',
            r'^strategy\s+for\s+',
            r'^tips\s+for\s+',
        ]
        is_conceptual = any(re.search(p, q_lower) for p in conceptual_patterns)
        if is_conceptual and not any(w in q_lower for w in ("our", "my", "this dataset", "in dataset")):
            return "general_inquiry"

        if context_mode == "general":
            return "general_inquiry"

        # 4. Explicit references to dataset, our numbers, or mapped columns
        dataset_indicators = [
            r'\b(?:in\s+this|from\s+this|our|my|the)\s+dataset\b',
            r'\b(?:our|my)\b',
            r'\b(?:revenue|sales|profit|margin|orders|order|units|volume|transactions|turnover)\b',
            r'\btop\s+\d+\b',
            r'\bbest\s+selling\b',
            r'\bbreakdown\b',
            r'\bby\s+(?:category|region|city|state|product|segment|month|quarter|date)\b',
            r'\bhow\s+many\s+rows\b',
            r'\brow\s+count\b',
            r'\banomal(?:y|ies)\b',
            r'\bforecast\b',
            r'\bcompare\s+(?:periods|q[1-4]|months)\b',
        ]
        has_dataset_indicator = any(re.search(p, q_lower) for p in dataset_indicators)

        for col_name in role_to_col.values():
            if col_name and len(col_name) >= 3 and col_name.lower() in q_lower:
                has_dataset_indicator = True
                break

        if has_dataset_indicator:
            return "dataset_grounded"

        if context_mode == "current_dataset":
            return "dataset_grounded"

        # In Auto mode, any other casual, advice, creative, or general knowledge question is general_inquiry
        return "general_inquiry"

    def _generate_general_knowledge_fallback(self, query: str) -> str:
        """Rich business, financial, and analytics knowledge engine fallback when Gemini API key is offline."""
        q_lower = query.lower()

        if any(w in q_lower for w in ("hi", "hello", "hey", "who are you", "what can you do", "introduce yourself", "how are you")):
            return (
                "### 👋 Hello! I'm BizLens AI\n\n"
                "I am your enterprise intelligence advisor and conversational analytics partner powered by **Google Gemini**.\n\n"
                "Here is how I can help you today:\n"
                "- 📊 **Dataset Intelligence**: Run verified DuckDB aggregations over your uploaded data (revenue trends, rankings, margins).\n"
                "- 🔮 **Forecasting & Anomaly Detection**: Forecast upcoming business periods and isolate statistical anomalies with zero false alarms.\n"
                "- 💼 **Financial & Strategy Advisory**: Calculate and explain core business metrics like EBITDA, CAGR, LTV:CAC, and working capital.\n"
                "- 💻 **Code & Data Science**: Write clean Python, SQL, and DuckDB scripts for your analytics pipelines.\n"
                "- 💬 **Casual & General Questions**: Answer open-domain inquiries, brainstorming, and executive strategy questions.\n\n"
                "Feel free to ask any question or ask about your active dataset!"
            )

        if "joke" in q_lower:
            return (
                "### A Little Data & Business Humor 😄\n\n"
                "Why did the data analyst break up with the spreadsheet?\n\n"
                "> *Because they had too many unresolvable circular references, zero emotional integrity, and refused to commit to a primary key!*"
            )

        if "ebitda" in q_lower:
            return (
                "### What is EBITDA?\n\n"
                "**EBITDA** stands for **Earnings Before Interest, Taxes, Depreciation, and Amortization**.\n"
                "It serves as a standardized proxy for core operational cash generation and operating profitability by eliminating distortions caused by capital structures (debt vs. equity), jurisdictional tax rates, and non-cash accounting depreciation schedules.\n\n"
                "#### Core Mathematical Formulas:\n"
                "- **From Operating Income (EBIT)**:\n"
                "  $$\\text{EBITDA} = \\text{Operating Income (EBIT)} + \\text{Depreciation} + \\text{Amortization}$$\n"
                "- **From Net Income**:\n"
                "  $$\\text{EBITDA} = \\text{Net Income} + \\text{Interest} + \\text{Taxes} + \\text{Depreciation} + \\text{Amortization}$$\n\n"
                "#### Strategic Utility in Business Analytics:\n"
                "1. **Operational Benchmarking**: Normalizes performance across companies with differing asset ages and debt loads.\n"
                "2. **Valuation Multiples**: Enterprise Value multiples (e.g. **EV / EBITDA**) are the global private equity and M&A benchmark.\n"
                "3. **Debt Service Capacity**: Ratios like **Net Debt / EBITDA** determine corporate leverage health (typically $< 3.0\\times$ is healthy).\n\n"
                "#### Critical Limitations:\n"
                "- EBITDA does **not** equal free cash flow: it omits required Capital Expenditures (CapEx) to replace worn assets and working capital swings."
            )

        if "cagr" in q_lower:
            return (
                "### Compound Annual Growth Rate (CAGR)\n\n"
                "**CAGR** measures the smoothed annualized rate of return for an investment or revenue stream over multiple periods, assuming compounding.\n\n"
                "#### Mathematical Formula:\n"
                "$$\\text{CAGR} = \\left(\\frac{V_{\\text{final}}}{V_{\\text{initial}}}\\right)^{\\frac{1}{n}} - 1$$\n"
                "Where:\n"
                "- $V_{\\text{final}}$ = Ending value\n"
                "- $V_{\\text{initial}}$ = Beginning value\n"
                "- $n$ = Number of years / periods\n\n"
                "#### Python Implementation:\n"
                "```python\n"
                "def calculate_cagr(start_val: float, end_val: float, periods: float) -> float:\n"
                "    if start_val <= 0 or periods <= 0:\n"
                "        raise ValueError('Start value and periods must be positive.')\n"
                "    return (end_val / start_val) ** (1.0 / periods) - 1.0\n\n"
                "# Example: Revenue grew from 10 Cr to 18 Cr over 3 years\n"
                "growth = calculate_cagr(10.0, 18.0, 3)\n"
                "print(f'3-Year CAGR: {growth * 100:.2f}%')  # 21.64%\n"
                "```"
            )

        if "churn" in q_lower:
            return (
                "### Customer Churn Rate & Retention Analytics\n\n"
                "**Churn Rate** is the percentage of customers or subscribers who cancel or fail to renew their relationship over a given time horizon.\n\n"
                "#### Calculation Formula:\n"
                "$$\\text{Churn Rate} = \\frac{\\text{Customers Lost during Period}}{\\text{Customers at Start of Period}} \\times 100\\%$$\n\n"
                "#### Key Levers to Reduce Churn:\n"
                "1. **Cohort Analysis**: Group users by signup month to pinpoint when drop-offs spike (e.g., Day 30 vs Day 90).\n"
                "2. **Leading Indicators**: Track usage frequency drops, feature disengagement, and unaddressed support tickets before churn occurs.\n"
                "3. **Net Retention Rate (NRR)**: Strive for $> 100\\%$ NRR through expansion revenue (upsells, cross-sells) to outpace logo churn."
            )

        if "ltv" in q_lower or "cac" in q_lower:
            return (
                "### Customer Lifetime Value (LTV) vs Customer Acquisition Cost (CAC)\n\n"
                "The **LTV:CAC ratio** is the cornerstone unit economics metric for modern scalable enterprises.\n\n"
                "#### Core Formulas:\n"
                "- **Customer Lifetime Value (LTV)**:\n"
                "  $$\\text{LTV} = \\frac{\\text{Average Revenue Per User (ARPU)} \\times \\text{Gross Margin (\\%)}}{\\text{Churn Rate}}$$\n"
                "- **Customer Acquisition Cost (CAC)**:\n"
                "  $$\\text{CAC} = \\frac{\\text{Total Sales \\& Marketing Expense}}{\\text{New Customers Acquired}}$$\n\n"
                "#### Benchmark Rules of Thumb:\n"
                "- **$< 1.0\\times$**: Value-destroying operations (spending more to acquire than customer will ever return).\n"
                "- **$3.0\\times$ - $5.0\\times$**: Healthy, sustainable enterprise unit economics.\n"
                "- **$> 5.0\\times$**: Potentially under-investing in growth; market share could be captured faster."
            )

        if any(w in q_lower for w in ("python", "sql", "pandas", "code", "duckdb")):
            return (
                "### Data Engineering & Analytics Code Patterns\n\n"
                "Here are high-performance analytics patterns in Python (DuckDB / Pandas) and SQL:\n\n"
                "#### 1. SQL Rolling 7-Day Window Average:\n"
                "```sql\n"
                "SELECT \n"
                "    order_date,\n"
                "    daily_revenue,\n"
                "    AVG(daily_revenue) OVER (\n"
                "        ORDER BY order_date \n"
                "        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\n"
                "    ) AS rolling_7d_avg_revenue\n"
                "FROM daily_sales_summary\n"
                "ORDER BY order_date;\n"
                "```\n\n"
                "#### 2. Vectorized DuckDB Parquet Analytics (Python):\n"
                "```python\n"
                "import duckdb\n\n"
                "# Execute zero-copy aggregation directly on compressed Parquet\n"
                "con = duckdb.connect()\n"
                "df = con.execute('''\n"
                "    SELECT \n"
                "        category,\n"
                "        SUM(sales_amount) AS total_revenue,\n"
                "        COUNT(order_id) AS total_orders,\n"
                "        ROUND(SUM(profit) / SUM(sales_amount) * 100, 2) AS margin_pct\n"
                "    FROM read_parquet('storage/datasets/*.parquet')\n"
                "    GROUP BY category\n"
                "    ORDER BY total_revenue DESC\n"
                "    LIMIT 10;\n"
                "''').df()\n"
                "print(df)\n"
                "```"
            )

        if any(w in q_lower for w in ("who are you", "what can you do", "introduce", "hello", "hi", "help")):
            return (
                "### Welcome to BizLens Enterprise AI\n\n"
                "I am **BizLens AI**, your dual-engine executive business intelligence and analytics partner.\n\n"
                "#### What I Can Do For You:\n"
                "1. **Current Dataset Analytics (DuckDB Grounded)**:\n"
                "   - Certified calculation of revenue, orders, margins, and units without mathematical hallucinations.\n"
                "   - Multi-dimensional breakdown by product categories, geographic territories, and customer segments.\n"
                "   - Time-series trend analysis, YoY/QoQ comparisons, and isolation of statistical anomalies.\n"
                "2. **Strategic Business Intelligence (Gemini AI)**:\n"
                "   - Corporate finance definitions, unit economics formulas (EBITDA, LTV:CAC, CAGR, Churn).\n"
                "   - Strategic expansion advice, pricing elasticity, and working capital optimization.\n"
                "   - Production-ready Python, DuckDB, and SQL data transformations."
            )

        if "order" in q_lower:
            return (
                "### Total Orders & Transaction Throughput Analysis\n\n"
                "In transactional analytics, **Total Orders** measures operational volume, customer purchasing frequency, and pipeline velocity.\n\n"
                "#### Core Performance Dimensions:\n"
                "1. **Average Order Value (AOV)**: Evaluated as $\\text{AOV} = \\frac{\\text{Total Revenue}}{\\text{Total Orders}}$. Increasing AOV via product bundles and cross-sells directly accelerates bottom-line yield.\n"
                "2. **Repeat Purchase Rate**: Tracking how many orders stem from existing versus new customers highlights customer lifetime retention.\n"
                "3. **Fulfillment & Logistics Velocity**: Order spikes require inventory lead-time alignment to avoid backorders or stockouts.\n\n"
                "Switch to **Current Dataset** or select your dataset in the top bar to inspect certified DuckDB calculations for your exact order volume."
            )

        if "revenue" in q_lower or "sale" in q_lower:
            return (
                "### Revenue & Top-Line Performance Analysis\n\n"
                "**Total Revenue** reflects gross operational demand across product catalogs and customer segments.\n\n"
                "#### Strategic Value Drivers:\n"
                "1. **Volume vs Price Mix**: Decompose revenue growth to see if it stems from selling more units or commanding premium unit prices.\n"
                "2. **Category Concentration**: Identifying leading revenue drivers protects the enterprise from dependency on a single SKU or territory.\n"
                "3. **Gross Margin Realization**: Strong top-line revenue must be backed by healthy gross margins after COGS deductions.\n\n"
                "Select your active dataset to view certified DuckDB calculations for this metric."
            )

        return (
            "### Strategic Business & Financial Advisory\n\n"
            "In modern enterprise intelligence, high-fidelity quantitative metrics guide effective executive decision making.\n\n"
            "#### Core Advisory Principles:\n"
            "1. **Metric Integrity**: Ensure all operational calculations use single-source-of-truth definitions (such as BizLens DuckDB certified pipelines).\n"
            "2. **Margin Protection**: Monitor cost-of-goods-sold (COGS) variance and price elasticity to protect operating margins against macro inflation.\n"
            "3. **Actionable Feedback Loops**: Translate analytical findings into operational playbooks for inventory management, customer acquisition, and risk mitigation."
        )

    def _determine_query_intent(
        self,
        query: str,
        role_to_col: Dict[str, str],
        available_columns: Optional[List[str]] = None,
        col_to_role: Optional[Dict[str, str]] = None,
    ) -> Tuple[str, List[str], Optional[str], Optional[str], str, Optional[int]]:
        """Maps natural language query to a whitelisted operation, metric IDs, group_by dimension, error note, order_direction, and limit."""
        q_lower = query.lower()
        available_columns = available_columns or []
        col_to_role = col_to_role or {}

        # 1. Dataset metadata / describe
        if any(w in q_lower for w in ("row count", "how many rows", "dataset overview", "columns in dataset", "schema")) or ("describe" in q_lower and "dataset" in q_lower):
            return "describe_dataset", ["total_orders"], None, None, "DESC", None

        # 2. Data Quality
        if any(w in q_lower for w in ("data quality", "cleanliness", "missing values", "null values", "duplicates", "anomalies in data")):
            return "data_quality_summary", ["total_orders"], None, None, "DESC", None

        # 3. Filtered subset (check before rankings to catch thresholds like 'sales exceeding 10 lakh')
        filter_spec = parse_nl_filter_spec(query, role_to_col)
        if filter_spec:
            return "filter_preview", ["total_revenue", "total_orders"], None, None, "DESC", None

        # 4. Period Comparison
        if any(w in q_lower for w in ("compare", "vs previous", "quarter over quarter", "qoq", "mom", "yoy", "growth rate", "period comparison")):
            return "compare_periods", ["total_revenue", "gross_profit"], None, None, "DESC", None

        # 5. Trend / Time-series
        if any(w in q_lower for w in ("trend", "progression", "over time", "monthly", "quarterly", "daily", "timeline", "by month", "by quarter", "by year")):
            if "date" not in role_to_col:
                return "trend", [], None, "Time-series trend analysis is unavailable because this dataset has no mapped Date/Timestamp column.", "DESC", None
            return "trend", ["total_revenue"], None, None, "DESC", None

        # Check out-of-scope domain queries (HR, employee satisfaction, stock prices, delivery lead times)
        if any(w in q_lower for w in ("employee satisfaction", "satisfaction rating", "employee", "attrition", "stock price", "nasdaq", "delivery lead time", "supplier lead time")):
            if not any(w in role_to_col for w in ("employee", "satisfaction", "stock", "lead_time")):
                return "breakdown", [], None, "Requested metric or dimension is unavailable in this dataset schema.", "DESC", None

        # -------------------------------------------------------------
        # 6. Specific Single Metric Queries (Without Dimension Breakdown)
        # -------------------------------------------------------------
        # 6.0 Core KPI summary
        if any(w in q_lower for w in ("key performance indicator", "key performance indicators", "kpis", "kpi", "core metrics")):
            return "get_kpis", ["total_revenue", "total_orders", "gross_profit", "gross_margin_pct"], None, None, "DESC", None

        # Dimension checks pre-computation
        is_product = any(w in q_lower for w in ("product", "products", "item", "items", "sku", "skus", "merchandise", "goods", "title", "model", "article"))
        is_customer = any(w in q_lower for w in ("customer", "customers", "client", "clients", "buyer", "buyers", "account", "accounts", "consumer", "consumers"))
        is_category = any(w in q_lower for w in ("category", "categories", "department", "dept", "sub-category", "subcategory", "segment", "division", "vertical"))
        is_region = any(w in q_lower for w in ("region", "regions", "state", "states", "city", "cities", "geography", "location", "territory", "zone", "province", "country")) or any(m in q_lower for m in ("bangalore", "bengaluru", "mumbai", "delhi", "chennai", "kolkata", "hyderabad", "pune", "ahmedabad", "jaipur"))

        has_breakdown_keyword = (
            any(w in q_lower for w in (
                "by ", "breakdown", "per ", "across", "top", "lowest", "least", "bottom", "worst",
                "best", "highest", "most", "rank", "ranking", "leading", "distribution", "vs", "versus"
            ))
            or is_product
            or is_customer
            or is_category
            or is_region
        )

        if not has_breakdown_keyword:
            # 6a. Orders
            if any(w in q_lower for w in ("total order", "total orders", "how many orders", "order count", "order volume", "transactions", "number of orders")):
                metric_ids = ["total_orders"]
                if "revenue" in role_to_col and "id" in role_to_col:
                    metric_ids.append("avg_order_value")
                return "get_kpis", metric_ids, None, None, "DESC", None

            # 6b. Revenue / Sales
            if any(w in q_lower for w in ("revenue", "sales", "gross sales", "turnover", "total gmv", "how much did we make")):
                return "get_kpis", ["total_revenue"], None, None, "DESC", None

            # 6c. Profit / Margin
            if any(w in q_lower for w in ("gross profit", "gross margin", "margin percentage", "profit margin", "profitability", "operating margin")):
                metric_ids = ["gross_profit", "gross_margin_pct"]
                return "get_kpis", metric_ids, None, None, "DESC", None

            # 6d. Units / Quantity
            if any(w in q_lower for w in ("total units", "how many units", "units sold", "total quantity", "sales volume")):
                return "get_kpis", ["total_units"], None, None, "DESC", None

        # -------------------------------------------------------------
        # 7. Entity & Dimension Detection (Rankings & Breakdowns)
        # -------------------------------------------------------------
        # Identify order direction (Lowest vs Highest)
        is_lowest = any(w in q_lower for w in (
            "lowest", "least", "bottom", "worst", "minimum", "min", "underperforming",
            "slowest", "cheapest", "smallest", "tail", "laggard", "poorest", "slow-moving"
        ))
        is_highest = any(w in q_lower for w in (
            "top", "best", "highest", "leading", "most", "maximum", "max",
            "peak", "biggest", "dominant", "greatest", "star", "primary", "fastest"
        ))
        order_dir = "ASC" if is_lowest else "DESC"

        # Identify limit
        limit: Optional[int] = None
        if any(w in q_lower for w in ("only the top", "only the lowest", "the top ", "the lowest ", "top 1", "lowest 1", "single ", "only one", "number one", "#1", "worst 1", "best 1", "tell me only")):
            limit = 1
        elif re.search(r'\btop\s+(\d+)\b', q_lower):
            limit = int(re.search(r'\btop\s+(\d+)\b', q_lower).group(1))
        elif re.search(r'\b(?:lowest|bottom|worst)\s+(\d+)\b', q_lower):
            limit = int(re.search(r'\b(?:lowest|bottom|worst)\s+(\d+)\b', q_lower).group(1))
        elif is_lowest or is_highest:
            if any(w in q_lower for w in ("what is the", "which is the", "who is the", "tell me the", "which product", "what product", "which category", "what category")):
                limit = 1
            else:
                limit = 5

        # Helper to find a matching column in available_columns
        def find_column(candidates: List[str]) -> Optional[str]:
            for cand in candidates:
                for col in available_columns:
                    if col.lower() == cand.lower():
                        return col
            for cand in candidates:
                for col in available_columns:
                    if cand.lower() in col.lower() and not any(col.lower().endswith(s) for s in ("_id", "id", "_key", "key")):
                        return col
            for cand in candidates:
                for col in available_columns:
                    if cand.lower() in col.lower():
                        return col
            return None

        # Dimension checks
        is_product = any(w in q_lower for w in ("product", "products", "item", "items", "sku", "skus", "merchandise", "goods", "title", "model", "article"))
        is_customer = any(w in q_lower for w in ("customer", "customers", "client", "clients", "buyer", "buyers", "account", "accounts", "consumer", "consumers"))
        is_category = any(w in q_lower for w in ("category", "categories", "department", "dept", "sub-category", "subcategory", "segment", "division", "vertical"))
        is_region = any(w in q_lower for w in ("region", "regions", "state", "states", "city", "cities", "geography", "location", "territory", "zone", "province", "country")) or any(m in q_lower for m in ("bangalore", "bengaluru", "mumbai", "delhi", "chennai", "kolkata", "hyderabad", "pune", "ahmedabad", "jaipur"))

        target_dim: Optional[str] = None
        unavailable_note: Optional[str] = None

        if is_product:
            target_dim = role_to_col.get("product") or find_column(["product_name", "productname", "product_description", "item_name", "item", "product", "sku", "title", "model"])
            if not target_dim:
                unavailable_note = "Product-level breakdown is unavailable because this dataset has no mapped Product column."
        elif is_customer:
            target_dim = role_to_col.get("customer") or find_column(["customer_name", "customername", "client_name", "buyer", "customer", "client", "account_name"])
            if not target_dim:
                unavailable_note = "Customer ranking is unavailable because this dataset has no mapped Customer column."
        elif is_region:
            if "state" in q_lower:
                target_dim = find_column(["state", "province"]) or role_to_col.get("region")
            elif "city" in q_lower:
                target_dim = find_column(["city"]) or role_to_col.get("region")
            else:
                target_dim = role_to_col.get("region") or find_column(["region", "state", "city", "zone", "territory", "country", "location"])
            if not target_dim:
                unavailable_note = "Geographic breakdown is unavailable because this dataset has no mapped Geographic/Region column."
        elif is_category:
            target_dim = role_to_col.get("category") or find_column(["category", "product_category", "productcategory", "department", "dept", "sub_category", "subcategory", "segment", "division"])
            if not target_dim:
                unavailable_note = "Category breakdown is unavailable because this dataset has no mapped Category column."
        else:
            # Check literal column names that are categorical/dimensional (skip pure numeric metrics, IDs, and dates)
            for col in available_columns:
                c_role = col_to_role.get(col, "")
                if c_role in ("revenue", "cost", "margin", "quantity", "discount", "id", "date"):
                    continue
                c_clean = col.lower().replace("_", " ").strip()
                if len(c_clean) >= 3 and (col.lower() in q_lower or c_clean in q_lower):
                    target_dim = col
                    break

        if unavailable_note:
            return "breakdown", [], None, unavailable_note, order_dir, limit

        if target_dim:
            if any(w in q_lower for w in ("profit", "margin", "profitable", "profitability")):
                metric_ids = ["gross_profit", "gross_margin_pct", "total_revenue"]
            elif any(w in q_lower for w in ("unit", "units", "quantity", "volume", "sold")):
                metric_ids = ["total_revenue", "total_units"]
            elif any(w in q_lower for w in ("order", "orders", "transactions", "count")):
                metric_ids = ["total_revenue", "total_orders"]
            else:
                metric_ids = ["total_revenue"]
                if "quantity" in role_to_col:
                    metric_ids.append("total_units")
                if "id" in role_to_col:
                    metric_ids.append("total_orders")

            if is_region and not (is_lowest or is_highest or limit is not None):
                op = "geo_breakdown"
            else:
                op = "top_n" if (is_lowest or is_highest or limit is not None) else "breakdown"
            return op, metric_ids, target_dim, None, order_dir, limit


        # -------------------------------------------------------------
        # 8. Outliers / Anomalies
        # -------------------------------------------------------------
        if any(w in q_lower for w in ("anomal", "outlier", "spike", "unusual", "irregular", "deviation")):
            dim = role_to_col.get("category") or role_to_col.get("region") or find_column(["category", "region", "state"])
            metric_ids = ["total_revenue", "total_orders"] if "revenue" in role_to_col else ["total_orders"]
            return "breakdown" if dim else "get_kpis", metric_ids, dim, None, "DESC", None

        # -------------------------------------------------------------
        # 9. Executive Summary / Overview
        # -------------------------------------------------------------
        if any(w in q_lower for w in ("executive summary", "overview", "summarize", "summary of this", "high level", "how are we doing", "general performance", "overall health")):
            metric_ids = ["total_revenue", "total_orders", "gross_profit", "gross_margin_pct"]
            if "quantity" in role_to_col:
                metric_ids.extend(["total_units", "units_per_order"])
            if "revenue" in role_to_col and "id" in role_to_col:
                metric_ids.append("avg_order_value")
            dim = role_to_col.get("category") or role_to_col.get("region")
            return "breakdown" if dim else "get_kpis", metric_ids, dim, None, "DESC", 5

        # -------------------------------------------------------------
        # 10. Default Fallback
        # -------------------------------------------------------------
        if "revenue" in q_lower or "sale" in q_lower:
            return "get_kpis", ["total_revenue"], None, None, "DESC", None
        if "order" in q_lower:
            return "get_kpis", ["total_orders"], None, None, "DESC", None

        metric_ids = ["total_revenue", "total_orders", "gross_profit", "gross_margin_pct"]
        if "quantity" in role_to_col:
            metric_ids.extend(["total_units", "units_per_order"])
        if "revenue" in role_to_col and "id" in role_to_col:
            metric_ids.append("avg_order_value")
        group_by = role_to_col.get("category")
        return "get_kpis", metric_ids, group_by, None, "DESC", None

    def _generate_deterministic_fallback_blocks(
        self,
        query_res: Optional[AnalyticsQueryResult],
        group_by_role: Optional[str],
        unavailable_note: Optional[str] = None,
        order_direction: str = "DESC",
    ) -> List[ChatMessageBlock]:
        """Synthesizes high-fidelity, strictly fact-grounded blocks when Gemini is offline or guardrail fails."""
        blocks: List[ChatMessageBlock] = []

        if unavailable_note:
            blocks.append(
                ChatMessageBlock(
                    tag="NOTICE",
                    content=f"**Analysis Unavailable**: {unavailable_note}",
                    fact_ids=[],
                )
            )
            blocks.append(
                ChatMessageBlock(
                    tag="RECOMMENDATION",
                    content="Consider updating the semantic column mapping in the Data Management workspace to map the required column role.",
                    fact_ids=[],
                )
            )
            return blocks

        if not query_res:
            return blocks

        rev = query_res.metrics.get("total_revenue")
        profit = query_res.metrics.get("gross_profit")
        margin = query_res.metrics.get("gross_margin_pct")
        orders = query_res.metrics.get("total_orders")

        fact_ids: List[str] = []
        fact_lines: List[str] = []

        if rev and rev.is_available:
            fact_ids.append("total_revenue")
            fact_lines.append(f"• Total Revenue: **{rev.formatted_value}** (vs. previous period: {rev.delta_pct:+.1f}%)" if rev.delta_pct is not None else f"• Total Revenue: **{rev.formatted_value}**")

        if orders and orders.is_available:
            fact_ids.append("total_orders")
            fact_lines.append(f"• Total Orders: **{orders.formatted_value}** transactions recorded")

        if profit and profit.is_available:
            fact_ids.append("gross_profit")
            fact_lines.append(f"• Gross Profit: **{profit.formatted_value}**")

        if margin and margin.is_available:
            fact_ids.append("gross_margin_pct")
            fact_lines.append(f"• Gross Margin: **{margin.formatted_value}**")

        if query_res.breakdown:
            top_b = query_res.breakdown[0]
            prefix = "Lowest Performing Segment" if order_direction == "ASC" else "Leading Segment"
            fact_lines.append(f"• {prefix} (#{top_b.rank} {top_b.dimension_value}): {top_b.share_pct}% share of total volume")

        blocks.append(
            ChatMessageBlock(
                tag="CALCULATED FACT",
                content="Here are the verified calculation results computed directly by the DuckDB engine:\n\n" + "\n".join(fact_lines),
                fact_ids=fact_ids,
                lineage_ref=f"duckdb_scan_{query_res.lineage.content_hash[:8]}" if query_res.lineage else None,
            )
        )

        # Interpretation Block
        interp_lines = []
        if rev and rev.value and margin and margin.value:
            if margin.value >= 35.0:
                interp_lines.append(f"Overall operating profitability is robust at a **{margin.formatted_value}** gross margin on **{rev.formatted_value}** in recorded sales [FACT: total_revenue, gross_margin_pct].")
            else:
                interp_lines.append(f"Operations realized **{rev.formatted_value}** in revenue with a balanced gross margin of **{margin.formatted_value}** [FACT: total_revenue, gross_margin_pct].")

        if query_res.breakdown and len(query_res.breakdown) >= 1:
            top_b = query_res.breakdown[0]
            if order_direction == "ASC":
                interp_lines.append(f"Sales throughput is constrained by **{top_b.dimension_value}**, which registers the lowest contribution at {top_b.share_pct}% share.")
            elif len(query_res.breakdown) >= 2:
                b2 = query_res.breakdown[1]
                interp_lines.append(f"Demand is led by **{top_b.dimension_value}** ({top_b.share_pct}% share), followed by **{b2.dimension_value}** ({b2.share_pct}% share).")

        blocks.append(
            ChatMessageBlock(
                tag="INTERPRETATION",
                content=" ".join(interp_lines) if interp_lines else "The dataset displays consistent transactional throughput across the verified reporting period.",
                fact_ids=fact_ids,
            )
        )

        # Recommendation Block
        recomms = []
        if query_res.breakdown:
            top_dim = query_res.breakdown[0].dimension_value
            if order_direction == "ASC":
                recomms.append(f"Consider targeted clearance promotions, revised bundling, or promotional pricing for **{top_dim}** to stimulate lagging sales velocity.")
            else:
                recomms.append(f"Consider prioritizing inventory buffer and supply-chain lead times for **{top_dim}**, which currently anchors the portfolio.")
        if margin and margin.value and margin.value < 40.0:
            recomms.append("Worth investigating selective price elasticity tests or procurement volume discounts to improve baseline gross margins.")
        else:
            recomms.append("May explore cross-promotional bundling across complementary segments to increase average order realization.")

        blocks.append(
            ChatMessageBlock(
                tag="RECOMMENDATION",
                content="Based on the certified metrics:\n" + "\n".join(f"• {r}" for r in recomms),
                fact_ids=fact_ids,
            )
        )

        blocks.append(
            ChatMessageBlock(
                tag="NOTICE",
                content="Operating in **Deterministic Local Analysis Mode** (all figures certified in DuckDB Snappy Parquet storage).",
                fact_ids=[],
            )
        )

        return blocks


    def _parse_ai_tagged_blocks(self, raw_text: str, fact_ids: List[str]) -> List[ChatMessageBlock]:
        """Parses output text containing tagged blocks [CALCULATED FACT], [INTERPRETATION], [RECOMMENDATION]."""
        tag_pattern = re.compile(
            r'\[(CALCULATED FACT|INTERPRETATION|RECOMMENDATION|NOTICE)\]\s*(.*?)(?=\[(?:CALCULATED FACT|INTERPRETATION|RECOMMENDATION|NOTICE)\]|\Z)',
            re.DOTALL | re.IGNORECASE,
        )
        matches = list(tag_pattern.finditer(raw_text))

        if not matches:
            return [
                ChatMessageBlock(
                    tag="INTERPRETATION",
                    content=raw_text.strip(),
                    fact_ids=fact_ids,
                )
            ]

        blocks: List[ChatMessageBlock] = []
        for m in matches:
            tag_name = m.group(1).upper()
            content = m.group(2).strip()
            blocks.append(
                ChatMessageBlock(
                    tag=tag_name,
                    content=content,
                    fact_ids=fact_ids if tag_name in ("CALCULATED FACT", "INTERPRETATION") else [],
                )
            )

        return blocks

    def ask(
        self,
        query: str,
        parquet_path: Optional[Path],
        role_to_col: Dict[str, str],
        dataset_id: str = "",
        version_number: int = 1,
        content_hash: str = "",
        context_mode: str = "current_dataset",
        history: Optional[List[Dict[str, str]]] = None,
        api_key: Optional[str] = None,
        available_columns: Optional[List[str]] = None,
        col_to_role: Optional[Dict[str, str]] = None,
        dataset_name: Optional[str] = None,
    ) -> Tuple[List[ChatMessageBlock], ShowYourWorkMetadata]:
        """Synchronously processes query with deterministic fact pre-computation, AI synthesis, and guardrails."""
        # 1. PII Scan
        pii_detected, pii_warning = detect_pii(query)

        # 2. Intent Classification (General Inquiry vs Dataset Grounded)
        intent = self.classify_intent(query, role_to_col, context_mode)
        if intent == "general_inquiry" or not parquet_path or not parquet_path.exists():
            safe_query = sanitize_untrusted_input(query)
            ai_text = gemini_client.generate_general_response(
                safe_query,
                history=history,
                api_key=api_key,
            )
            model_used = gemini_client.model_name

            if not ai_text:
                ai_text = self._generate_general_knowledge_fallback(query)
                model_used = "BizLens Strategic Engine"

            blocks = self._parse_ai_tagged_blocks(ai_text, fact_ids=[])
            metadata = ShowYourWorkMetadata(
                fact_set=[],
                engine_query_ms=0.0,
                guardrail_result={"passed": True, "total_extracted": 0, "violations": []},
                model_used=model_used,
                context_mode="general",
                pii_detected=pii_detected,
                pii_warning=pii_warning,
            )
            return blocks, metadata

        # 3. Query Intent & Whitelist Operation
        operation, metric_ids, group_by_role, unavailable_note, order_direction, limit = self._determine_query_intent(
            query,
            role_to_col,
            available_columns=available_columns,
            col_to_role=col_to_role,
        )

        if unavailable_note:
            blocks = self._generate_deterministic_fallback_blocks(None, None, unavailable_note=unavailable_note)
            metadata = ShowYourWorkMetadata(
                fact_set=[],
                engine_query_ms=0.0,
                guardrail_result={"passed": True, "total_extracted": 0, "violations": []},
                model_used="Deterministic Engine",
                context_mode="current_dataset",
                pii_detected=pii_detected,
                pii_warning=pii_warning,
            )
            return blocks, metadata

        # 4. Deterministic Pre-Computation in DuckDB
        engine_start = time.perf_counter()
        query_res = analytics_engine.execute_query(
            parquet_path=parquet_path,
            role_to_col=role_to_col,
            metric_ids=metric_ids,
            group_by_role=group_by_role,
            compare_to_previous=True,
            dataset_id=dataset_id,
            version_number=version_number,
            content_hash=content_hash,
            order_direction=order_direction,
            limit=limit,
        )
        engine_ms = round((time.perf_counter() - engine_start) * 1000, 2)

        # Build Fact Set & Fact Values list
        fact_set: List[Dict[str, Any]] = []
        fact_values: List[float] = []

        is_ranking_query = bool(group_by_role and query_res.breakdown and (
            order_direction == "ASC" or limit is not None or operation == "top_n"
            or any(w in query.lower() for w in ("lowest", "least", "bottom", "worst", "top", "best", "highest", "most", "rank"))
        ))

        if is_ranking_query:
            # 1. Primary facts: each ranked breakdown item
            for b in query_res.breakdown:
                fact_values.append(b.share_pct)
                for num_str in re.findall(r'\b\d+(?:\.\d+)?\b', str(b.dimension_value)):
                    try:
                        fact_values.append(float(num_str))
                    except ValueError:
                        pass
                rank_prefix = f"#{b.rank} (Lowest)" if order_direction == "ASC" else f"#{b.rank}"
                metric_parts = []
                for m_id, v in b.metrics.items():
                    fact_values.append(v)
                    if v >= 100_000:
                        fact_values.extend([round(v / 100_000.0, 2), round(v / 10_000_000.0, 2)])
                    m_def = metric_registry.get_metric(m_id)
                    fmt = format_metric_value(v, m_def.unit if m_def else "currency", m_def.format_str if m_def else "₹#,##0.00")
                    for num_str in re.findall(r'\b\d+(?:\.\d+)?\b', fmt):
                        try:
                            fact_values.append(float(num_str))
                        except ValueError:
                            pass
                    lbl = m_def.label if m_def else m_id
                    metric_parts.append(f"{lbl}: {fmt}")

                metric_parts.append(f"{b.share_pct:.2f}% share of revenue")
                fact_set.append({
                    "id": f"item_{b.rank}_{re.sub(r'[^a-zA-Z0-9_]', '_', b.dimension_value)}",
                    "label": f"{rank_prefix} {b.dimension_value}",
                    "entity_name": b.dimension_value,
                    "rank": b.rank,
                    "metrics_summary": ", ".join(metric_parts),
                    "formatted_value": ", ".join(metric_parts),
                    "share_of_revenue": f"{b.share_pct:.2f}%",
                })

            # Add catalog total revenue for context ONLY (not the full KPI card)
            if "total_revenue" in query_res.metrics and query_res.metrics["total_revenue"].is_available:
                tot_rev = query_res.metrics["total_revenue"]
                fact_values.append(tot_rev.value)
                if tot_rev.value >= 100_000:
                    fact_values.extend([round(tot_rev.value / 100_000.0, 2), round(tot_rev.value / 10_000_000.0, 2)])
                fact_set.append({
                    "id": "catalog_total_revenue",
                    "label": "Catalog Total Revenue",
                    "formatted_value": tot_rev.formatted_value,
                    "unit": tot_rev.unit,
                })
        else:
            for m_id, m_res in query_res.metrics.items():
                if m_res.is_available and m_res.value is not None:
                    fact_set.append({
                        "id": m_id,
                        "label": m_res.label,
                        "value": m_res.value,
                        "formatted_value": m_res.formatted_value,
                        "unit": m_res.unit,
                        "delta_pct": m_res.delta_pct,
                        "formula_sql": m_res.formula_sql,
                    })
                    fact_values.append(m_res.value)
                    if m_res.value >= 100_000:
                        fact_values.extend([round(m_res.value / 100_000.0, 2), round(m_res.value / 10_000_000.0, 2)])
                    if m_res.delta_pct is not None:
                        fact_values.append(m_res.delta_pct)

            if query_res.breakdown:
                for b in query_res.breakdown:
                    fact_values.append(b.share_pct)
                    metric_parts = []
                    for m_id, v in b.metrics.items():
                        fact_values.append(v)
                        if v >= 100_000:
                            fact_values.extend([round(v / 100_000.0, 2), round(v / 10_000_000.0, 2)])
                        m_def = metric_registry.get_metric(m_id)
                        fmt = format_metric_value(v, m_def.unit if m_def else "currency", m_def.format_str if m_def else "₹#,##0.00")
                        for num_str in re.findall(r'\b\d+(?:\.\d+)?\b', fmt):
                            try:
                                fact_values.append(float(num_str))
                            except ValueError:
                                pass
                        metric_parts.append(f"{m_def.label if m_def else m_id}: {fmt}")

                    metric_parts.append(f"{b.share_pct:.2f}% share")
                    fact_set.append({
                        "id": f"breakdown_{b.rank}_{re.sub(r'[^a-zA-Z0-9_]', '_', b.dimension_value)}",
                        "label": f"#{b.rank} {b.dimension_value}",
                        "formatted_value": ", ".join(metric_parts),
                        "unit": "percentage",
                    })

        fact_ids = [f["id"] for f in fact_set]

        # 5. AI Synthesis or Fallback
        model_name = gemini_client.model_name
        ai_generated_text: Optional[str] = None

        if gemini_client.is_available:
            system_prompt, _ = gemini_client.prompt_registry.get_prompt("explain_facts")
            safe_query = sanitize_untrusted_input(query)

            history_prefix = ""
            if history and len(history) > 0:
                h_lines = [f"{('User' if t.get('role') == 'user' else 'BizLens AI')}: {t.get('content', '')}" for t in history[-4:]]
                if h_lines:
                    history_prefix = "=== CONVERSATION HISTORY ===\n" + "\n".join(h_lines) + "\n\n"

            user_prompt = (
                f"{history_prefix}USER QUESTION: {safe_query}\n"
                f"TARGET DATASET: {dataset_name or 'Active Dataset'}\n\n"
                f"=== CERTIFIED FACTS FROM DUCKDB ===\n{json.dumps(fact_set, indent=2)}\n=== END CERTIFIED FACTS ===\n\n"
                f"STRICT INSTRUCTIONS:\n"
                f"1. Directly and conversationally answer the user's specific inquiry: '{safe_query}'.\n"
                f"2. In [CALCULATED FACT], state ONLY the verified figures that directly answer the inquiry. ALWAYS use the human-readable formatted_value (e.g. '₹8.63 L', '1,290 units', '619 orders', '44.58% share') with [FACT: <fact_id>] citations.\n"
                f"3. In [INTERPRETATION], provide executive business analysis of WHY these specific figures occurred and what they mean for the business. Cite relevant fact IDs.\n"
                f"4. In [RECOMMENDATION], provide 3 concrete, strategic business recommendations targeting this exact subject (e.g. inventory clearance, product bundling, promotional repricing, or supply chain buffer).\n"
                f"5. DO NOT provide a generic summary of the entire catalog or list unrequested metrics when a specific entity, ranking, or metric is queried."
            )
            ai_generated_text = gemini_client.generate_explanation(
                system_instruction=system_prompt,
                user_prompt=user_prompt,
                facts=fact_set,
                prompt_name="explain_facts",
                api_key=api_key,
            )

        if not ai_generated_text:
            blocks = self._generate_deterministic_fallback_blocks(query_res, group_by_role, order_direction=order_direction)
            full_text = " ".join(b.content for b in blocks)
            guardrail_res = guardrail.verify_response(full_text, fact_values=fact_values)
            metadata = ShowYourWorkMetadata(
                fact_set=fact_set,
                engine_query_ms=engine_ms,
                guardrail_result={
                    "passed": guardrail_res.passed,
                    "total_extracted": guardrail_res.total_extracted,
                    "violations": [v.raw_token for v in guardrail_res.violations],
                },
                model_used="Deterministic Local Engine",
                context_mode="current_dataset",
                pii_detected=pii_detected,
                pii_warning=pii_warning,
            )
            return blocks, metadata

        # 6. Run Numerical Guardrail on AI generated text
        guardrail_res = guardrail.verify_response(ai_generated_text, fact_values=fact_values)

        if not guardrail_res.passed:
            # Stricter retry prompt
            retry_prompt_template, _ = gemini_client.prompt_registry.get_prompt("stricter_retry")
            violations_str = ", ".join([v.raw_token for v in guardrail_res.violations])
            stricter_instruction = retry_prompt_template.format(
                violations=violations_str,
                allowed_fact_values=fact_values,
            )
            retry_text = gemini_client.generate_explanation(
                system_instruction=stricter_instruction,
                user_prompt=user_prompt,
            )
            if retry_text:
                guardrail_res = guardrail.verify_response(retry_text, fact_values=fact_values)
                if guardrail_res.passed:
                    ai_generated_text = retry_text

        if not guardrail_res.passed:
            logger.warning("AI output failed guardrail twice. Falling back to certified facts-only.")
            blocks = self._generate_deterministic_fallback_blocks(query_res, group_by_role, order_direction=order_direction)
            blocks.append(
                ChatMessageBlock(
                    tag="NOTICE",
                    content="AI explanation unavailable for this result due to numerical guardrail policy.",
                    fact_ids=[],
                )
            )
            model_name = "Deterministic Fallback (Guardrail Triggered)"
        else:
            blocks = self._parse_ai_tagged_blocks(ai_generated_text, fact_ids=fact_ids)

        metadata = ShowYourWorkMetadata(
            fact_set=fact_set,
            engine_query_ms=engine_ms,
            guardrail_result={
                "passed": guardrail_res.passed,
                "total_extracted": guardrail_res.total_extracted,
                "violations": [v.raw_token for v in guardrail_res.violations],
            },
            model_used=model_name,
            context_mode="current_dataset",
            pii_detected=pii_detected,
            pii_warning=pii_warning,
        )

        return blocks, metadata

    def ask_stream(
        self,
        query: str,
        parquet_path: Optional[Path],
        role_to_col: Dict[str, str],
        dataset_id: str = "",
        version_number: int = 1,
        content_hash: str = "",
        context_mode: str = "current_dataset",
        history: Optional[List[Dict[str, str]]] = None,
        api_key: Optional[str] = None,
        available_columns: Optional[List[str]] = None,
        col_to_role: Optional[Dict[str, str]] = None,
        dataset_name: Optional[str] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        """Generator yielding Server-Sent Events (SSE) status steps and completed response."""
        intent = self.classify_intent(query, role_to_col, context_mode)

        if intent == "general_inquiry" or not parquet_path or not parquet_path.exists():
            # Step 1: Analyzing
            yield {
                "event": "status",
                "data": {
                    "step": "analyzing",
                    "label": "Analyzing query & conversational intent...",
                    "progress": 30,
                },
            }

            # Step 2: Reasoning
            yield {
                "event": "status",
                "data": {
                    "step": "reasoning",
                    "label": "Activating Google Gemini Intelligence...",
                    "progress": 65,
                },
            }

            blocks, metadata = self.ask(
                query=query,
                parquet_path=parquet_path,
                role_to_col=role_to_col,
                dataset_id=dataset_id,
                version_number=version_number,
                content_hash=content_hash,
                context_mode=context_mode,
                history=history,
                api_key=api_key,
                available_columns=available_columns,
                col_to_role=col_to_role,
                dataset_name=dataset_name,
            )

            # Step 3: Formatting
            yield {
                "event": "status",
                "data": {
                    "step": "formatting",
                    "label": "Formatting executive narrative and formulas...",
                    "progress": 95,
                },
            }
        else:
            # Step 1: Analyzing
            yield {
                "event": "status",
                "data": {
                    "step": "analyzing",
                    "label": "Analyzing query and mapping semantic roles...",
                    "progress": 25,
                },
            }

            # Step 2: Computing
            yield {
                "event": "status",
                "data": {
                    "step": "computing",
                    "label": "Computing deterministic facts in DuckDB engine...",
                    "progress": 50,
                },
            }

            blocks, metadata = self.ask(
                query=query,
                parquet_path=parquet_path,
                role_to_col=role_to_col,
                dataset_id=dataset_id,
                version_number=version_number,
                content_hash=content_hash,
                context_mode=context_mode,
                history=history,
                api_key=api_key,
                available_columns=available_columns,
                col_to_role=col_to_role,
                dataset_name=dataset_name,
            )


            # Step 3: Explaining
            yield {
                "event": "status",
                "data": {
                    "step": "explaining",
                    "label": "Synthesizing executive narrative with tagged blocks...",
                    "progress": 75,
                },
            }

            # Step 4: Verifying
            yield {
                "event": "status",
                "data": {
                    "step": "verifying",
                    "label": "Auditing numbers with post-generation guardrail...",
                    "progress": 95,
                },
            }

        # Emit Metadata
        yield {
            "event": "metadata",
            "data": metadata.model_dump() if hasattr(metadata, "model_dump") else metadata.dict(),
        }

        # Emit Blocks
        yield {
            "event": "blocks",
            "data": [b.model_dump() if hasattr(b, "model_dump") else b.dict() for b in blocks],
        }

        # Step 5: Done
        yield {
            "event": "done",
            "data": {
                "success": True,
                "status": "complete",
            },
        }


ai_orchestrator = AIOrchestrator()
