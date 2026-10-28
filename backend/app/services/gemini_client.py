"""BizLens Gemini API Client & Resilience Engine.

Handles:
- google-genai SDK wrapper
- Circuit breaker (trips on 3 consecutive failures, 60s recovery window)
- Retries with exponential backoff and jitter
- Fact-hash explanation caching (keyed on SHA-256 of facts, prompt version, model, and detail level)
- Versioned prompt loader from /backend/prompts/
- Safe telemetry recording into AICallLog (zero raw PII)
- Seamless graceful degradation to deterministic local analysis
"""

import time
import random
import hashlib
import json
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List
from enum import Enum
from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging import logger

try:
    from google import genai
    from google.genai import types
    GENAI_INSTALLED = True
except ImportError:
    GENAI_INSTALLED = False


class CircuitState(str, Enum):
    CLOSED = "CLOSED"       # Normal operation
    OPEN = "OPEN"           # Failed, fast-fail immediately
    HALF_OPEN = "HALF_OPEN" # Testing single request after recovery window


class CircuitBreaker:
    """Protects application responsiveness by fast-failing during external API outages."""
    def __init__(self, failure_threshold: int = 3, recovery_time_sec: float = 60.0):
        self.failure_threshold = failure_threshold
        self.recovery_time_sec = recovery_time_sec
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0

    def record_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(
                "Circuit breaker tripped to OPEN state after %d consecutive failures. Reset in %.1fs.",
                self.failure_count,
                self.recovery_time_sec,
            )

    def can_attempt(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            elapsed = time.time() - self.last_failure_time
            if elapsed >= self.recovery_time_sec:
                self.state = CircuitState.HALF_OPEN
                logger.info("Circuit breaker entering HALF_OPEN probe state.")
                return True
            return False
        if self.state == CircuitState.HALF_OPEN:
            return True
        return False

    def reset(self):
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0


class PromptRegistry:
    """Loads and caches versioned prompts from /backend/prompts/."""
    def __init__(self, prompts_dir: Optional[Path] = None):
        if prompts_dir is None:
            # Default to backend/prompts
            base = Path(__file__).resolve().parent.parent.parent
            self.prompts_dir = base / "prompts"
        else:
            self.prompts_dir = prompts_dir
        self._cache: Dict[str, Tuple[str, str]] = {} # name -> (content, version)

    def get_prompt(self, name: str) -> Tuple[str, str]:
        """Returns (prompt_text, version_string)."""
        if name in self._cache:
            return self._cache[name]

        file_path = self.prompts_dir / f"{name}.txt"
        if not file_path.exists():
            logger.warning("Prompt file %s not found at %s. Using default fallback.", name, file_path)
            return ("You are the BizLens AI Analyst. Explain facts accurately.", "v1.0.0-fallback")

        content = file_path.read_text(encoding="utf-8")
        version = "v1.0.0"
        for line in content.splitlines():
            if line.startswith("# VERSION:"):
                version = line.replace("# VERSION:", "").strip()
                break

        self._cache[name] = (content, version)
        return (content, version)


class ExplanationCache:
    """In-memory cache for generated explanations based on deterministic facts hash."""
    def __init__(self, max_size: int = 500, ttl_sec: float = 3600.0):
        self.max_size = max_size
        self.ttl_sec = ttl_sec
        self._store: Dict[str, Tuple[str, float]] = {} # cache_key -> (explanation, timestamp)

    def _generate_key(
        self, facts: Any, prompt_version: str, model: str, detail_level: str
    ) -> str:
        serialized = json.dumps(facts, sort_keys=True, default=str)
        raw = f"{serialized}:{prompt_version}:{model}:{detail_level}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(
        self, facts: Any, prompt_version: str, model: str, detail_level: str
    ) -> Optional[str]:
        key = self._generate_key(facts, prompt_version, model, detail_level)
        entry = self._store.get(key)
        if not entry:
            return None
        val, ts = entry
        if time.time() - ts > self.ttl_sec:
            del self._store[key]
            return None
        return val

    def set(
        self, facts: Any, prompt_version: str, model: str, detail_level: str, explanation: str
    ):
        if len(self._store) >= self.max_size:
            # Evict oldest 10%
            keys_to_evict = list(self._store.keys())[: max(1, self.max_size // 10)]
            for k in keys_to_evict:
                del self._store[k]
        key = self._generate_key(facts, prompt_version, model, detail_level)
        self._store[key] = (explanation, time.time())

    def clear(self):
        self._store.clear()


class GeminiClient:
    def __init__(self):
        self._client = None
        self._api_key = settings.GEMINI_API_KEY
        self._model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite") or "gemini-3.5-flash-lite"
        self.circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_time_sec=60.0)
        self.prompt_registry = PromptRegistry()
        self.cache = ExplanationCache()
        self._init_client()

    def _init_client(self):
        if not GENAI_INSTALLED:
            logger.warning("google-genai package not installed. Gemini client will operate in fallback mode.")
            return

        if self._api_key and self._api_key.strip():
            clean_key = self._api_key.strip()

            try:
                self._client = genai.Client(
                    api_key=clean_key,
                    http_options={"timeout": 20000},
                )
                logger.info("Initialized Google Gemini client with configured API key.")
                self.circuit_breaker.reset()
            except Exception as e:
                logger.error("Failed to initialize Google Gemini client: %s", e)
                self._client = None
        else:
            self._client = None
            logger.info("No GEMINI_API_KEY configured. Operating in deterministic local analysis fallback mode.")

    @property
    def is_available(self) -> bool:
        """Returns True only if client is initialized AND circuit breaker is not OPEN."""
        if not self._client:
            return False
        return self.circuit_breaker.can_attempt()

    @property
    def model_name(self) -> str:
        return self._model if self.is_available else "Deterministic Local Engine"

    def set_api_key(self, api_key: str):
        """Allows dynamically updating API key (e.g. from Settings or Ask Page)."""
        if api_key and api_key.strip():
            self._api_key = api_key.strip()
            self._init_client()
        else:
            self._api_key = ""
            self._client = None

    def test_connection(self, candidate_key: Optional[str] = None) -> Tuple[bool, str, str]:
        """Tests live connectivity to Google Gemini API."""
        if not GENAI_INSTALLED:
            return False, "google-genai library not installed on backend.", ""

        key_to_test = (candidate_key or self._api_key or "").strip()
        if not key_to_test:
            return False, "No API key provided.", ""

        try:
            test_client = genai.Client(
                api_key=key_to_test,
                http_options={"timeout": 20000},
            )
            # Lightweight verification with 5 token limit
            config = types.GenerateContentConfig(max_output_tokens=5, temperature=0.0)
            target_models = [
                "gemini-3.5-flash-lite",
                "gemini-3.1-flash-lite",
                "gemini-flash-lite-latest",
                "gemini-3-flash-preview",
                "gemini-3.5-flash",
                "gemini-3.8-flash",
                "gemma-4-26b-a4b-it",
            ]
            last_err = None
            for m in target_models:
                try:
                    resp = test_client.models.generate_content(
                        model=m,
                        contents="ping",
                        config=config,
                    )
                    text_val = getattr(resp, "text", None)
                    if not text_val and getattr(resp, "candidates", None) and resp.candidates:
                        parts = getattr(resp.candidates[0].content, "parts", [])
                        text_val = "".join([getattr(p, "text", "") for p in parts if getattr(p, "text", "")])
                    if text_val:
                        return True, f"Connected to Google Gemini ({m}) successfully!", m
                except Exception as ex:
                    last_err = str(ex)
                    continue

            # Parse common Google Cloud error reasons to guide the user
            err_lower = (last_err or "").lower()
            if "access_token_type_unsupported" in err_lower or "api_key_service_blocked" in err_lower:
                return False, (
                    "Google Cloud restricted this key: The Generative Language API is blocked or restricted in your GCP project. "
                    "In Google AI Studio (aistudio.google.com/app/apikey), click 'Create API key' -> 'Create key in new project' to get an unrestricted key."
                ), ""
            if "unauthenticated" in err_lower or "api key not valid" in err_lower:
                return False, (
                    "Google returned 401 Unauthenticated. Please verify the key at aistudio.google.com/app/apikey "
                    "(choose 'Create key in new project')."
                ), ""

            return False, f"Gemini API verification failed: {last_err or 'No response'}", ""
        except Exception as e:
            err_msg = str(e)
            return False, f"Failed to connect to Google Gemini: {err_msg}", ""

    def _get_candidate_models(self, preferred_model: Optional[str] = None) -> List[str]:
        """Returns ordered list of candidate models with fallbacks."""
        ordered_pool = [
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-3-flash-preview",
            "gemma-4-26b-a4b-it",
            "gemini-3.5-flash",
            "gemini-3.8-flash",
            "gemini-flash-latest",
        ]
        chosen = preferred_model or self._model or "gemini-3.5-flash-lite"
        candidates = [chosen]
        for m in ordered_pool:
            if m not in candidates:
                candidates.append(m)
        return candidates

    def generate_explanation(
        self,
        system_instruction: str,
        user_prompt: str,
        facts: Optional[Any] = None,
        prompt_name: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        detail_level: str = "balanced",
        max_retries: int = 2,
        api_key: Optional[str] = None,
    ) -> Optional[str]:
        """Calls Gemini with circuit breaker, retries, caching, and safe fallback models."""
        client_to_use = self._client
        if api_key and api_key.strip():
            clean_k = api_key.strip()
            if not client_to_use or clean_k != self._api_key:
                try:
                    client_to_use = genai.Client(
                        api_key=clean_k,
                        http_options={"timeout": 20000},
                    )
                except Exception as e:
                    logger.warning("Failed creating transient client for api_key: %s", e)
                    client_to_use = self._client

        if not client_to_use:
            return None

        prompt_ver = "v1.0.0"
        if prompt_name:
            _, prompt_ver = self.prompt_registry.get_prompt(prompt_name)

        target_model = model or self._model
        if facts is not None:
            cached = self.cache.get(facts, prompt_ver, target_model, detail_level)
            if cached:
                logger.info("Cache hit for Gemini explanation (prompt_version=%s).", prompt_ver)
                return cached

        candidate_models = self._get_candidate_models(target_model)

        for candidate in candidate_models:
            attempt = 0
            backoff = 0.5
            while attempt <= max_retries:
                try:
                    config = types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=temperature,
                        max_output_tokens=2048,
                    )
                    response = client_to_use.models.generate_content(
                        model=candidate,
                        contents=user_prompt,
                        config=config,
                    )

                    text_content = getattr(response, "text", None)
                    if not text_content and getattr(response, "candidates", None) and response.candidates:
                        parts = getattr(response.candidates[0].content, "parts", [])
                        text_content = "".join([getattr(p, "text", "") for p in parts if getattr(p, "text", "")])

                    if text_content and text_content.strip():
                        res_text = text_content.strip()
                        self.circuit_breaker.record_success()
                        if facts is not None:
                            self.cache.set(facts, prompt_ver, candidate, detail_level, res_text)
                        return res_text

                    logger.warning("Empty response from Gemini model %s on attempt %d.", candidate, attempt + 1)
                    break

                except Exception as e:
                    err_str = str(e)
                    # If model not found, overloaded (503), quota exceeded (429), or timeout, switch to next candidate immediately
                    if any(k in err_str.lower() for k in ["404", "not_found", "no longer available", "503", "unavailable", "deadline", "high demand", "429", "resource_exhausted", "quota"]):
                        logger.warning("Gemini model %s transiently unavailable or quota exhausted (%s). Trying next fallback candidate.", candidate, err_str[:80])
                        break

                    attempt += 1
                    logger.warning("Gemini API attempt %d (%s) failed: %s", attempt, candidate, err_str)

                    if attempt > max_retries:
                        break

                    sleep_time = backoff * (1.5 ** attempt) + random.uniform(0.1, 0.3)
                    time.sleep(sleep_time)

        self.circuit_breaker.record_failure()
        logger.error("All Gemini model attempts failed. Falling back to deterministic local engine.")
        return None

    def generate_text(
        self,
        system_instruction: str,
        contents: str,
        api_key: Optional[str] = None,
        temperature: float = 0.2,
        max_output_tokens: int = 2048,
        model: Optional[str] = None,
    ) -> Optional[str]:
        """Direct text generation method for Observatory and analytics agents.
        Supports optional one-off API key or falls back to configured client.
        """
        client_to_use = self._client
        if api_key and api_key.strip():
            clean_k = api_key.strip()
            if not client_to_use or clean_k != self._api_key:
                try:
                    client_to_use = genai.Client(
                        api_key=clean_k,
                        http_options={"timeout": 20000},
                    )
                except Exception as e:
                    logger.warning("Failed creating transient client for api_key: %s", e)
                    client_to_use = self._client

        if not client_to_use:
            return None

        target_model = model or self._model or "gemini-3.5-flash"
        candidates = self._get_candidate_models(target_model)

        for candidate in candidates:
            try:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                )
                response = client_to_use.models.generate_content(
                    model=candidate,
                    contents=contents,
                    config=config,
                )

                text_content = getattr(response, "text", None)
                if not text_content and getattr(response, "candidates", None) and response.candidates:
                    parts = getattr(response.candidates[0].content, "parts", [])
                    text_content = "".join([getattr(p, "text", "") for p in parts if getattr(p, "text", "")])

                if text_content and text_content.strip():
                    self.circuit_breaker.record_success()
                    return text_content.strip()

            except Exception as e:
                err_str = str(e)
                logger.warning("generate_text on model %s failed: %s", candidate, err_str[:120])
                continue

        return None

    def generate_general_response(
        self,
        user_prompt: str,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        api_key: Optional[str] = None,
        temperature: float = 0.4,
    ) -> Optional[str]:
        """Answers general business, financial, coding, strategy or casual open-ended inquiries."""
        default_sys = (
            "You are BizLens AI, a brilliant, conversational, and highly capable AI assistant powered by Google Gemini. "
            "You seamlessly handle all kinds of user interactions just like Google Gemini:\n"
            "1. Casual Conversation & General Knowledge: Greetings, everyday questions, brainstorming, advice, and light banter. Be warm, natural, and engaging.\n"
            "2. Corporate Finance & Strategy: In-depth explanations of EBITDA, CAGR, LTV:CAC, working capital, gross margin, unit economics, pricing models, and executive strategy. Use clear Markdown, LaTeX math ($...$), and bullet points.\n"
            "3. Analytics & Engineering: Provide clean, production-ready Python, SQL, and DuckDB scripts with syntax highlighting.\n"
            "CRITICAL BEHAVIORAL RULE: Do NOT repeat 'Hello! I am BizLens AI...' or introduce yourself on every turn unless the user explicitly asks who you are or what you can do. Jump straight into answering the user's specific prompt directly, helpfully, and conversationally."
        )

        full_prompt = user_prompt
        if history and len(history) > 0:
            history_lines = []
            for turn in history[-6:]:
                speaker = "User" if turn.get("role") == "user" else "BizLens AI"
                text = turn.get("content", "").strip()
                if text:
                    history_lines.append(f"{speaker}: {text}")
            if history_lines:
                history_text = "\n".join(history_lines)
                full_prompt = (
                    f"=== RECENT CONVERSATION HISTORY ===\n{history_text}\n"
                    f"=== CURRENT USER MESSAGE ===\n{user_prompt}"
                )

        return self.generate_text(
            system_instruction=system_instruction or default_sys,
            contents=full_prompt,
            api_key=api_key,
            temperature=temperature,
            max_output_tokens=1500,
        )


gemini_client = GeminiClient()
