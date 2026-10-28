"""BizLens Demo Seed: Generates high-fidelity Indian commerce retail dataset 'Sample Retail Q3' with deterministic calculation consistency and verified column mapping."""

import uuid
import random
from datetime import datetime, timedelta
from pathlib import Path
import duckdb
import pandas as pd

from app.core.config import settings
from app.core.logging import logger
from app.db.session import SessionLocal
from app.db.models import User, Dataset, DatasetVersion, ColumnMapping, QualityReport
from app.services.ingestion import ingestion_engine
from app.services.profiler import data_profiler
from app.services.role_inferrer import role_inferrer

DEMO_USER_EMAIL = "piyush@bizlens.ai"
DEMO_DATASET_NAME = "Sample Retail Q3"


def generate_demo_dataframe(num_rows: int = 10_000) -> pd.DataFrame:
    """Generates synthetic but realistic retail data with Indian commercial geographical distribution."""
    random.seed(42)

    categories = {
        "Electronics": [
            ("Quantum Horizon Noise-Cancelling Headphones", 8499.0, 5200.0),
            ("UltraVision 4K Smart Monitor 27-inch", 24999.0, 16800.0),
            ("AuraMech Mechanical Keyboard RGB", 4299.0, 2400.0),
            ("NovaSync Ergonomic Wireless Mouse", 1899.0, 950.0),
            ("TitanCharge 65W GaN Fast Charger", 1999.0, 850.0),
        ],
        "Apparel": [
            ("EcoBreath Organic Supima Cotton Tee", 1299.0, 420.0),
            ("QuantumFlex Tailored Tech Chino", 2999.0, 1150.0),
            ("UrbanShield Waterproof Commuter Jacket", 5499.0, 2400.0),
            ("AeroStride Merino Wool Athletic Socks", 699.0, 180.0),
        ],
        "Home & Kitchen": [
            ("ErgoRest Mesh High-Back Office Chair", 14999.0, 8200.0),
            ("AuraGlow Smart Desk Task Lamp", 3499.0, 1650.0),
            ("PureFlow Cold-Press Slow Juicer", 7999.0, 4100.0),
            ("ThermaSteel Vacuum Insulated Tumbler", 1499.0, 480.0),
        ],
        "Beauty & Wellness": [
            ("Luminous Glow Vitamin C Serum 30ml", 999.0, 280.0),
            ("HydraBarrier Ceramide Deep Cream", 1299.0, 390.0),
            ("Botanical Defense Mineral Sunscreen SPF50", 899.0, 240.0),
        ],
    }

    regions = [
        ("Karnataka", "Bengaluru", 0.35),
        ("Maharashtra", "Mumbai", 0.25),
        ("Delhi", "Delhi", 0.18),
        ("Telangana", "Hyderabad", 0.10),
        ("Tamil Nadu", "Chennai", 0.08),
        ("West Bengal", "Kolkata", 0.04),
    ]

    customers = [
        "Apex Digital Labs", "Zeta Enterprise Solutions", "Kaveri Tech Hub", "Trident Logistics",
        "Falcon Cloud Services", "BlueSky Retailers", "Vanguard Systems", "Omkar Infotech",
        "Aarav Sharma", "Pooja Patel", "Rohan Mehta", "Ananya Iyer", "Vikram Malhotra",
        "Neha Gupta", "Siddharth Rao", "Deepak Verma", "Priyanka Nair", "Karan Joshi"
    ]

    start_date = datetime(2024, 7, 1)
    end_date = datetime(2024, 9, 30)
    delta_days = (end_date - start_date).days

    rows = []
    region_weights = [r[2] for r in regions]

    for i in range(1, num_rows + 1):
        order_id = f"ORD-2024-{i:05d}"
        days_offset = random.randint(0, delta_days)
        order_date = (start_date + timedelta(days=days_offset)).strftime("%Y-%m-%d")

        # Pick region based on market weights
        selected_region = random.choices(regions, weights=region_weights, k=1)[0]
        state, city, _ = selected_region

        # Pick category & product
        cat_name = random.choice(list(categories.keys()))
        prod_tuple = random.choice(categories[cat_name])
        prod_name, base_price, base_cost = prod_tuple

        quantity = random.choices([1, 2, 3, 4, 5, 8, 10], weights=[45, 25, 15, 8, 4, 2, 1], k=1)[0]
        discount_rate = random.choices([0.0, 0.05, 0.10, 0.15, 0.20], weights=[50, 25, 15, 7, 3], k=1)[0]

        gross_revenue = round(quantity * base_price, 2)
        discount_amount = round(gross_revenue * discount_rate, 2)
        net_revenue = round(gross_revenue - discount_amount, 2)
        total_cost = round(quantity * base_cost, 2)
        margin_pct = round((net_revenue - total_cost) / net_revenue, 4) if net_revenue > 0 else 0.0

        customer = random.choice(customers)

        rows.append({
            "order_id": order_id,
            "order_date": order_date,
            "customer_name": customer,
            "state": state,
            "city": city,
            "category": cat_name,
            "product_name": prod_name,
            "quantity": quantity,
            "unit_price": base_price,
            "unit_cost": base_cost,
            "discount": discount_rate,
            "revenue": net_revenue,
            "cost": total_cost,
            "margin": margin_pct,
        })

    return pd.DataFrame(rows)


def seed_demo_dataset(db: Optional[SessionLocal] = None):
    """Seeds the official demo dataset into database and Parquet storage."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True
    try:
        # 1. Ensure Demo User exists
        user = db.query(User).filter(User.email == DEMO_USER_EMAIL).first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email=DEMO_USER_EMAIL,
                display_name="Piyush",
                password_hash="mock_hash_for_demo_login",
                status="active",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # 2. Check if dataset already exists
        existing_dataset = db.query(Dataset).filter(
            Dataset.user_id == user.id, Dataset.name == DEMO_DATASET_NAME
        ).first()

        if existing_dataset:
            logger.info("Demo dataset already seeded (ID: %s).", existing_dataset.id)
            return existing_dataset.id

        # 3. Generate DataFrame and save to temporary CSV
        df = generate_demo_dataframe(num_rows=10_000)
        temp_dir = Path(settings.STORAGE_ROOT) / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        csv_path = temp_dir / "sample_retail_q3.csv"
        df.to_csv(csv_path, index=False)

        dataset_id = str(uuid.uuid4())
        version_id = str(uuid.uuid4())

        # 4. Ingest via IngestionEngine
        ingest_res = ingestion_engine.ingest_file(
            source_path=csv_path,
            dataset_id=dataset_id,
            version_number=1,
        )

        # 5. Profile via DataProfiler
        profile_res = data_profiler.profile_parquet(
            parquet_path=Path(ingest_res.parquet_path),
            dataset_id=dataset_id,
            version_number=1,
        )

        # 6. Infer Roles via ColumnRoleInferrer
        inferences = role_inferrer.infer_roles(profile_res.columns)

        # Construct verified column mapping dictionary
        mapping_dict = {}
        for col_name, inf in inferences.items():
            mapping_dict[col_name] = {
                "original_name": inf.original_name,
                "role": inf.suggested_role,
                "data_type": profile_res.columns[col_name].duckdb_type,
                "confidence": inf.confidence,
                "confirmed": True,  # Pre-confirmed for demo dataset
            }

        # 7. Persist to database
        dataset = Dataset(
            id=dataset_id,
            user_id=user.id,
            name=DEMO_DATASET_NAME,
            description="Quarterly multi-category retail dataset across Indian hubs with verified lineage.",
            source_filename_sanitized="sample_retail_q3.csv",
            active_version_id=version_id,
            status="ready",
        )
        db.add(dataset)

        version = DatasetVersion(
            id=version_id,
            dataset_id=dataset_id,
            version_number=1,
            parquet_path=ingest_res.parquet_path,
            row_count=ingest_res.row_count,
            col_count=ingest_res.col_count,
            content_hash=ingest_res.content_hash,
            quality_score=profile_res.quality_score.score,
            label="Initial Ingestion",
        )
        db.add(version)

        mapping = ColumnMapping(
            id=str(uuid.uuid4()),
            version_id=version_id,
            mapping=mapping_dict,
        )
        db.add(mapping)

        quality_report = QualityReport(
            id=str(uuid.uuid4()),
            version_id=version_id,
            score=profile_res.quality_score.score,
            components={
                "completeness": profile_res.quality_score.completeness,
                "consistency": profile_res.quality_score.consistency,
                "validity": profile_res.quality_score.validity,
                "anomaly_freedom": profile_res.quality_score.anomaly_freedom,
            },
            issues=profile_res.issues,
            formula_version="v1.0",
        )
        db.add(quality_report)

        db.commit()
        logger.info(
            "Successfully seeded demo dataset '%s' (ID: %s, Rows: %d, Quality: %.1f%%)",
            DEMO_DATASET_NAME,
            dataset_id,
            ingest_res.row_count,
            profile_res.quality_score.score,
        )
        return dataset_id

    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_demo_dataset()
