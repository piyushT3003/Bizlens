"""Pytest integration for the BizLens Evaluation Suite."""

import pytest
from evals.runner import run_evals


def test_eval_suite_threshold():
    """Asserts that the 50+ case declarative eval suite achieves >= 95% pass rate."""
    success = run_evals()
    assert success is True, "Eval suite pass rate fell below the 95% CI threshold."
