import json
import os
from typing import Any, Dict, List, Optional

from . import config
import logging

# Lazy-initialized globals
emb = None
client = None
col = None
init_error: Optional[str] = None
domain_patterns: Optional[Dict[str, Any]] = None


def _extract_gemini_response(resp) -> Dict[str, Any]:
    """Return a brief summary of a Gemini response without assuming text exists."""
    summary: Dict[str, Any] = {
        "response": "",
        "finish_reason": None,
        "safety": None,
    }
    try:
        data = resp.to_dict() if hasattr(resp, "to_dict") else None
    except Exception:
        data = None

    candidate: Dict[str, Any] = {}
    if isinstance(data, dict):
        candidates = data.get("candidates") or []
        if candidates:
            candidate = candidates[0] or {}
    finish_reason = candidate.get("finishReason")
    summary["finish_reason"] = finish_reason
    safety = candidate.get("safetyRatings")
    if safety:
        summary["safety"] = safety

    parts = ((candidate.get("content") or {}).get("parts") or []) if candidate else []
    texts: List[str] = []
    for part in parts:
        txt = part.get("text") if isinstance(part, dict) else None
        if txt:
            texts.append(txt)
    response_text = " ".join(texts).strip()

    if not response_text:
        try:
            response_text = (getattr(resp, "text", "") or "").strip()
        except Exception:
            response_text = ""

    if response_text:
        summary["response"] = response_text
    return summary


def llm_status(run_live: bool = False) -> Dict[str, Any]:
    """Return best-effort LLM diagnostics without failing the service."""
    status: Dict[str, Any] = {
        "provider": "none",
        "model": config.QU_MODEL,
        "use_llm_qu": config.USE_LLM_QU,
        "has_api_key": False,
        "imported": False,
        "ready": False,
        "live_check": None,
        "error": None,
    }

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        status["error"] = "Missing GEMINI_API_KEY"
        return status

    status["provider"] = "gemini"
    status["has_api_key"] = True

    try:
        import google.generativeai as genai

        status["imported"] = True
        ready = True
        if run_live:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(config.QU_MODEL or "gemini-1.5-flash")
                resp = model.generate_content(
    [{"text": "Simply reply with the word 'OK'."}],
    generation_config={"temperature": 0, "max_output_tokens": 3000},
)
                summary = _extract_gemini_response(resp)
                ok = bool(summary.get("response"))
                info: Dict[str, Any] = {
                    "ok": ok,
                    "response": (summary.get("response") or "")[:120],
                    "finish_reason": summary.get("finish_reason"),
                }
                if summary.get("safety") is not None:
                    info["safety"] = summary.get("safety")
                if not ok:
                    info["error"] = (
                        "LLM live check returned no text (finish_reason=%s)" % (summary.get("finish_reason") or "UNKNOWN")
                    )
                status["live_check"] = info
                if not ok and not status.get("error"):
                    status["error"] = info["error"]
            except Exception as live_err:
                ready = False
                msg = str(live_err)
                status["live_check"] = {"ok": False, "error": msg[:200]}
                status["error"] = msg
        status["ready"] = ready
    except Exception as import_err:
        status["imported"] = False
        status["ready"] = False
        status["error"] = str(import_err)
        logging.getLogger(__name__).exception("LLM diagnostics failed: %s", import_err)

    return status


def ensure_inited() -> bool:
    global emb, client, col, init_error
    if emb is not None and client is not None and col is not None:
        return True
    if init_error:
        return False
    try:
        from sentence_transformers import SentenceTransformer
        import chromadb
        os.makedirs(config.CHROMA_PATH, exist_ok=True)
        emb = SentenceTransformer(config.EMBEDDING_MODEL)
        client = chromadb.PersistentClient(path=config.CHROMA_PATH)
        col = client.get_or_create_collection("law_chunks", metadata={"hnsw:space": "cosine"})
        return True
    except Exception as e:
        init_error = str(e)
        logging.getLogger(__name__).exception("Initialization failed: %s", e)
        return False


def load_domain_patterns() -> None:
    """Load domain patterns JSON from multiple candidate paths.

    Preference order:
      1. DOMAIN_PATTERNS_PATH (env)
      2. ../domain_patterns.json (next to top-level app.py)
      3. ./domain_patterns.json (inside package, if provided)
      4. /app/domain_patterns.json (common path inside container)
      5. Walk the package directory to discover the file
    """
    global domain_patterns
    env_path = os.getenv("DOMAIN_PATTERNS_PATH")
    pkg_dir = os.path.dirname(__file__)
    parent_dir = os.path.dirname(pkg_dir)
    default_parent = os.path.join(parent_dir, "domain_patterns.json")
    default_pkg = os.path.join(pkg_dir, "domain_patterns.json")
    hardcoded_path = "/app/domain_patterns.json"
    candidates: List[str] = []
    if env_path:
        candidates.append(env_path)
    candidates.extend([default_parent, default_pkg, hardcoded_path])

    loaded = False
    last_err: Optional[Exception] = None
    for p in candidates:
        try:
            if os.path.isfile(p):
                with open(p, "r", encoding="utf-8-sig") as f:
                    domain_patterns = json.load(f)
                loaded = True
                if config.LLM_DEBUG:
                    logging.getLogger(__name__).info(
                        "DOMAIN_PATTERNS loaded path=%s concepts=%d",
                        p,
                        len(domain_patterns.get("concepts") or []),
                    )
                break
            else:
                if config.LLM_DEBUG:
                    logging.getLogger(__name__).info("DOMAIN_PATTERNS not found at path=%s", p)
        except Exception as e:
            last_err = e
            if config.LLM_DEBUG:
                logging.getLogger(__name__).info("DOMAIN_PATTERNS failed to load path=%s error=%s", p, str(e))

    if not loaded:
        # As a last resort, walk the package directory
        try:
            for root, _, files in os.walk(parent_dir):
                if "domain_patterns.json" in files:
                    p = os.path.join(root, "domain_patterns.json")
                    with open(p, "r", encoding="utf-8-sig") as f:
                        domain_patterns = json.load(f)
                    loaded = True
                    if config.LLM_DEBUG:
                        logging.getLogger(__name__).info(
                            "DOMAIN_PATTERNS discovered path=%s concepts=%d",
                            p,
                            len(domain_patterns.get("concepts") or []),
                        )
                    break
        except Exception as e:
            last_err = e

    if not loaded:
        domain_patterns = None
        if config.LLM_DEBUG:
            logging.getLogger(__name__).info(
                "DOMAIN_PATTERNS could not be loaded; last_err=%s",
                str(last_err) if last_err else "",
            )


def apply_domain_patterns(question: str):
    """Return (queries, must_phrases, law_codes, intent) from domain patterns matched by question."""
    if not domain_patterns:
        return [], [], [], None
    try:
        from .utils import norm_text

        qn = norm_text(question)
        out_q: List[str] = []
        out_must: List[str] = []
        out_codes: List[str] = []
        out_intent: Optional[str] = None
        for c in (domain_patterns.get("concepts") or []):
            triggers = [norm_text(t) for t in (c.get("triggers") or [])]
            if any(t and t in qn for t in triggers):
                out_q.extend(c.get("subqueries") or [])
                out_must.extend(c.get("must_phrases") or [])
                out_codes.extend(c.get("law_codes") or [])
                if not out_intent and c.get("intent"):
                    out_intent = c.get("intent")
        return out_q, out_must, out_codes, out_intent
    except Exception:
        return [], [], [], None


# Load patterns when module is imported
load_domain_patterns()
