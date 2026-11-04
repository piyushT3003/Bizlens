"""BizLens Data Quality Copilot: Grounded explanations and deterministic transformation recommendations.

RULES.md Mandate:
"Analytics calculates. GenAI explains. Gemini is not the calculator."
Copilot receives structured issue summaries and pre-computed profiling scores. Output is strictly verified by guardrails.
"""

from typing import Dict, Any, List, Optional
from pathlib import Path
import re

from app.core.logging import logger
from app.db.models import QualityReport, DatasetVersion
from app.schemas.dataset import (
    QualityCopilotResponse,
    QualityCopilotAction,
    QualityComponentScore,
)
from app.services.guardrails import guardrail
from app.services.gemini_client import gemini_client


PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "data_quality_copilot.txt"


class QualityCopilotService:
    def _load_prompt_template(self) -> str:
        """Loads versioned prompt template from disk."""
        if PROMPT_PATH.exists():
            return PROMPT_PATH.read_text(encoding="utf-8")
        return (
            "You are the BizLens Data Quality Copilot. Organize response into "
            "[CALCULATED FACT], [INTERPRETATION], [RECOMMENDATION]."
        )

    def _generate_suggested_actions(
        self, issues: List[Dict[str, Any]], focus_column: Optional[str] = None
    ) -> List[QualityCopilotAction]:
        """Generates concrete, 1-click transformation action configurations based on detected issues."""
        actions: List[QualityCopilotAction] = []
        seen_types = set()

        filtered_issues = issues
        if focus_column:
            filtered_issues = [i for i in issues if i.get("column") == focus_column or i.get("column") is None]

        for issue in filtered_issues:
            code = issue.get("code", "")
            col = issue.get("column")

            if code == "DUPLICATE_ROWS" and "deduplicate_rows" not in seen_types:
                actions.append(
                    QualityCopilotAction(
                        type="deduplicate_rows",
                        title="Remove Duplicate Rows",
                        description="Eliminate exact duplicate rows across all columns to restore 100% uniqueness.",
                        parameters={},
                    )
                )
                seen_types.add("deduplicate_rows")

            elif code in ("EXCESSIVE_NULLS", "HIGH_NULLS", "MISSING_VALUES") and col:
                action_key = f"fill_nulls_{col}"
                if action_key not in seen_types:
                    actions.append(
                        QualityCopilotAction(
                            type="fill_null_values",
                            title=f"Impute Missing Values in '{col}'",
                            description=f"Fill missing values in '{col}' using constant default or statistical median.",
                            parameters={"columns": [col], "strategy": "constant", "value": "Unknown"},
                        )
                    )
                    actions.append(
                        QualityCopilotAction(
                            type="drop_null_rows",
                            title=f"Drop Rows with Missing '{col}'",
                            description=f"Remove rows where essential field '{col}' is null.",
                            parameters={"columns": [col], "how": "any"},
                        )
                    )
                    seen_types.add(action_key)

            elif code == "UNTRIMMED_WHITESPACE" and col:
                action_key = f"trim_{col}"
                if action_key not in seen_types:
                    actions.append(
                        QualityCopilotAction(
                            type="trim_strings",
                            title=f"Trim Whitespace in '{col}'",
                            description=f"Strip leading and trailing spaces in '{col}' to prevent aggregation splitting.",
                            parameters={"columns": [col]},
                        )
                    )
                    seen_types.add(action_key)

            elif code == "CASING_INCONSISTENCY" and col:
                action_key = f"casing_{col}"
                if action_key not in seen_types:
                    actions.append(
                        QualityCopilotAction(
                            type="standardize_categories",
                            title=f"Standardize Casing in '{col}'",
                            description=f"Convert category variants in '{col}' to Title Case for consistent grouping.",
                            parameters={"column": col, "case_rule": "title"},
                        )
                    )
                    seen_types.add(action_key)

            elif code in ("OUTLIER_VALUES", "UNEXPECTED_NEGATIVE_VALUES") and col:
                action_key = f"filter_outlier_{col}"
                if action_key not in seen_types:
                    actions.append(
                        QualityCopilotAction(
                            type="filter_outliers",
                            title=f"Filter Statistical Outliers in '{col}'",
                            description=f"Drop or cap statistical outlier anomalies outside IQR range in '{col}'.",
                            parameters={"column": col, "action": "drop", "threshold": 1.5},
                        )
                    )
                    actions.append(
                        QualityCopilotAction(
                            type="filter_outliers",
                            title=f"Cap Outliers in '{col}'",
                            description=f"Cap extreme variance values in '{col}' to 1.5x IQR boundary without losing rows.",
                            parameters={"column": col, "action": "cap", "threshold": 1.5},
                        )
                    )
                    seen_types.add(action_key)

        if not actions and not issues:
            actions.append(
                QualityCopilotAction(
                    type="trim_strings",
                    title="Optimize String Columns",
                    description="Ensure all text fields are trimmed and standardized.",
                    parameters={},
                )
            )

        return actions[:4]

    def _generate_deterministic_blocks(
        self,
        score: float,
        components: QualityComponentScore,
        issues: List[Dict[str, Any]],
        suggested_actions: List[QualityCopilotAction],
        focus_column: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Synthesizes high-fidelity, strictly fact-grounded blocks when Gemini is offline or in fallback."""
        fact_lines = [
            f"• Overall Data Quality Score: **{score:.1f}%**",
            f"• Completeness: **{components.completeness:.1f}%** | Validity: **{components.validity:.1f}%**",
            f"• Uniqueness: **{components.uniqueness:.1f}%** | Consistency: **{components.consistency:.1f}%**",
        ]

        if issues:
            fact_lines.append(f"• Total Data Quality Issues Detected: **{len(issues)}**")
            for i in issues[:3]:
                col_str = f" in '{i['column']}'" if i.get("column") else ""
                fact_lines.append(f"  - [{i['severity'].upper()}] {i['code']}{col_str}: {i['message']}")
        else:
            fact_lines.append("• Zero critical or warning data quality issues detected. All fields conform to standards.")

        fact_ids = ["quality_score", "completeness", "validity", "uniqueness", "consistency"]

        # Interpretation
        interp_lines = []
        if components.uniqueness < 99.0:
            interp_lines.append("Duplicate rows are present in the dataset, which artificially inflates transaction counts and volume totals.")
        if components.completeness < 95.0:
            interp_lines.append("Missing values in key fields risk distorting group aggregations or causing dropped records during analysis.")
        if components.consistency < 95.0:
            interp_lines.append("Whitespace or casing drift was detected across categorical fields, which can fragment category groupings.")
        if not interp_lines:
            interp_lines.append("The dataset exhibits high statistical hygiene with zero major anomalies, making it ideal for immediate executive reporting.")

        # Recommendations
        recomm_lines = []
        for idx, act in enumerate(suggested_actions, 1):
            recomm_lines.append(f"{idx}. **{act.title}**: {act.description}")
        if not recomm_lines:
            recomm_lines.append("1. Dataset is clean and ready for analytics. No mandatory transformations required.")

        return [
            {
                "tag": "CALCULATED FACT",
                "content": "Verified Data Profiling Assessment:\n\n" + "\n".join(fact_lines),
                "fact_ids": fact_ids,
            },
            {
                "tag": "INTERPRETATION",
                "content": " ".join(interp_lines),
                "fact_ids": fact_ids,
            },
            {
                "tag": "RECOMMENDATION",
                "content": "Recommended Cleaning Plan:\n\n" + "\n".join(recomm_lines),
                "fact_ids": [],
            },
            {
                "tag": "NOTICE",
                "content": "Operating in **Deterministic Quality Analysis Mode**. All quality metrics are pre-computed directly by DuckDB statistical profiler.",
                "fact_ids": [],
            },
        ]

    def analyze_quality(
        self,
        quality_report: QualityReport,
        version: DatasetVersion,
        focus_column: Optional[str] = None,
        focus_issue_code: Optional[str] = None,
    ) -> QualityCopilotResponse:
        """Runs quality analysis with Gemini AI if available, falling back to deterministic local synthesis."""
        comps_dict = quality_report.components or {}
        components = QualityComponentScore(
            completeness=float(comps_dict.get("completeness", 100.0)),
            consistency=float(comps_dict.get("consistency", 100.0)),
            validity=float(comps_dict.get("validity", 100.0)),
            uniqueness=float(comps_dict.get("uniqueness", 100.0)),
            anomaly_freedom=float(comps_dict.get("anomaly_freedom", 100.0)),
        )

        all_issues = quality_report.issues or []
        if focus_column:
            all_issues = [i for i in all_issues if i.get("column") == focus_column or i.get("column") is None]
        if focus_issue_code:
            all_issues = [i for i in all_issues if i.get("code") == focus_issue_code]

        suggested_actions = self._generate_suggested_actions(all_issues, focus_column=focus_column)

        # Pre-computed numeric facts allowed in guardrail
        allowed_facts = [
            round(quality_report.score, 1),
            round(components.completeness, 1),
            round(components.validity, 1),
            round(components.uniqueness, 1),
            round(components.consistency, 1),
            float(len(all_issues)),
            float(version.row_count),
            float(version.col_count),
        ]
        # Also include numbers mentioned in issue messages (counts, percentages)
        for issue in all_issues:
            msg = issue.get("message", "")
            numbers = re.findall(r"\b\d+(?:\.\d+)?\b", msg)
            for n in numbers:
                try:
                    allowed_facts.append(float(n))
                except ValueError:
                    pass

        blocks: List[Dict[str, Any]] = []

        # Attempt Gemini generation if client is configured
        if gemini_client.is_available:
            try:
                prompt_template = self._load_prompt_template()
                issues_summary = "\n".join(
                    [f"- [{i.get('severity', 'info').upper()}] {i.get('code')}: {i.get('message')}" for i in all_issues[:10]]
                ) or "None (Clean Dataset)"

                actions_summary = "\n".join([f"- {a.title}: {a.description}" for a in suggested_actions])

                prompt = f"""{prompt_template}

DATA QUALITY METRICS:
- Overall Quality Score: {quality_report.score:.1f}%
- Completeness: {components.completeness:.1f}%
- Validity: {components.validity:.1f}%
- Uniqueness: {components.uniqueness:.1f}%
- Consistency: {components.consistency:.1f}%
- Total Rows: {version.row_count:,}
- Total Columns: {version.col_count}
- Focus Column: {focus_column or 'Entire Dataset'}

DETECTED ISSUES:
{issues_summary}

AVAILABLE ACTIONS:
{actions_summary}

Generate the response strictly using [CALCULATED FACT], [INTERPRETATION], and [RECOMMENDATION] blocks.
"""
                ai_text = gemini_client.generate_explanation(
                    system_instruction="You are the BizLens Data Quality Copilot. Follow RULES.md strictly.",
                    user_prompt=prompt,
                )

                # Post-generation guardrail verification
                guard_res = guardrail.verify_response(
                    text=ai_text,
                    fact_values=allowed_facts,
                    allowed_ordinals=[1, 2, 3, 4, 5],
                )

                if guard_res.passed:
                    # Parse tagged blocks
                    tag_pattern = re.compile(
                        r'\[(CALCULATED FACT|INTERPRETATION|RECOMMENDATION)\]\s*(.*?)(?=\[(?:CALCULATED FACT|INTERPRETATION|RECOMMENDATION)\]|\Z)',
                        re.DOTALL | re.IGNORECASE,
                    )
                    matches = list(tag_pattern.finditer(ai_text))
                    if matches:
                        for m in matches:
                            blocks.append({
                                "tag": m.group(1).upper(),
                                "content": m.group(2).strip(),
                                "fact_ids": ["quality_score"],
                            })

                if not blocks:
                    logger.warning("Guardrail check failed or no tagged blocks; using deterministic synthesis.")
            except Exception as err:
                logger.warning("Gemini Quality Copilot call failed: %s; using deterministic fallback.", err)

        # Fallback if Gemini not available or failed guardrail
        if not blocks:
            blocks = self._generate_deterministic_blocks(
                score=quality_report.score,
                components=components,
                issues=all_issues,
                suggested_actions=suggested_actions,
                focus_column=focus_column,
            )

        # Run guardrail verification on final response
        combined_text = " ".join([b["content"] for b in blocks])
        guard_final = guardrail.verify_response(
            text=combined_text,
            fact_values=allowed_facts,
            allowed_ordinals=[1, 2, 3, 4, 5],
        )

        return QualityCopilotResponse(
            blocks=blocks,
            suggested_actions=suggested_actions,
            quality_score=quality_report.score,
            components=components,
            guardrail_result={
                "passed": guard_final.passed,
                "total_extracted": len(guard_final.extracted_tokens),
                "violations": [v.raw_token for v in guard_final.violations],
            },
        )


quality_copilot_service = QualityCopilotService()
