import uuid
from app.db.models import User, UserSetting, Dataset, DatasetVersion, ColumnMapping


def test_user_and_settings_creation(db_session):
    user = User(
        email="analyst@bizlens.ai",
        password_hash="argon2id$mockhash",
        display_name="Senior Analyst",
    )
    db_session.add(user)
    db_session.flush()

    assert user.id is not None
    assert len(user.id) == 36  # UUID length
    assert user.status == "active"
    assert user.created_at is not None

    setting = UserSetting(
        user_id=user.id,
        theme="dark",
        currency="INR",
        number_grouping="lakh_crore",
    )
    db_session.add(setting)
    db_session.flush()

    assert setting.user_id == user.id
    assert setting.currency == "INR"


def test_dataset_versioning_and_mapping(db_session):
    user = User(
        email="data_lead@bizlens.ai",
        password_hash="mock",
        display_name="Data Lead",
    )
    db_session.add(user)
    db_session.flush()

    dataset = Dataset(
        user_id=user.id,
        name="Q3 Sales Dataset",
        source_filename_sanitized="q3_sales.csv",
    )
    db_session.add(dataset)
    db_session.flush()

    version = DatasetVersion(
        dataset_id=dataset.id,
        version_number=1,
        parquet_path="/storage/test.parquet",
        row_count=1000,
        col_count=10,
        content_hash="hash123",
        quality_score=95.5,
    )
    db_session.add(version)
    db_session.flush()

    mapping = ColumnMapping(
        version_id=version.id,
        mapping={
            "Sales": {"role": "revenue", "dtype": "float"},
            "City": {"role": "city", "dtype": "string"},
        },
    )
    db_session.add(mapping)
    db_session.flush()

    assert version.dataset.name == "Q3 Sales Dataset"
    assert version.column_mapping.mapping["Sales"]["role"] == "revenue"
