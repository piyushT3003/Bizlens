"""BizLens Chat & Ask BizLens API endpoints.

Includes:
- Chat session CRUD (list, create, detail, rename, delete)
- Real-time Server-Sent Events (SSE) streaming (/chat/sessions/{id}/stream and /chat/stream)
- Synchronous fallback Ask endpoint (/chat/ask)
- Context-aware question suggestion generator (/chat/suggested-prompts)
- AI consent gate (/chat/consent)
"""

import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Generator
from pathlib import Path
from fastapi import APIRouter, Depends, Query, status, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError
from app.core.logging import logger
from app.db.session import get_db
from app.db.models import User, UserSetting, Dataset, DatasetVersion, ColumnMapping, ChatSession, ChatMessage
from app.api.v1.datasets import get_current_user
from app.services.ai_orchestrator import ai_orchestrator
from app.schemas.chat import (
    AskBizLensRequest,
    ChatMessageResponse,
    ChatMessageBlock,
    ChatSessionSummary,
    ChatSessionDetail,
    ChatSessionCreateRequest,
    SuggestedPrompt,
    ShowYourWorkMetadata,
)

router = APIRouter(prefix="/chat", tags=["chat"])


# =========================================================================
# 1. CONSENT GATE
# =========================================================================

@router.get("/consent")
def get_ai_consent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check whether the user has granted consent for Gemini AI aggregate transmission."""
    settings = current_user.settings
    has_consent = settings is not None and settings.gemini_consent_at is not None
    return {
        "consented": has_consent,
        "consent_at": settings.gemini_consent_at.isoformat() if has_consent else None,
    }


@router.post("/consent")
def grant_ai_consent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record user consent to send anonymous aggregate metrics to Google Gemini API."""
    settings = current_user.settings
    if not settings:
        settings = UserSetting(user_id=current_user.id)
        db.add(settings)

    settings.gemini_consent_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(settings)

    return {
        "consented": True,
        "consent_at": settings.gemini_consent_at.isoformat(),
        "message": "AI aggregate sharing consent recorded successfully.",
    }


# =========================================================================
# 2. SESSION CRUD & MANAGEMENT
# =========================================================================

@router.get("/sessions", response_model=List[ChatSessionSummary])
def list_chat_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all chat sessions for the current user."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )

    result: List[ChatSessionSummary] = []
    for s in sessions:
        msg_count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        result.append(
            ChatSessionSummary(
                id=s.id,
                title=s.title,
                context_type=s.context_type,
                dataset_ref=s.dataset_ref,
                created_at=s.created_at.isoformat(),
                updated_at=s.updated_at.isoformat(),
                messages_count=msg_count,
            )
        )
    return result


@router.post("/sessions", response_model=ChatSessionDetail, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    payload: ChatSessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new conversational session."""
    session = ChatSession(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=payload.title or "New Conversation",
        context_type=payload.context_type,
        dataset_ref=payload.dataset_ref,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return ChatSessionDetail(
        id=session.id,
        title=session.title,
        context_type=session.context_type,
        dataset_ref=session.dataset_ref,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
        messages_count=0,
        messages=[],
    )


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
def get_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch complete session history with tagged message blocks."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise NotFoundError(f"Chat session '{session_id}' not found.")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    msg_responses = [
        ChatMessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            blocks=[ChatMessageBlock(**b) for b in (m.blocks or [])],
            operation=m.operation,
            evidence_refs=m.evidence_refs or [],
            show_your_work=ShowYourWorkMetadata(**m.operation.get("show_your_work")) if m.operation and "show_your_work" in m.operation else None,
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]

    return ChatSessionDetail(
        id=session.id,
        title=session.title,
        context_type=session.context_type,
        dataset_ref=session.dataset_ref,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
        messages_count=len(msg_responses),
        messages=msg_responses,
    )


@router.patch("/sessions/{session_id}")
def rename_chat_session(
    session_id: str,
    payload: Dict[str, str] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rename conversation session title."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise NotFoundError(f"Chat session '{session_id}' not found.")

    new_title = payload.get("title", "").strip()
    if not new_title:
        raise ValidationError("Title cannot be empty.")

    session.title = new_title
    db.commit()
    db.refresh(session)

    return {"id": session.id, "title": session.title, "message": "Session renamed successfully"}


@router.delete("/sessions/{session_id}")
def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a conversation session."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise NotFoundError(f"Chat session '{session_id}' not found.")

    db.delete(session)
    db.commit()
    return {"message": "Session deleted successfully"}


# =========================================================================
# 3. SUGGESTED PROMPTS
# =========================================================================

@router.get("/suggested-prompts", response_model=List[SuggestedPrompt])
def get_suggested_prompts(
    dataset_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get context-aware question suggestions tailored to the active dataset schema."""
    role_to_col: Dict[str, str] = {}
    dataset_query = db.query(Dataset).filter(
        Dataset.user_id == current_user.id, Dataset.deleted_at.is_(None)
    )

    if dataset_id and dataset_id != "demo":
        dataset = dataset_query.filter(Dataset.id == dataset_id).first()
    else:
        dataset = dataset_query.order_by(Dataset.updated_at.desc()).first()

    if dataset and dataset.active_version_id:
        mapping_record = (
            db.query(ColumnMapping)
            .filter(ColumnMapping.version_id == dataset.active_version_id)
            .first()
        )
        if mapping_record and mapping_record.mapping:
            for col_name, item in mapping_record.mapping.items():
                if isinstance(item, dict):
                    role = item.get("role")
                    if role and role != "ignore":
                        role_to_col[role] = col_name

    return ai_orchestrator.get_suggested_prompts(role_to_col)


# =========================================================================
# 4. ASK BIZLENS (SYNCHRONOUS & SSE STREAMING)
# =========================================================================

def _resolve_parquet_path(raw_path: Optional[str]) -> Optional[Path]:
    """Resolves parquet path handling absolute paths, backend-relative, and storage-relative paths."""
    if not raw_path:
        return None
    p = Path(raw_path)
    if p.is_file():
        return p.resolve()
    for prefix in [Path("backend"), Path(".."), Path("."), Path("backend/storage"), Path("storage")]:
        cand = (prefix / p).resolve()
        if cand.is_file():
            return cand
    # Try by filename in backend/storage
    for base in [Path("backend/storage"), Path("storage")]:
        if base.exists():
            matched = list(base.glob(f"**/{p.name}"))
            if matched and matched[0].is_file():
                return matched[0].resolve()
    return None


def _resolve_dataset_context(
    db: Session,
    user_id: str,
    dataset_id: Optional[str],
) -> Tuple[Optional[Path], Dict[str, str], str, int, str, List[str], Dict[str, str], str]:
    """Helper to resolve parquet path and column mapping for active dataset version."""
    parquet_path: Optional[Path] = None
    role_to_col: Dict[str, str] = {}
    content_hash = ""
    version_num = 1
    ds_id = ""
    available_columns: List[str] = []
    col_to_role: Dict[str, str] = {}
    ds_name = ""

    dataset_query = db.query(Dataset).filter(
        Dataset.user_id == user_id, Dataset.deleted_at.is_(None)
    )
    target_ds = None
    is_explicit = bool(dataset_id and dataset_id != "demo")
    if is_explicit:
        target_ds = dataset_query.filter(Dataset.id == dataset_id).first()
        if not target_ds:
            d_lower = dataset_id.lower()
            if "retail" in d_lower or d_lower == "ds-retail-q3":
                target_ds = dataset_query.filter(Dataset.name.ilike("%retail%")).first()
            elif "saas" in d_lower or d_lower == "ds-saas-cloud":
                target_ds = dataset_query.filter(Dataset.name.ilike("%saas%")).first()
            elif "hardware" in d_lower or "tech" in d_lower or d_lower == "ds-tech-hardware":
                target_ds = dataset_query.filter(Dataset.name.ilike("%hardware%")).first() or dataset_query.filter(Dataset.name.ilike("%tech%")).first()
            elif "superstore" in d_lower:
                target_ds = dataset_query.filter(Dataset.name.ilike("%superstore%")).first()
            elif "adventure" in d_lower:
                target_ds = dataset_query.filter(Dataset.name.ilike("%adventure%")).first()

    if not target_ds:
        target_ds = dataset_query.order_by(Dataset.updated_at.desc()).first()

    # Resolve active version parquet path
    if target_ds and target_ds.active_version_id:
        v_check = (
            db.query(DatasetVersion)
            .filter(DatasetVersion.id == target_ds.active_version_id)
            .first()
        )
        resolved_p = _resolve_parquet_path(v_check.parquet_path) if v_check else None

        # Only switch to alternative candidate if dataset was NOT explicitly requested
        if not resolved_p and not is_explicit:
            for candidate in dataset_query.all():
                if candidate.active_version_id:
                    cand_v = db.query(DatasetVersion).filter(DatasetVersion.id == candidate.active_version_id).first()
                    cand_p = _resolve_parquet_path(cand_v.parquet_path) if cand_v else None
                    if cand_p:
                        target_ds = candidate
                        resolved_p = cand_p
                        break

        if target_ds and target_ds.active_version_id:
            ds_id = target_ds.id
            ds_name = target_ds.name
            version = (
                db.query(DatasetVersion)
                .filter(DatasetVersion.id == target_ds.active_version_id)
                .first()
            )
            if resolved_p:
                parquet_path = resolved_p
                content_hash = version.content_hash if version else ""
                version_num = version.version_number if version else 1

        mapping_record = (
            db.query(ColumnMapping)
            .filter(ColumnMapping.version_id == target_ds.active_version_id)
            .first()
        )
        if mapping_record and mapping_record.mapping:
            for col_name, item in mapping_record.mapping.items():
                available_columns.append(col_name)
                if isinstance(item, dict):
                    role = item.get("role")
                    if role and role != "ignore":
                        col_to_role[col_name] = role

            # Intelligent role_to_col mapping with prioritized scoring
            for role in ["category", "product", "customer", "region", "revenue", "cost", "date", "quantity", "margin", "discount", "id"]:
                candidates = [c for c, r in col_to_role.items() if r == role]
                if not candidates:
                    continue
                if len(candidates) == 1:
                    role_to_col[role] = candidates[0]
                else:
                    if role == "category":
                        best = sorted(candidates, key=lambda c: (
                            0 if c.lower() in ("category", "productcategory", "product_category") else
                            1 if "cat" in c.lower() else
                            2 if "dept" in c.lower() else
                            3
                        ))[0]
                        role_to_col[role] = best
                    elif role == "product":
                        best = sorted(candidates, key=lambda c: (
                            0 if any(k in c.lower() for k in ("name", "title", "desc")) else
                            1 if not any(k in c.lower() for k in ("id", "key", "sku", "code")) else
                            2
                        ))[0]
                        role_to_col[role] = best
                    elif role == "customer":
                        best = sorted(candidates, key=lambda c: (
                            0 if "name" in c.lower() else
                            1 if not any(k in c.lower() for k in ("id", "key")) else
                            2
                        ))[0]
                        role_to_col[role] = best
                    elif role == "region":
                        best = sorted(candidates, key=lambda c: (
                            0 if c.lower() == "region" else
                            1 if "state" in c.lower() else
                            2 if "city" in c.lower() else
                            3
                        ))[0]
                        role_to_col[role] = best
                    elif role == "revenue":
                        best = sorted(candidates, key=lambda c: (
                            0 if any(k in c.lower() for k in ("sales", "revenue", "amount", "total")) else
                            1
                        ))[0]
                        role_to_col[role] = best
                    else:
                        role_to_col[role] = candidates[0]

    return parquet_path, role_to_col, content_hash, version_num, ds_id, available_columns, col_to_role, ds_name



@router.post("/ask", response_model=ChatMessageResponse)
def ask_bizlens(
    payload: AskBizLensRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ask BizLens: Synchronous natural language question answered with deterministic facts and AI explanation."""
    if not payload.query or not payload.query.strip():
        raise ValidationError("Query cannot be empty.")

    # 1. Resolve or create chat session
    session: Optional[ChatSession] = None
    if payload.session_id:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == payload.session_id, ChatSession.user_id == current_user.id)
            .first()
        )

    if not session:
        session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            title=payload.query[:60] if len(payload.query) > 60 else payload.query,
            context_type=payload.context_mode,
            dataset_ref=payload.dataset_id,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 2. Record User Message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session.id,
        role="user",
        blocks=[{"tag": "USER_QUERY", "content": payload.query, "fact_ids": []}],
        operation={},
        evidence_refs=[],
    )
    db.add(user_msg)
    db.commit()

    # Dynamic API key resolution (payload key -> user vault key)
    if payload.api_key and payload.api_key.strip():
        gemini_client.set_api_key(payload.api_key.strip())
    elif current_user.settings and current_user.settings.own_api_key_encrypted:
        from app.services.settings_service import decrypt_secret
        decrypted_key = decrypt_secret(current_user.settings.own_api_key_encrypted)
        if decrypted_key:
            gemini_client.set_api_key(decrypted_key)

    # 3. Resolve Dataset & Column Mapping
    parquet_path, role_to_col, content_hash, version_num, ds_id, available_columns, col_to_role, ds_name = (
        _resolve_dataset_context(db, current_user.id, payload.dataset_id)
        if payload.context_mode != "general"
        else (None, {}, "", 1, "", [], {}, "")
    )

    # 4. Extract recent conversation history for multi-turn awareness
    history = []
    if session:
        prior_msgs = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(6)
            .all()
        )
        prior_msgs.reverse()
        for m in prior_msgs:
            if m.id != user_msg.id:
                txt = " ".join([b.get("content", "") for b in m.blocks if isinstance(b, dict)])
                if txt.strip():
                    history.append({"role": m.role, "content": txt.strip()})

    # 5. Orchestrate calculation, AI synthesis, and guardrail verification
    blocks, show_your_work = ai_orchestrator.ask(
        query=payload.query,
        parquet_path=parquet_path,
        role_to_col=role_to_col,
        dataset_id=ds_id,
        version_number=version_num,
        content_hash=content_hash,
        context_mode=payload.context_mode,
        history=history,
        api_key=payload.api_key,
        available_columns=available_columns,
        col_to_role=col_to_role,
        dataset_name=ds_name,
    )


    blocks_dict = [b.model_dump() for b in blocks]
    syw_dict = show_your_work.model_dump()

    # 5. Record Assistant Message in DB
    assistant_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session.id,
        role="assistant",
        blocks=blocks_dict,
        operation={"show_your_work": syw_dict},
        evidence_refs=[f["id"] for f in show_your_work.fact_set],
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return ChatMessageResponse(
        id=assistant_msg.id,
        session_id=session.id,
        role="assistant",
        blocks=blocks,
        operation=assistant_msg.operation,
        evidence_refs=assistant_msg.evidence_refs,
        show_your_work=show_your_work,
        created_at=assistant_msg.created_at.isoformat(),
    )


@router.post("/sessions/{session_id}/stream")
def stream_ask_bizlens(
    session_id: str,
    payload: AskBizLensRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Server-Sent Events (SSE) streaming endpoint for live progress and token-by-token answer reveal."""
    if not payload.query or not payload.query.strip():
        raise ValidationError("Query cannot be empty.")

    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        session = ChatSession(
            id=session_id,
            user_id=current_user.id,
            title=payload.query[:60] if len(payload.query) > 60 else payload.query,
            context_type=payload.context_mode,
            dataset_ref=payload.dataset_id,
        )
        db.add(session)
        db.commit()

    # Record User Message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session.id,
        role="user",
        blocks=[{"tag": "USER_QUERY", "content": payload.query, "fact_ids": []}],
        operation={},
        evidence_refs=[],
    )
    db.add(user_msg)
    db.commit()

    # Dynamic API key resolution (payload key -> user vault key)
    if payload.api_key and payload.api_key.strip():
        gemini_client.set_api_key(payload.api_key.strip())
    elif current_user.settings and current_user.settings.own_api_key_encrypted:
        from app.services.settings_service import decrypt_secret
        decrypted_key = decrypt_secret(current_user.settings.own_api_key_encrypted)
        if decrypted_key:
            gemini_client.set_api_key(decrypted_key)

    parquet_path, role_to_col, content_hash, version_num, ds_id, available_columns, col_to_role, ds_name = (
        _resolve_dataset_context(db, current_user.id, payload.dataset_id)
        if payload.context_mode != "general"
        else (None, {}, "", 1, "", [], {}, "")
    )

    # Extract prior conversation history for multi-turn conversational awareness
    history = []
    prior_msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(6)
        .all()
    )
    prior_msgs.reverse()
    for m in prior_msgs:
        if m.id != user_msg.id:
            txt = " ".join([b.get("content", "") for b in m.blocks if isinstance(b, dict)])
            if txt.strip():
                history.append({"role": m.role, "content": txt.strip()})

    def sse_event_generator() -> Generator[str, None, None]:
        captured_blocks: List[Any] = []
        captured_metadata: Optional[Dict[str, Any]] = None

        for event in ai_orchestrator.ask_stream(
            query=payload.query,
            parquet_path=parquet_path,
            role_to_col=role_to_col,
            dataset_id=ds_id,
            version_number=version_num,
            content_hash=content_hash,
            context_mode=payload.context_mode,
            history=history,
            api_key=payload.api_key,
            available_columns=available_columns,
            col_to_role=col_to_role,
            dataset_name=ds_name,
        ):

            ev_name = event["event"]
            ev_data = event["data"]

            if ev_name == "blocks":
                captured_blocks = ev_data
            elif ev_name == "metadata":
                captured_metadata = ev_data

            yield f"event: {ev_name}\ndata: {json.dumps(ev_data)}\n\n"

        # Save assistant message to DB after stream completes
        try:
            assistant_id = str(uuid.uuid4())
            assistant_msg = ChatMessage(
                id=assistant_id,
                session_id=session.id,
                role="assistant",
                blocks=captured_blocks,
                operation={"show_your_work": captured_metadata or {}},
                evidence_refs=[f["id"] for f in (captured_metadata.get("fact_set", []) if captured_metadata else [])],
            )
            db.add(assistant_msg)
            db.commit()
        except Exception as e:
            logger.error("Failed to persist streaming chat message: %s", e)

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
