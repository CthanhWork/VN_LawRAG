import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from . import config
from .utils import safe_json_parse


def _build_qu_prompts(question: str, effective_at: Optional[str]) -> Tuple[str, Dict[str, Any]]:
    sys = (
        "You are a Vietnamese law query-normalization assistant for a RAG system. "
        "Always return JSON that follows the schema exactly. "
        "If you are unsure, reuse the normalized question as the only subquery. "
        "Prefer concise subqueries that directly reference specific articles/clauses. "
        "Do not fabricate legal text. "
        "Although instructions are in English, every generated query/subquery must remain in Vietnamese."
    )
    user = {
        "question": question,
        "effective_at": effective_at,
        "schema": {
            "normalized": "string",
            "subqueries": ["string"],
            "filters": {
                "effective_at": "string|null",
                "must_phrases": ["string"],
                "law_codes": ["string"],
                "levels": ["string"],
                "intent": "YES_NO|DEFINITION|CONDITION|PENALTY|PROCEDURE|OTHER",
            },
        },
        "rules": [
            "Must produce at least 1 subquery.",
            "If nothing else fits, set subqueries = [normalized] (or [question] if normalized empty).",
            "Keep subqueries short and aligned with common law article wording.",
            "Output normalized + subqueries in Vietnamese (có dấu hoặc không đều được).",
        ],
        "hints": {
            "marriage_age_case": {
                "if_contains": ["ket hon", "dang ky ket hon", "tuoi"],
                "subqueries": [
                    "dieu 8 luat hon nhan va gia dinh dieu kien ket hon",
                    "dieu kien ket hon luat hon nhan va gia dinh",
                ],
                "filters": {
                    "law_codes": ["121/VBHN-VPQH"],
                    "must_phrases": ["dieu kien ket hon", "nam tu du 20", "nu tu du 18"],
                },
                "intent": "YES_NO",
            },
            "affair_case": {
                "if_contains": ["ngoai tinh", "nguoi tinh", "chung song", "ngoai hon nhan"],
                "subqueries": [
                    "dieu 5 luat hon nhan va gia dinh cac hanh vi bi cam",
                    "che do mot vo mot chong",
                    "dieu 19 luat hon nhan va gia dinh nghia vu cua vo chong",
                    "nghia vu vo chong luat hon nhan va gia dinh",
                ],
                "filters": {
                    "law_codes": ["121/VBHN-VPQH"],
                    "must_phrases": [
                        "mot vo mot chong",
                        "chung song nhu vo chong",
                        "cac hanh vi bi cam",
                        "chung thuy",
                        "nghia vu vo chong",
                    ],
                },
                "intent": "OTHER",
            },
        },
        "few_shot": {
            "question": "toi 17 tuoi va ban trai 20 tuoi, chung toi co the dang ky ket hon khong?",
            "assistant": {
                "normalized": "17 tuoi va 20 tuoi co du dieu kien ket hon?",
                "subqueries": [
                    "dieu 8 luat hon nhan va gia dinh dieu kien ket hon",
                    "dieu kien ket hon luat hon nhan va gia dinh",
                ],
                "filters": {
                    "effective_at": effective_at or None,
                    "must_phrases": ["dieu kien ket hon", "nam tu du 20", "nu tu du 18"],
                    "law_codes": ["121/VBHN-VPQH"],
                    "levels": [],
                    "intent": "YES_NO",
                },
            },
        },
    }
    return sys, user


def query_understanding_llm(question: str, effective_at: Optional[str] = None) -> Optional[dict]:
    if not config.USE_LLM_QU:
        return None
    # Primary: Google Gemini if configured
    try:
        import google.generativeai as genai

        api_key = __import__("os").getenv("GEMINI_API_KEY")
        if api_key:
            sys, user = _build_qu_prompts(question, effective_at)
            if config.LLM_DEBUG:
                logging.getLogger(__name__).info(
                    "LLM_QU(model=%s, provider=google) req=%s",
                    config.QU_MODEL,
                    json.dumps(user, ensure_ascii=False)[: config.LLM_LOG_SLICE],
                )
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(config.QU_MODEL or "gemini-1.5-flash")
            resp = model.generate_content(
                [{"text": sys}, {"text": json.dumps(user, ensure_ascii=False)}],
                generation_config={
                    "temperature": 0,
                    "response_mime_type": "application/json",
                    "max_output_tokens": 3000,
                },
            )
            txt = getattr(resp, "text", None)
            if config.LLM_DEBUG:
                logging.getLogger(__name__).info("LLM_QU resp=%s", (txt or "")[: config.LLM_LOG_SLICE])
            data = safe_json_parse(txt or "")
            try:
                _sub = list(data.get("subqueries") or [])
            except Exception:
                _sub = []
            _norm = (data.get("normalized") or "").strip() if isinstance(data, dict) else ""
            if not _sub and not _norm:
                from .utils import expand_queries

                _fb = expand_queries(question) or [question]
                data = {
                    "normalized": question,
                    "subqueries": _fb[:4],
                    "filters": {"must_phrases": [], "law_codes": []},
                }
            if config.LLM_DEBUG:
                logging.getLogger(__name__).info(
                    "LLM_QU data=%s", json.dumps(data or {}, ensure_ascii=False)[: config.LLM_LOG_SLICE]
                )
            return data or None
    except Exception:
        # Fall through to OpenAI only if library configured in the environment.
        pass

    # Fallback: OpenAI (optional)
    api_key = __import__("os").getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        sys, user = _build_qu_prompts(question, effective_at)
        if config.LLM_DEBUG:
            logging.getLogger(__name__).info("LLM_QU model=%s", config.QU_MODEL)
            logging.getLogger(__name__).info("LLM_QU req=%s", json.dumps(user, ensure_ascii=False)[:2000])
        resp = client.chat.completions.create(
            model=config.QU_MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[{"role": "system", "content": sys}, {"role": "user", "content": json.dumps(user, ensure_ascii=False)}],
        )
        txt = resp.choices[0].message.content if resp and resp.choices else None
        if config.LLM_DEBUG:
            logging.getLogger(__name__).info("LLM_QU resp=%s", (txt or "")[: config.LLM_LOG_SLICE])
        data = safe_json_parse(txt or "")
        try:
            _sub = list(data.get("subqueries") or [])
        except Exception:
            _sub = []
        _norm = (data.get("normalized") or "").strip() if isinstance(data, dict) else ""
        if not _sub and not _norm:
            from .utils import expand_queries

            _fb = expand_queries(question) or [question]
            data = {
                "normalized": question,
                "subqueries": _fb[:4],
                "filters": {"must_phrases": [], "law_codes": []},
            }
        if config.LLM_DEBUG:
            logging.getLogger(__name__).info(
                "LLM_QU data=%s", json.dumps(data or {}, ensure_ascii=False)[: config.LLM_LOG_SLICE]
            )
        return data or None
    except Exception:
        return None
