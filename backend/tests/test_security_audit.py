"""Security Policy & Threat Model Audit Suite (SECURITY.md).
Verifies defenses against:
1. Malicious macro uploads & executable extensions
2. OOXML decompression bombs & corrupt archives
3. Parquet magic byte integrity
4. Formula injection in CSV exports
5. PII pattern detection (Email, Phone, Aadhaar, Card)
6. Secret encryption & zero plaintext exposure in settings
"""

import io
import zipfile
from pathlib import Path
import pytest

from app.services.ingestion import validate_file_security, ingestion_engine
from app.services.report_generator import sanitize_csv_cell
from app.services.ai_orchestrator import detect_pii
from app.services.settings_service import (
    encrypt_secret,
    decrypt_secret,
    mask_secret,
)
from app.core.errors import BizLensError


def test_malicious_extensions_rejected(tmp_path: Path):
    """Rejects executable and macro extensions (.xlsm, .exe, .py, .sh)."""
    bad_files = [
        tmp_path / "invoice.xlsm",
        tmp_path / "script.py",
        tmp_path / "payload.exe",
        tmp_path / "run.sh",
        tmp_path / "macro.xlsb",
    ]
    for bf in bad_files:
        bf.write_text("dummy")
        with pytest.raises(BizLensError) as exc_info:
            validate_file_security(bf)
        assert exc_info.value.code == "MALICIOUS_FILE_TYPE"


def test_ooxml_vba_macro_rejected(tmp_path: Path):
    """Rejects OOXML archives containing embedded vbaProject.bin."""
    xlsx_macro = tmp_path / "orders_macro.xlsx"
    with zipfile.ZipFile(xlsx_macro, "w") as zf:
        zf.writestr("[Content_Types].xml", "<Types/>")
        zf.writestr("xl/workbook.xml", "<workbook/>")
        zf.writestr("xl/vbaProject.bin", b"\x00\x01\x02VBA_BIN_DATA")

    with pytest.raises(BizLensError) as exc_info:
        validate_file_security(xlsx_macro)
    assert exc_info.value.code == "MACRO_DETECTED"


def test_ooxml_decompression_bomb_rejected(tmp_path: Path):
    """Rejects archives that declare uncompressed size exceeding budget."""
    bomb_xlsx = tmp_path / "bomb.xlsx"
    with zipfile.ZipFile(bomb_xlsx, "w") as zf:
        zf.writestr("xl/worksheets/sheet1.xml", b"0" * 2000)

    with pytest.raises(BizLensError) as exc_info:
        validate_file_security(bomb_xlsx, max_decompressed_bytes=500)
    assert exc_info.value.code == "DECOMPRESSION_BOMB"


def test_parquet_magic_byte_verification(tmp_path: Path):
    """Verifies Parquet files must begin with b'PAR1'."""
    corrupt_parquet = tmp_path / "fake.parquet"
    corrupt_parquet.write_bytes(b"NOT_A_PARQUET_FILE")

    with pytest.raises(BizLensError) as exc_info:
        validate_file_security(corrupt_parquet)
    assert exc_info.value.code == "INVALID_PARQUET"

    valid_parquet = tmp_path / "valid.parquet"
    valid_parquet.write_bytes(b"PAR1" + b"\x00" * 20)
    # Should not raise
    validate_file_security(valid_parquet)


def test_csv_formula_injection_defense():
    """All cells starting with =, +, -, @, \\t, \\r are prefixed with a single quote."""
    assert sanitize_csv_cell("=1+1") == "'=1+1"
    assert sanitize_csv_cell("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert sanitize_csv_cell("-100") == "'-100"
    assert sanitize_csv_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert sanitize_csv_cell("\tTab") == "'\tTab"
    assert sanitize_csv_cell("\rReturn") == "'\rReturn"
    # Safe values remain untouched
    assert sanitize_csv_cell("Total Revenue") == "Total Revenue"
    assert sanitize_csv_cell("₹12,48,000") == "₹12,48,000"
    assert sanitize_csv_cell(None) == ""
    assert sanitize_csv_cell(42) == "42"


def test_pii_pattern_detection():
    """Validates regex and scanning for sensitive PII."""
    has_pii, msg = detect_pii("Contact me at user.name@domain.com for records.")
    assert has_pii is True
    assert "Email Address" in msg

    has_pii, msg = detect_pii("Customer phone is +91 9876543210 in Mumbai.")
    assert has_pii is True
    assert "Phone Number" in msg

    has_pii, msg = detect_pii("Resident Aadhaar: 1234 5678 9012 recorded.")
    assert has_pii is True
    assert "Aadhaar Number" in msg

    # Safe text
    has_pii, msg = detect_pii("Q3 Net Sales reached ₹14.8 Lakh across Bangalore.")
    assert has_pii is False
    assert msg is None


def test_secrets_encryption_and_masking():
    """Verifies AES/Fernet encryption, decryption, and key masking."""
    raw_key = "AIzaSyD-RandomMockApiKey123456789"
    cipher = encrypt_secret(raw_key)
    assert cipher != raw_key
    assert cipher.startswith("gAAAAA")

    decrypted = decrypt_secret(cipher)
    assert decrypted == raw_key

    # Masking test
    masked = mask_secret(raw_key)
    assert raw_key not in masked
    assert masked.startswith("AIzaSy")
    assert masked.endswith("6789")
    assert "****" in masked
