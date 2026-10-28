# Security Policy & Threat Model (SECURITY.md)

## 1. Threat Model & Mitigations

| Attack Vector | Threat Level | Defense Strategy |
|---|---|---|
| **Malicious Uploads (Macros, Executables)** | Critical | Strict magic byte inspection, rejection of `.xlsm`, `.xlsb`, `.xltm`, and checking OOXML ZIP archives for `vbaProject.bin`. Files stored outside web root under UUID paths. |
| **OOXML Decompression Bombs** | High | Max decompressed size capped at 200 MB, max compression ratio capped at 10x before full extraction. Parsing performed under strict memory budget. |
| **Prompt Injection via Data / Headers** | High | User-controlled strings (column names, cell values) are enclosed in strict XML-style delimiters with explicit system instructions to treat content strictly as inert data. |
| **SSRF via Live Connectors** | High | Hardcoded host allowlist (`api.frankfurter.app`, `api.open-meteo.com`). Absolute prohibition of arbitrary HTTP requests or user-specified URLs. |
| **Formula Injection (CSV Export)** | Medium | Any cell value starting with `=`, `+`, `-`, `@`, `\t`, `\r` is escaped with a leading single quote `'` in all CSV downloads. |
| **Insecure Direct Object References (IDOR)** | Critical | Every database query explicitly filters by `user_id`. Automated negative permission tests verify cross-user isolation. |
| **Session Hijacking & Token Theft** | High | Refresh tokens stored with SHA-256 hashes in DB, rotated on use, and transmitted via `httpOnly`, `Secure`, `SameSite=Strict` cookies. |
| **PII Data Leakage** | High | Automatic regex and Verhoeff-checksum scanner flags Aadhaar, PAN, emails, and phone numbers during ingestion, allowing users to mask or exclude columns from AI contexts. |

---

## 2. Secrets Management
- No API keys or credentials committed to repository.
- User-provided Gemini API keys are encrypted at rest using AES-GCM before storage in `user_settings`.
- AI call logs strictly scrub raw user data and store only operation names, token counts, and cryptographic hashes of fact sets.
