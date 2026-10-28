"""Tests for BizLens Metric Registry and Value Formatter."""

import pytest
from app.services.metric_registry import (
    MetricRegistry,
    MetricDefinition,
    BUILTIN_METRICS,
    metric_registry,
)
from app.services.analytics_engine import format_metric_value, calculate_status


def test_builtin_metrics_catalog():
    required_ids = [
        "total_revenue",
        "total_cost",
        "gross_profit",
        "gross_margin_pct",
        "total_orders",
        "total_units",
        "avg_order_value",
        "avg_unit_price",
        "avg_unit_cost",
        "avg_discount_pct",
        "revenue_mom_growth",
    ]
    all_metrics = metric_registry.list_all_metrics()
    metric_ids = {m.id for m in all_metrics}

    for r_id in required_ids:
        assert r_id in metric_ids
        metric = metric_registry.get_metric(r_id)
        assert metric is not None
        assert len(metric.required_roles) > 0


def test_metric_availability_checking():
    # Complete mapping
    full_roles = {
        "revenue": "Sales",
        "cost": "COGS",
        "id": "OrderID",
        "quantity": "Qty",
        "discount": "Disc",
        "date": "OrderDate",
    }
    avail = metric_registry.check_availability(full_roles)
    assert avail["total_revenue"].is_available is True
    assert avail["gross_profit"].is_available is True
    assert avail["gross_margin_pct"].is_available is True
    assert len(avail["gross_profit"].missing_roles) == 0

    # Partial mapping (missing cost)
    partial_roles = {
        "revenue": "Sales",
        "id": "OrderID",
    }
    partial_avail = metric_registry.check_availability(partial_roles)
    assert partial_avail["total_revenue"].is_available is True
    assert partial_avail["gross_profit"].is_available is False
    assert "cost" in partial_avail["gross_profit"].missing_roles
    assert "Missing required semantic roles" in partial_avail["gross_profit"].reason


def test_resolve_sql_expression():
    roles = {"revenue": "revenue_inr", "cost": "procurement_cost"}
    expr = metric_registry.resolve_sql_expression("gross_profit", roles)
    assert expr == 'SUM("revenue_inr") - SUM("procurement_cost")'

    with pytest.raises(ValueError, match="Unknown metric id"):
        metric_registry.resolve_sql_expression("non_existent_metric", roles)

    with pytest.raises(ValueError, match="requires role"):
        metric_registry.resolve_sql_expression("gross_profit", {"revenue": "revenue_inr"})


def test_format_metric_value_indian_conventions():
    # Crores (>= 10,000,000)
    assert format_metric_value(12_400_000, "currency", "currency") == "₹1.24 Cr"
    assert format_metric_value(105_000_000, "currency", "currency") == "₹10.50 Cr"

    # Lakhs (>= 100,000)
    assert format_metric_value(450_000, "currency", "currency") == "₹4.50 L"
    assert format_metric_value(100_000, "currency", "currency") == "₹1.00 L"

    # Standard (< 100,000)
    assert format_metric_value(75_450.50, "currency", "currency") == "₹75,450.50"
    assert format_metric_value(-250_000, "currency", "currency") == "-₹2.50 L"

    # Percentage
    assert format_metric_value(14.25, "percentage", "percentage") == "+14.2%"
    assert format_metric_value(-3.4, "percentage", "percentage") == "-3.4%"
    assert format_metric_value(0.0, "percentage", "percentage") == "0.0%"

    # Count
    assert format_metric_value(10000, "count", "integer") == "10,000"

    # None / unavailable
    assert format_metric_value(None, "currency", "currency") == "--"


def test_calculate_status_thresholds():
    # Higher is better
    assert calculate_status(7.5, "higher_is_better") == "positive"
    assert calculate_status(2.0, "higher_is_better") == "warning"
    assert calculate_status(-6.0, "higher_is_better") == "critical"

    # Lower is better
    assert calculate_status(-8.0, "lower_is_better") == "positive"
    assert calculate_status(2.0, "lower_is_better") == "warning"
    assert calculate_status(9.0, "lower_is_better") == "critical"

    # Neutral
    assert calculate_status(0.0, "higher_is_better") == "neutral"
    assert calculate_status(None, "higher_is_better") == "neutral"
