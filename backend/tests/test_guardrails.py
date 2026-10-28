"""Tests for BizLens Numerical Guardrail Core: Extraction, normalization, matching, and violation detection."""

import pytest
from app.services.guardrails import NumericalGuardrail, guardrail


@pytest.fixture
def clean_guardrail():
    return NumericalGuardrail()


def test_guardrail_token_extraction(clean_guardrail: NumericalGuardrail):
    text = (
        "Total revenue reached ₹1.24 Cr with a gross margin of 34.5% in 2024. "
        "Sales grew by 12 percent, amounting to Rs. 50,000 in North region (#1 rank). "
        "We also observed $10.5M in global operations and 500 units sold."
    )
    tokens = clean_guardrail.extract_numeric_tokens(text, context_years={2024})
    
    token_map = {t.raw_token: t for t in tokens}
    
    # Currency + Scale
    assert "₹1.24 Cr" in token_map
    assert token_map["₹1.24 Cr"].canonical_value == 12_400_000.0

    # Percentage
    assert "34.5%" in token_map
    assert token_map["34.5%"].canonical_value == 34.5
    assert token_map["34.5%"].is_percentage is True

    # Word percentage
    assert "12 percent" in token_map
    assert token_map["12 percent"].canonical_value == 12.0
    assert token_map["12 percent"].is_percentage is True

    # Currency without scale
    assert any("50,000" in t.raw_token for t in tokens)

    # Dollar with M scale
    assert "$10.5M" in token_map
    assert token_map["$10.5M"].canonical_value == 10_500_000.0

    # Year
    assert "2024" in token_map
    assert token_map["2024"].is_year is True

    # Structural rank #1
    assert any(t.raw_token == "#1" and t.is_structural for t in tokens)


def test_guardrail_passes_correct_numbers(clean_guardrail: NumericalGuardrail):
    # Facts calculated by DuckDB
    facts = [12_431_250.0, 34.5, 500.0, 24862.5]
    text = (
        "In Q3, total revenue generated was ₹1.24 Cr with an impressive gross margin of 34.5%. "
        "Total units sold reached 500 units across the region."
    )

    result = clean_guardrail.verify_response(text, fact_values=facts)
    assert result.passed is True
    assert len(result.violations) == 0


def test_guardrail_reformatted_variations_pass(clean_guardrail: NumericalGuardrail):
    # Fact is 4,500,000 (45 Lakh) and margin 18.2%
    facts = [4_500_000.0, 18.2]

    # Test with Lakh notation
    text1 = "Total revenue was ₹45.00 L with margin at 18.2%."
    res1 = clean_guardrail.verify_response(text1, fact_values=facts)
    assert res1.passed is True

    # Test with full integer notation
    text2 = "Total sales totaled 4,500,000 with 18.2% profit."
    res2 = clean_guardrail.verify_response(text2, fact_values=facts)
    assert res2.passed is True


def test_guardrail_catches_invented_percentages_and_numbers(clean_guardrail: NumericalGuardrail):
    # Facts only have 10,000 and 25.0
    facts = [10_000.0, 25.0]

    # Model hallucinates 42% growth and 99 Lakh revenue
    hallucinated_text = (
        "We achieved a staggering 42% increase in sales, resulting in ₹99 Lakh profit. "
        "Units sold stood at 10,000 with a 25.0% base margin."
    )

    result = clean_guardrail.verify_response(hallucinated_text, fact_values=facts)
    assert result.passed is False
    assert len(result.violations) >= 2

    violating_tokens = [v.raw_token for v in result.violations]
    assert any("42%" in v for v in violating_tokens)
    assert any("99" in v for v in violating_tokens)


def test_guardrail_structural_ordinals_exempted(clean_guardrail: NumericalGuardrail):
    facts = [1500.0]
    # Ordinal numbers in a list should be exempted
    text = (
        "Here are the top findings:\n"
        "1. Revenue was 1500.\n"
        "2. South was the top market."
    )
    result = clean_guardrail.verify_response(text, fact_values=facts)
    assert result.passed is True
    assert len(result.violations) == 0


def test_guardrail_telemetry_metrics(clean_guardrail: NumericalGuardrail):
    facts = [100.0]
    # Pass
    clean_guardrail.verify_response("Value is 100.", fact_values=facts)
    # Fail
    clean_guardrail.verify_response("Value is 999.", fact_values=facts)

    metrics = clean_guardrail.metrics
    assert metrics["total_verifications"] == 2
    assert metrics["total_violations"] == 1
    assert metrics["violation_rate"] == 0.5
