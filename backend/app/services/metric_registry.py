"""BizLens Metric Registry: Immutable metric definitions, required semantic roles, formulas, and availability checking."""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass(frozen=True)
class MetricDefinition:
    id: str
    label: str
    description: str
    required_roles: List[str]
    optional_roles: List[str] = field(default_factory=list)
    unit: str = "currency"  # currency, percentage, count, ratio
    format_str: str = "currency"  # currency, percentage, integer, float
    direction: str = "higher_is_better"  # higher_is_better, lower_is_better, neutral
    formula_sql: str = ""
    is_derived: bool = False
    requires_date: bool = False
    registry_version: str = "v1.0"


# Built-in Immutable Metric Catalog (RULES.md & Master Prompt)
BUILTIN_METRICS: Dict[str, MetricDefinition] = {
    "total_revenue": MetricDefinition(
        id="total_revenue",
        label="Total Revenue",
        description="Gross or net sales generated across all recorded transactions.",
        required_roles=["revenue"],
        unit="currency",
        format_str="currency",
        direction="higher_is_better",
        formula_sql="SUM({revenue})",
        is_derived=False,
    ),
    "total_cost": MetricDefinition(
        id="total_cost",
        label="Total Cost (COGS)",
        description="Total cost of goods sold or procurement expenditure.",
        required_roles=["cost"],
        unit="currency",
        format_str="currency",
        direction="lower_is_better",
        formula_sql="SUM({cost})",
        is_derived=False,
    ),
    "gross_profit": MetricDefinition(
        id="gross_profit",
        label="Gross Profit",
        description="Absolute profit calculated as total revenue minus total cost.",
        required_roles=["revenue", "cost"],
        unit="currency",
        format_str="currency",
        direction="higher_is_better",
        formula_sql="SUM({revenue}) - SUM({cost})",
        is_derived=True,
    ),
    "gross_margin_pct": MetricDefinition(
        id="gross_margin_pct",
        label="Gross Margin %",
        description="Profitability ratio calculated as gross profit divided by total revenue.",
        required_roles=["revenue", "cost"],
        unit="percentage",
        format_str="percentage",
        direction="higher_is_better",
        formula_sql="ROUND((SUM({revenue}) - SUM({cost})) / NULLIF(SUM({revenue}), 0) * 100, 2)",
        is_derived=True,
    ),
    "total_orders": MetricDefinition(
        id="total_orders",
        label="Total Orders",
        description="Total count of unique transactions or orders.",
        required_roles=["id"],
        unit="count",
        format_str="integer",
        direction="higher_is_better",
        formula_sql="COUNT(DISTINCT {id})",
        is_derived=False,
    ),
    "total_units": MetricDefinition(
        id="total_units",
        label="Total Units Sold",
        description="Aggregated volume of physical or licensed units sold.",
        required_roles=["quantity"],
        unit="count",
        format_str="integer",
        direction="higher_is_better",
        formula_sql="SUM({quantity})",
        is_derived=False,
    ),
    "avg_order_value": MetricDefinition(
        id="avg_order_value",
        label="Average Order Value (AOV)",
        description="Average monetary value per transaction.",
        required_roles=["revenue", "id"],
        unit="currency",
        format_str="currency",
        direction="higher_is_better",
        formula_sql="ROUND(SUM({revenue}) / NULLIF(COUNT(DISTINCT {id}), 0), 2)",
        is_derived=True,
    ),
    "units_per_order": MetricDefinition(
        id="units_per_order",
        label="Units per Order",
        description="Average volume of items or units per order.",
        required_roles=["quantity", "id"],
        unit="ratio",
        format_str="float",
        direction="higher_is_better",
        formula_sql="ROUND(SUM({quantity}) / NULLIF(COUNT(DISTINCT {id}), 0), 2)",
        is_derived=True,
    ),
    "avg_unit_price": MetricDefinition(
        id="avg_unit_price",
        label="Average Selling Price (ASP)",
        description="Average realized revenue per unit sold.",
        required_roles=["revenue", "quantity"],
        unit="currency",
        format_str="currency",
        direction="higher_is_better",
        formula_sql="ROUND(SUM({revenue}) / NULLIF(SUM({quantity}), 0), 2)",
        is_derived=True,
    ),
    "avg_unit_cost": MetricDefinition(
        id="avg_unit_cost",
        label="Average Unit Cost",
        description="Average procurement or landed cost per unit sold.",
        required_roles=["cost", "quantity"],
        unit="currency",
        format_str="currency",
        direction="lower_is_better",
        formula_sql="ROUND(SUM({cost}) / NULLIF(SUM({quantity}), 0), 2)",
        is_derived=True,
    ),
    "avg_discount_pct": MetricDefinition(
        id="avg_discount_pct",
        label="Average Discount Rate",
        description="Mean promotional or scheme discount applied across orders.",
        required_roles=["discount"],
        unit="percentage",
        format_str="percentage",
        direction="neutral",
        formula_sql="ROUND(AVG({discount}) * 100, 2)",
        is_derived=False,
    ),
    "revenue_mom_growth": MetricDefinition(
        id="revenue_mom_growth",
        label="Revenue MoM Growth",
        description="Month-over-month percentage change in total revenue.",
        required_roles=["revenue", "date"],
        unit="percentage",
        format_str="percentage",
        direction="higher_is_better",
        formula_sql="(current - previous) / previous * 100",
        is_derived=True,
        requires_date=True,
    ),
}


@dataclass
class MetricAvailability:
    metric_id: str
    label: str
    is_available: bool
    missing_roles: List[str]
    resolved_columns: Dict[str, str]
    reason: Optional[str] = None


class MetricRegistry:
    def __init__(self, metrics: Optional[Dict[str, MetricDefinition]] = None):
        self._metrics = metrics or BUILTIN_METRICS

    def get_metric(self, metric_id: str) -> Optional[MetricDefinition]:
        return self._metrics.get(metric_id)

    def list_all_metrics(self) -> List[MetricDefinition]:
        return list(self._metrics.values())

    def check_availability(
        self, role_to_column_map: Dict[str, str]
    ) -> Dict[str, MetricAvailability]:
        """Checks which metrics can be computed with the given mapped roles."""
        result: Dict[str, MetricAvailability] = {}

        for m_id, metric in self._metrics.items():
            missing: List[str] = []
            resolved: Dict[str, str] = {}

            if m_id == "gross_profit":
                if "profit" in role_to_column_map and role_to_column_map["profit"]:
                    resolved["profit"] = role_to_column_map["profit"]
                    is_avail = True
                elif ("revenue" in role_to_column_map and role_to_column_map["revenue"] and
                      "cost" in role_to_column_map and role_to_column_map["cost"]):
                    resolved["revenue"] = role_to_column_map["revenue"]
                    resolved["cost"] = role_to_column_map["cost"]
                    is_avail = True
                elif ("revenue" in role_to_column_map and role_to_column_map["revenue"] and
                      "margin" in role_to_column_map and role_to_column_map["margin"]):
                    resolved["revenue"] = role_to_column_map["revenue"]
                    resolved["margin"] = role_to_column_map["margin"]
                    is_avail = True
                else:
                    if "revenue" not in role_to_column_map and "profit" not in role_to_column_map:
                        missing.append("revenue")
                    if "cost" not in role_to_column_map and "profit" not in role_to_column_map:
                        missing.append("cost")
                    is_avail = False

                result[m_id] = MetricAvailability(
                    metric_id=m_id,
                    label=metric.label,
                    is_available=is_avail,
                    missing_roles=missing,
                    resolved_columns=resolved,
                    reason=f"Missing required semantic roles: {', '.join(missing)}" if not is_avail else None,
                )
                continue

            if m_id == "gross_margin_pct":
                if ("profit" in role_to_column_map and "revenue" in role_to_column_map) or \
                   ("cost" in role_to_column_map and "revenue" in role_to_column_map) or \
                   ("margin" in role_to_column_map):
                    is_avail = True
                else:
                    if "revenue" not in role_to_column_map:
                        missing.append("revenue")
                    if "cost" not in role_to_column_map and "profit" not in role_to_column_map and "margin" not in role_to_column_map:
                        missing.append("cost")
                    is_avail = False

                result[m_id] = MetricAvailability(
                    metric_id=m_id,
                    label=metric.label,
                    is_available=is_avail,
                    missing_roles=missing,
                    resolved_columns=resolved,
                    reason=f"Missing required semantic roles: {', '.join(missing)}" if not is_avail else None,
                )
                continue

            if m_id == "total_orders":
                if "id" in role_to_column_map and role_to_column_map["id"]:
                    resolved["id"] = role_to_column_map["id"]
                result[m_id] = MetricAvailability(
                    metric_id=m_id,
                    label=metric.label,
                    is_available=True,
                    missing_roles=[],
                    resolved_columns=resolved,
                    reason=None,
                )
                continue

            for role in metric.required_roles:
                if role in role_to_column_map and role_to_column_map[role]:
                    resolved[role] = role_to_column_map[role]
                else:
                    missing.append(role)

            is_avail = len(missing) == 0
            reason = (
                f"Missing required semantic roles: {', '.join(missing)}"
                if not is_avail
                else None
            )

            result[m_id] = MetricAvailability(
                metric_id=m_id,
                label=metric.label,
                is_available=is_avail,
                missing_roles=missing,
                resolved_columns=resolved,
                reason=reason,
            )

        return result

    def resolve_sql_expression(
        self, metric_id: str, role_to_column_map: Dict[str, str]
    ) -> str:
        """Resolves SQL formula by substituting role placeholders with actual column names."""
        if metric_id == "gross_profit":
            if "profit" in role_to_column_map:
                return f'SUM("{role_to_column_map["profit"]}")'
            elif "revenue" in role_to_column_map and "cost" in role_to_column_map:
                return f'SUM("{role_to_column_map["revenue"]}") - SUM("{role_to_column_map["cost"]}")'
            elif "revenue" in role_to_column_map and "margin" in role_to_column_map:
                return f'ROUND(SUM("{role_to_column_map["revenue"]}" * "{role_to_column_map["margin"]}"), 2)'
            else:
                raise ValueError("Metric 'gross_profit' requires role 'cost' or 'profit'")

        if metric_id == "gross_margin_pct":
            if "profit" in role_to_column_map and "revenue" in role_to_column_map:
                return f'ROUND(SUM("{role_to_column_map["profit"]}") / NULLIF(SUM("{role_to_column_map["revenue"]}"), 0) * 100, 2)'
            elif "revenue" in role_to_column_map and "cost" in role_to_column_map:
                return f'ROUND((SUM("{role_to_column_map["revenue"]}") - SUM("{role_to_column_map["cost"]}")) / NULLIF(SUM("{role_to_column_map["revenue"]}"), 0) * 100, 2)'
            elif "margin" in role_to_column_map:
                return f'ROUND(AVG("{role_to_column_map["margin"]}") * 100, 2)'
            else:
                raise ValueError("Metric 'gross_margin_pct' requires role 'revenue' and ('cost' or 'profit' or 'margin')")

        if metric_id == "total_orders":
            if "id" in role_to_column_map and role_to_column_map["id"]:
                return f'COUNT(DISTINCT "{role_to_column_map["id"]}")'
            return "COUNT(*)"

        metric = self.get_metric(metric_id)
        if not metric:
            raise ValueError(f"Unknown metric id: '{metric_id}'")

        expr = metric.formula_sql
        for role in metric.required_roles:
            if role not in role_to_column_map:
                raise ValueError(f"Metric '{metric_id}' requires role '{role}' which is not mapped.")
            actual_col = role_to_column_map[role]
            expr = expr.replace(f"{{{role}}}", f'"{actual_col}"')

        return expr


metric_registry = MetricRegistry()
