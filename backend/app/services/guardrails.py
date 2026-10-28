"""BizLens Numerical Guardrail Core: Strict validation of AI-generated content against deterministic engine facts.

RULES.md Mandate:
"Analytics calculates. GenAI explains. Gemini is not the calculator. Gemini is not allowed to invent dataset numbers."
1. Extract every numeric token/phrase from the response.
2. Normalize each to canonical values.
3. Compare against supplied fact set with documented tolerance.
4. Allow only: numbers present in facts, plus trivially structural numbers (ordinals, years/dates).
5. Expose violation tracking.
"""

import re
import hashlib
from typing import Dict, Any, List, Set, Optional, Tuple
from dataclasses import dataclass, field

from app.core.logging import logger


WORD_TO_NUMBER: Dict[str, float] = {
    "zero": 0.0,
    "one": 1.0,
    "two": 2.0,
    "three": 3.0,
    "four": 4.0,
    "five": 5.0,
    "six": 6.0,
    "seven": 7.0,
    "eight": 8.0,
    "nine": 9.0,
    "ten": 10.0,
    "eleven": 11.0,
    "twelve": 12.0,
    "thirteen": 13.0,
    "fourteen": 14.0,
    "fifteen": 15.0,
    "sixteen": 16.0,
    "seventeen": 17.0,
    "eighteen": 18.0,
    "nineteen": 19.0,
    "twenty": 20.0,
    "thirty": 30.0,
    "forty": 40.0,
    "fifty": 50.0,
    "sixty": 60.0,
    "seventy": 70.0,
    "eighty": 80.0,
    "ninety": 90.0,
    "hundred": 100.0,
    "first": 1.0,
    "second": 2.0,
    "third": 3.0,
    "fourth": 4.0,
    "fifth": 5.0,
}


@dataclass
class ExtractedNumericToken:
    raw_token: str
    canonical_value: float
    is_percentage: bool = False
    is_structural: bool = False
    is_year: bool = False
    start_pos: int = -1
    end_pos: int = -1


@dataclass
class GuardrailViolation:
    raw_token: str
    normalized_value: float
    reason: str


@dataclass
class GuardrailResult:
    passed: bool
    total_extracted: int
    extracted_tokens: List[ExtractedNumericToken]
    violations: List[GuardrailViolation]
    allowed_facts: List[float]
    tolerance_used: float = 0.01


class NumericalGuardrail:
    def __init__(self):
        self._total_verifications: int = 0
        self._total_violations: int = 0

    @property
    def metrics(self) -> Dict[str, Any]:
        rate = (
            self._total_violations / self._total_verifications
            if self._total_verifications > 0
            else 0.0
        )
        return {
            "total_verifications": self._total_verifications,
            "total_violations": self._total_violations,
            "violation_rate": round(rate, 4),
        }

    def _normalize_scale(self, num_str: str, scale_str: Optional[str]) -> float:
        cleaned_num = num_str.replace(",", "").strip()
        val = float(cleaned_num)

        if not scale_str:
            return val

        scale_lower = scale_str.lower().strip()
        if scale_lower in ("cr", "crore", "crores"):
            return val * 10_000_000.0
        elif scale_lower in ("l", "lakh", "lakhs", "lac", "lacs"):
            return val * 100_000.0
        elif scale_lower in ("k", "thousand"):
            return val * 1_000.0
        elif scale_lower in ("m", "million"):
            return val * 1_000_000.0
        elif scale_lower in ("b", "bn", "billion"):
            return val * 1_000_000_000.0
        return val

    def extract_numeric_tokens(
        self,
        text: str,
        context_years: Optional[Set[int]] = None,
        allowed_ordinals: Optional[Set[int]] = None,
    ) -> List[ExtractedNumericToken]:
        """Extracts and normalizes all numeric values, units, currencies, percentages, and number words."""
        tokens: List[ExtractedNumericToken] = []
        covered_spans: List[Tuple[int, int]] = []

        context_years = context_years or {2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027}
        allowed_ordinals = allowed_ordinals or set(range(1, 21))  # 1 to 20 for list items

        def is_covered(start: int, end: int) -> bool:
            return any(s <= start and end <= e for s, e in covered_spans)

        # 1. Currency + number + scale (e.g., ₹1.24 Cr, Rs. 50,000, $10.5M)
        currency_pattern = re.compile(
            r'(?:[₹$]|Rs\.?|INR)\s*([+-]?\d+(?:,\d{2,3})*(?:\.\d+)?)\s*(Cr(?:ore)?s?|L(?:akh)?s?|k|K|m|M|b|B(?:illion)?)?',
            re.IGNORECASE,
        )
        for m in currency_pattern.finditer(text):
            start, end = m.span()
            num_part = m.group(1)
            scale_part = m.group(2)
            val = self._normalize_scale(num_part, scale_part)
            tokens.append(
                ExtractedNumericToken(
                    raw_token=m.group(0).strip(),
                    canonical_value=val,
                    start_pos=start,
                    end_pos=end,
                )
            )
            covered_spans.append((start, end))

        # 2. Percentage patterns (e.g. 14.2%, +5.1%, 12 percent, -0.8 %)
        pct_pattern = re.compile(
            r'([+-]?\d+(?:,\d{2,3})*(?:\.\d+)?)\s*(?:%|percent(?:age)?)',
            re.IGNORECASE,
        )
        for m in pct_pattern.finditer(text):
            start, end = m.span()
            if is_covered(start, end):
                continue
            num_part = m.group(1)
            val = float(num_part.replace(",", ""))
            tokens.append(
                ExtractedNumericToken(
                    raw_token=m.group(0).strip(),
                    canonical_value=val,
                    is_percentage=True,
                    start_pos=start,
                    end_pos=end,
                )
            )
            covered_spans.append((start, end))

        # 3. Scaled numbers without currency (e.g. 1.24 Cr, 50 Lakh, 10M, 5K)
        scaled_pattern = re.compile(
            r'\b([+-]?\d+(?:,\d{2,3})*(?:\.\d+)?)\s*(Cr(?:ore)?s?|L(?:akh)?s?|k|K|m|M|b|B(?:illion)?)\b',
            re.IGNORECASE,
        )
        for m in scaled_pattern.finditer(text):
            start, end = m.span()
            if is_covered(start, end):
                continue
            num_part = m.group(1)
            scale_part = m.group(2)
            val = self._normalize_scale(num_part, scale_part)
            tokens.append(
                ExtractedNumericToken(
                    raw_token=m.group(0).strip(),
                    canonical_value=val,
                    start_pos=start,
                    end_pos=end,
                )
            )
            covered_spans.append((start, end))

        # 4. Ordinals / rankings (e.g. 1st, 2nd, 3rd, #1, #2, rank 1)
        ordinal_pattern = re.compile(
            r'(?:#|rank\s*)?(\d+)(?:st|nd|rd|th)?\b',
            re.IGNORECASE,
        )
        for m in ordinal_pattern.finditer(text):
            start, end = m.span()
            if is_covered(start, end):
                continue
            raw = m.group(0).strip()
            num_val = int(m.group(1))

            # Check if this is a structural markdown list item e.g. "1. " or "2. "
            prev_char = text[start - 1] if start > 0 else "\n"
            next_chars = text[end : end + 2]
            is_list_item = (prev_char in "\n\r" and next_chars.startswith("."))
            is_rank_token = any(raw.lower().startswith(p) for p in ("#", "rank")) or any(
                raw.lower().endswith(s) for s in ("st", "nd", "rd", "th")
            )

            if (is_list_item or is_rank_token) and num_val in allowed_ordinals:
                tokens.append(
                    ExtractedNumericToken(
                        raw_token=raw,
                        canonical_value=float(num_val),
                        is_structural=True,
                        start_pos=start,
                        end_pos=end,
                    )
                )
                covered_spans.append((start, end))

        # 5. Plain numbers / integers / floats
        plain_pattern = re.compile(r'\b([+-]?\d+(?:,\d{2,3})*(?:\.\d+)?)\b')
        for m in plain_pattern.finditer(text):
            start, end = m.span()
            if is_covered(start, end):
                continue

            raw = m.group(0).strip()
            # Skip numbers that are part of hyphenated or underscored alphanumeric codes (e.g. SM-20320, SKU-901, ITEM_12)
            is_hyphen_id = raw.startswith(('-', '+')) and start > 0 and text[start - 1].isalnum()
            is_id_suffix = start > 0 and text[start - 1] in ('-', '_') and text[max(0, start - 2):start - 1].isalnum()
            if is_hyphen_id or is_id_suffix:
                continue

            num_str = m.group(1).replace(",", "")
            val = float(num_str)
            raw = m.group(0).strip()

            # Check if year
            if val.is_integer() and int(val) in context_years:
                tokens.append(
                    ExtractedNumericToken(
                        raw_token=raw,
                        canonical_value=val,
                        is_year=True,
                        start_pos=start,
                        end_pos=end,
                    )
                )
            # Check if list ordinal like "1." or structural count in context (e.g. top 3, 3 categories)
            elif (
                val.is_integer()
                and int(val) in allowed_ordinals
                and (
                    (start == 0 or text[start - 1] in "\n\r -#*([")
                    or (end < len(text) and text[end] in ".) \n\t:,-]")
                    or (start > 0 and any(text[max(0, start - 15):start].lower().endswith(w) for w in ("top ", "rank ", "best ", "first ", "last ", "across ", "within ", "the ", "these ", "here are ", "key ")))
                )
            ):
                tokens.append(
                    ExtractedNumericToken(
                        raw_token=raw,
                        canonical_value=val,
                        is_structural=True,
                        start_pos=start,
                        end_pos=end,
                    )
                )
            else:
                tokens.append(
                    ExtractedNumericToken(
                        raw_token=raw,
                        canonical_value=val,
                        start_pos=start,
                        end_pos=end,
                    )
                )
            covered_spans.append((start, end))

        # 6. Word numbers (e.g. "twelve percent", "three", "first")
        word_pct_pattern = re.compile(
            r'\b(' + '|'.join(WORD_TO_NUMBER.keys()) + r')\s*(?:percent|%)\b',
            re.IGNORECASE,
        )
        for m in word_pct_pattern.finditer(text):
            start, end = m.span()
            if is_covered(start, end):
                continue
            word = m.group(1).lower()
            val = WORD_TO_NUMBER[word]
            tokens.append(
                ExtractedNumericToken(
                    raw_token=m.group(0).strip(),
                    canonical_value=val,
                    is_percentage=True,
                    start_pos=start,
                    end_pos=end,
                )
            )
            covered_spans.append((start, end))

        # Standalone small word numbers (e.g. "three regions", "five categories")
        word_pattern = re.compile(
            r'\b(' + '|'.join(WORD_TO_NUMBER.keys()) + r')\b',
            re.IGNORECASE,
        )
        for m in word_pattern.finditer(text):
            start, end = m.span()
            if is_covered(start, end):
                continue
            word = m.group(1).lower()
            val = WORD_TO_NUMBER[word]
            # Small counts like "two categories" or "three months" can be structural if in allowed_ordinals
            is_struct = int(val) in allowed_ordinals
            tokens.append(
                ExtractedNumericToken(
                    raw_token=m.group(0).strip(),
                    canonical_value=val,
                    is_structural=is_struct,
                    start_pos=start,
                    end_pos=end,
                )
            )
            covered_spans.append((start, end))

        tokens.sort(key=lambda t: t.start_pos)
        return tokens

    def _matches_fact(
        self,
        token: ExtractedNumericToken,
        fact_values: List[float],
        tolerance: float = 0.015,
    ) -> bool:
        """Checks if a canonical value matches any fact value or valid derived ratio within tolerance."""
        v = token.canonical_value

        for f in fact_values:
            # 1. Exact or near-zero match
            if abs(v - f) < 1e-5:
                return True

            # 2. Relative tolerance (1.5%)
            if f != 0:
                rel_diff = abs(v - f) / abs(f)
                if rel_diff <= tolerance:
                    return True

            # 3. Percentage representation check (e.g. 14.2% matches 14.2 or 0.142)
            if token.is_percentage:
                # v as 14.2 vs f as 0.142
                if f != 0:
                    rel_p = abs((v / 100.0) - f) / abs(f)
                    if rel_p <= tolerance:
                        return True
                    # or f is 14.2 and v is 14.2
                    rel_direct = abs(v - f) / abs(f)
                    if rel_direct <= tolerance:
                        return True

            # 4. Rounding to integer/display precision (e.g. 12431250 vs 12400000 Cr rounding)
            if f >= 100_000:
                # Lakh/Crore 2-decimal rounded precision
                rounded_f_cr = round(f / 10_000_000.0, 2) * 10_000_000.0
                if abs(v - rounded_f_cr) / f <= 0.02:  # within 2% due to 2-decimal crore rounding
                    return True
                rounded_f_l = round(f / 100_000.0, 2) * 100_000.0
                if abs(v - rounded_f_l) / f <= 0.02:
                    return True

        # 5. Derived quotient between two known facts (e.g. units/orders = 2.19, or profit/revenue = 44%)
        if len(fact_values) >= 2:
            for f1 in fact_values:
                if f1 <= 0:
                    continue
                for f2 in fact_values:
                    if f2 <= 0 or f1 == f2:
                        continue
                    # Direct quotient f1 / f2
                    ratio = f1 / f2
                    if abs(v - ratio) < 1e-4 or (ratio != 0 and abs(v - ratio) / ratio <= tolerance):
                        return True
                    # Percentage quotient (f1 / f2) * 100
                    ratio_pct = (f1 / f2) * 100.0
                    if abs(v - ratio_pct) < 1e-4 or (ratio_pct != 0 and abs(v - ratio_pct) / ratio_pct <= tolerance):
                        return True

        return False

    def verify_response(
        self,
        text: str,
        fact_values: List[float],
        allowed_ordinals: Optional[Set[int]] = None,
        context_years: Optional[Set[int]] = None,
        tolerance: float = 0.015,
        prompt_version: str = "v1.0",
        model: str = "gemini-3.5-flash-lite",
    ) -> GuardrailResult:
        """Verifies an AI-generated text response against the pre-calculated fact set."""
        self._total_verifications += 1

        tokens = self.extract_numeric_tokens(
            text,
            context_years=context_years,
            allowed_ordinals=allowed_ordinals,
        )

        violations: List[GuardrailViolation] = []

        for token in tokens:
            # Exempt structural tokens (list ordinals, rankings)
            if token.is_structural:
                continue
            # Exempt date/year tokens
            if token.is_year:
                continue

            # Check against facts
            if not self._matches_fact(token, fact_values, tolerance):
                violations.append(
                    GuardrailViolation(
                        raw_token=token.raw_token,
                        normalized_value=token.canonical_value,
                        reason=f"Number '{token.raw_token}' (value {token.canonical_value}) not found in calculated facts.",
                    )
                )

        passed = len(violations) == 0

        if not passed:
            self._total_violations += len(violations)
            # Log violation without PII
            facts_hash = hashlib.sha256(str(sorted(fact_values)).encode()).hexdigest()[:12]
            logger.warning(
                "Guardrail VIOLATION detected! count=%d, prompt_version=%s, model=%s, facts_hash=%s",
                len(violations),
                prompt_version,
                model,
                facts_hash,
            )

        return GuardrailResult(
            passed=passed,
            total_extracted=len(tokens),
            extracted_tokens=tokens,
            violations=violations,
            allowed_facts=fact_values,
            tolerance_used=tolerance,
        )

    verify = verify_response


guardrail = NumericalGuardrail()
