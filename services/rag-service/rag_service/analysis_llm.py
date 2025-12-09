import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from . import config
from .utils import safe_json_parse


def _build_analyze_prompts(
    question: str, effective_at: str, contexts: List[dict]
) -> Tuple[str, Dict[str, Any]]:
    """
    System prompt + payload cho LLM tu van phap ly, khong xet phan quyet vi pham.
    """
    sys = (
        "You are a professional Vietnamese law consultant for a RAG system. Your goal is to provide accurate, easy-to-understand advice in Vietnamese. "
        "Your response MUST synthesize and analyze the retrieved content. Use ONLY the most relevant articles and completely ignore irrelevant ones (e.g., ignore procedural law if the question is substantive). "
        "DO NOT include law codes, paths, or technical headers in the 'answer' field. "
        "If any citation is a generic statement/metadata (e.g., 'The Government regulates the details of this Article.'), you MUST use your internal knowledge to infer and summarize the specific rule it implies; DO NOT repeat the metadata itself. Put that inferred content into 'answer' and explain the reasoning in 'analysis'. "
        "Never mix unrelated topics in one answer (e.g., nghia vu dong gop cua con cai with tham quyen ly hon); focus only on the main topic of the question, or separate clearly if multiple sub-questions exist. "
        "Tasks: (1) Fill 'analysis' first with your reasoning and justification based on the provided context; (2) Synthesize a COMPLETE advisory answer in professional, accented Vietnamese; (3) Only include citation IDs in 'matched'; (4) Include a brief explanation in 'explanation'. "
        "Output must be JSON according to the schema. Prioritize Vietnamese with diacritics for all output fields."
    )

    user = {
        "question": question,
        "effective_at": effective_at,
        "context": [
            {
                "law_code": c.get("law_code"),
                "node_path": c.get("node_path"),
                "node_id": c.get("node_id"),
                "content": c.get("content"),
                "doc_type": c.get("doc_type"),
            }
            for c in contexts[:8]
        ],
        "schema": {
            "answer": "string",
            "decision": "INFO|UNCERTAIN",
            "matched": [
                {"law_code": "string", "node_path": "string", "node_id": "number|null"}
            ],
            "explanation": "string",
            "analysis": "string",
        },
        "rules": [
            "Luat su tra loi bang tieng Viet co dau, giong tu van truc tiep cho nguoi hoi.",
            "Khong dua ma/duong dan trich dan vao 'answer'; chi de noi dung tu van.",
            "Neu cau hoi co danh so (1),(2),(3)... thi cau tra loi nen co (1),(2),(3) tuong ung.",
            "Moi luan diem chinh trong 'answer' nen gan voi it nhat mot trich dan trong 'matched' (neu co).",
            "Phan tich trong tam phap ly truoc khi tra loi: tap trung dung dung nhom dieu/khoan co lien quan truc tiep, tranh xa luat thu tuc/an phi/van ban khong lien quan.",
            "Trong chua ro ket luan, co the them 'Can bo sung:' hoac 'De xuat:' trong 'explanation'.",
        ],
    }
    return sys, user


def violation_judgment_llm(
    question: str, effective_at: str, contexts: List[dict]
) -> Optional[dict]:
    """
    Goi LLM (Gemini) tu van phap ly dua tren context retrieve.
    Tra ve dict JSON theo schema (answer, decision, matched, explanation) hoac None neu loi.
    """
    try:
        import google.generativeai as genai

        api_key = __import__("os").getenv("GEMINI_API_KEY")
        if api_key:
            sys, user = _build_analyze_prompts(question, effective_at, contexts)
            if config.LLM_DEBUG:
                logging.getLogger(__name__).info(
                    "LLM_ANALYZE(model=%s, provider=google) ctx_items=%d",
                    config.QU_MODEL,
                    len(user.get("context") or []),
                )
                logging.getLogger(__name__).info(
                    "LLM_ANALYZE req=%s",
                    json.dumps(user, ensure_ascii=False)[:2000],
                )
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(config.QU_MODEL or "gemini-1.5-flash")
            resp = model.generate_content(
                [{"text": sys}, {"text": json.dumps(user, ensure_ascii=False)}],
                generation_config={
                    "temperature": 0.4,
                    "response_mime_type": "application/json",
                    "max_output_tokens": 4096,
                },
            )
            txt = getattr(resp, "text", None)
            if config.LLM_DEBUG:
                logging.getLogger(__name__).info(
                    "LLM_ANALYZE resp=%s",
                    (txt or "")[: config.LLM_LOG_SLICE],
                )
            parsed = safe_json_parse(txt or "") or {}
            if config.LLM_DEBUG:
                logging.getLogger(__name__).info(
                    "LLM_ANALYZE data=%s",
                    json.dumps(parsed or {}, ensure_ascii=False)[
                        : config.LLM_LOG_SLICE
                    ],
                )
            return parsed
    except Exception:
        # Khong de loi LLM lam hong pipeline; fallback sang None
        pass
    return None


__all__ = ["violation_judgment_llm"]
