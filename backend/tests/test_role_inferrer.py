"""Tests for BizLens Column Role Inferrer: Benchmark across 5 diverse datasets verifying >= 95% role accuracy."""

import uuid
from pathlib import Path
import pandas as pd
import pytest

from app.services.ingestion import ingestion_engine
from app.services.profiler import data_profiler
from app.services.role_inferrer import role_inferrer


def _run_dataset_benchmark(df: pd.DataFrame, expected_roles: dict, tmp_path: Path, name: str) -> float:
    csv_path = tmp_path / f"{name}.csv"
    df.to_csv(csv_path, index=False)
    dataset_id = str(uuid.uuid4())

    ingest_res = ingestion_engine.ingest_file(csv_path, dataset_id, 1)
    profile_res = data_profiler.profile_parquet(
        parquet_path=Path(ingest_res.parquet_path),
        dataset_id=dataset_id,
        version_number=1,
    )

    inferences = role_inferrer.infer_roles(profile_res.columns)

    correct = 0
    total = len(expected_roles)

    for col, expected_role in expected_roles.items():
        clean_col = col.lower().strip().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_").replace("$", "").replace("₹", "").strip("_")
        # Find matching key in inferences
        matched_inf = inferences.get(clean_col)
        if not matched_inf:
            # Try fuzzy match
            for k in inferences:
                if clean_col in k or k in clean_col:
                    matched_inf = inferences[k]
                    break

        assert matched_inf is not None, f"Column '{col}' (clean: '{clean_col}') not found in inferences: {list(inferences.keys())}"
        if matched_inf.suggested_role == expected_role:
            correct += 1
        else:
            print(f"[{name}] MISMATCH for '{col}': expected '{expected_role}', got '{matched_inf.suggested_role}' (conf: {matched_inf.confidence}, reason: {matched_inf.reasoning})")

    accuracy = correct / total
    return accuracy


def test_benchmark_5_datasets(tmp_path):
    benchmarks = []

    # Dataset 1: Clean Omnichannel Retail
    df1 = pd.DataFrame({
        "order_id": ["ORD-1", "ORD-2", "ORD-3", "ORD-4"],
        "order_date": ["2024-07-01", "2024-07-02", "2024-07-03", "2024-07-04"],
        "customer_name": ["Apex Labs", "Zeta Corp", "Kaveri Tech", "Falcon Cloud"],
        "state": ["Karnataka", "Maharashtra", "Delhi", "Telangana"],
        "category": ["Electronics", "Apparel", "Home & Kitchen", "Beauty"],
        "product_name": ["Wireless Mouse", "Cotton Tee", "Ergo Chair", "Glow Serum"],
        "quantity": [2, 5, 1, 3],
        "revenue": [3798.0, 6495.0, 14999.0, 2697.0],
        "cost": [1900.0, 2100.0, 8200.0, 840.0],
        "discount": [0.05, 0.10, 0.0, 0.15],
    })
    exp1 = {
        "order_id": "id",
        "order_date": "date",
        "customer_name": "customer",
        "state": "region",
        "category": "category",
        "product_name": "product",
        "quantity": "quantity",
        "revenue": "revenue",
        "cost": "cost",
        "discount": "discount",
    }
    acc1 = _run_dataset_benchmark(df1, exp1, tmp_path, "ds1_clean_retail")
    benchmarks.append(("Clean Retail", acc1))

    # Dataset 2: Messy Dates & Currency Headers
    df2 = pd.DataFrame({
        "Invoice No": ["INV-101", "INV-102", "INV-103"],
        "Billing Date": ["2024-08-15", "2024-08-16", "2024-08-17"],
        "City Hub": ["Bengaluru", "Mumbai", "Delhi"],
        "Gross Sales ($)": [12400.0, 45200.0, 18900.0],
        "Total Margin %": [0.32, 0.28, 0.41],
        "Item SKU": ["SKU-99", "SKU-88", "SKU-77"],
    })
    exp2 = {
        "Invoice No": "id",
        "Billing Date": "date",
        "City Hub": "region",
        "Gross Sales ($)": "revenue",
        "Total Margin %": "margin",
        "Item SKU": "product",
    }
    acc2 = _run_dataset_benchmark(df2, exp2, tmp_path, "ds2_currency_headers")
    benchmarks.append(("Currency Headers", acc2))

    # Dataset 3: Minimal Dataset (Missing Date & Cost)
    df3 = pd.DataFrame({
        "Department": ["Hardware", "Software", "Cloud"],
        "Client": ["Infosys", "Wipro", "TCS"],
        "Turnover": [500000.0, 1200000.0, 850000.0],
        "Volume": [10, 25, 18],
    })
    exp3 = {
        "Department": "category",
        "Client": "customer",
        "Turnover": "revenue",
        "Volume": "quantity",
    }
    acc3 = _run_dataset_benchmark(df3, exp3, tmp_path, "ds3_minimal")
    benchmarks.append(("Minimal", acc3))

    # Dataset 4: Short & Abbreviated Headers
    df4 = pd.DataFrame({
        "doc_no": ["DOC-1", "DOC-2", "DOC-3"],
        "txn_date": ["2024-09-01", "2024-09-02", "2024-09-03"],
        "cogs": [450.0, 890.0, 120.0],
        "qty": [4, 8, 2],
        "loc": ["Mumbai", "Bengaluru", "Hyderabad"],
    })
    exp4 = {
        "doc_no": "id",
        "txn_date": "date",
        "cogs": "cost",
        "qty": "quantity",
        "loc": "region",
    }
    acc4 = _run_dataset_benchmark(df4, exp4, tmp_path, "ds4_abbreviated")
    benchmarks.append(("Abbreviated", acc4))

    # Dataset 5: Unicode & Indian Context Headers
    df5 = pd.DataFrame({
        "Challan ID": ["CH-01", "CH-02", "CH-03"],
        "Transaction Date": ["2024-09-10", "2024-09-11", "2024-09-12"],
        "Destination State": ["Karnataka", "Maharashtra", "Delhi"],
        "Product Title": ["Noise Cancelling Headphones", "4K Monitor", "Fast Charger"],
        "Total Sales (₹)": [8499.0, 24999.0, 1999.0],
        "Customer Feedback": ["Great product", "Fast delivery", "Excellent quality"],
    })
    exp5 = {
        "Challan ID": "id",
        "Transaction Date": "date",
        "Destination State": "region",
        "Product Title": "product",
        "Total Sales (₹)": "revenue",
        "Customer Feedback": "text",
    }
    acc5 = _run_dataset_benchmark(df5, exp5, tmp_path, "ds5_indian_context")
    benchmarks.append(("Indian Context", acc5))

    total_cols = sum(len(exp) for exp in [exp1, exp2, exp3, exp4, exp5])
    total_correct = sum(acc * len(exp) for (_, acc), exp in zip(benchmarks, [exp1, exp2, exp3, exp4, exp5]))
    overall_accuracy = total_correct / total_cols

    print(f"\n==========================================")
    print(f"BENCHMARK RESULTS ACROSS 5 DIVERSE DATASETS:")
    for name, acc in benchmarks:
        print(f" - {name}: {acc * 100:.1f}%")
    print(f"OVERALL BENCHMARK ACCURACY: {overall_accuracy * 100:.2f}% (Target: >= 95%)")
    print(f"==========================================")

    assert overall_accuracy >= 0.95, f"Overall accuracy {overall_accuracy * 100:.2f}% fell below 95% target!"
