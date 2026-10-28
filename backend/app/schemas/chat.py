"""BizLens Chat & Ask BizLens Pydantic Schemas."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ChatMessageBlock(BaseModel):
    tag: str = Field(..., description="CALCULATED FACT | INTERPRETATION | RECOMMENDATION | NOTICE")
    content: str
    fact_ids: List[str] = Field(default_factory=list)
    lineage_ref: Optional[str] = None


class ShowYourWorkMetadata(BaseModel):
    fact_set: List[Dict[str, Any]] = Field(default_factory=list)
    engine_query_ms: float = 0.0
    guardrail_result: Dict[str, Any] = Field(default_factory=dict)
    model_used: str = "Deterministic Local Engine"
    context_mode: str = "current_dataset"
    pii_detected: bool = False
    pii_warning: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str  # user, assistant, system
    blocks: List[ChatMessageBlock]
    operation: Optional[Dict[str, Any]] = None
    evidence_refs: List[Any] = Field(default_factory=list)
    show_your_work: Optional[ShowYourWorkMetadata] = None
    created_at: str


class ChatSessionSummary(BaseModel):
    id: str
    title: str
    context_type: str
    dataset_ref: Optional[str] = None
    created_at: str
    updated_at: str
    messages_count: int = 0


class ChatSessionDetail(ChatSessionSummary):
    messages: List[ChatMessageResponse] = Field(default_factory=list)


class ChatSessionCreateRequest(BaseModel):
    title: Optional[str] = "New Conversation"
    context_type: str = "current_dataset"
    dataset_ref: Optional[str] = None


class AskBizLensRequest(BaseModel):
    session_id: Optional[str] = None
    query: str
    context_mode: str = "current_dataset"  # current_dataset, general, auto
    dataset_id: Optional[str] = None
    api_key: Optional[str] = None


class SuggestedPrompt(BaseModel):
    id: str
    prompt: str
    category: str
    context_type: str = "current_dataset"
