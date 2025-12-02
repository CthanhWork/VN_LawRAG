import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from . import config
from .utils import safe_json_parse


def _build_analyze_prompts(
    question: str, effective_at: str, contexts: List[dict]
) -> Tuple[str, Dict[str, Any]]:
    """
    Xây system prompt + payload cho LLM tư vấn pháp lý (legal advice),
    KHÔNG đánh giá vi phạm / không vi phạm.

    Mục tiêu: dùng context (điều luật, nghị định...) để trả lời rõ ràng,
    có cấu trúc, gắn với từng ý (1),(2),(3)... nếu có.
    """
    sys = (
        "Bạn là luật sư tư vấn pháp lý tiếng Việt. Trả lời hướng tới người dân, rõ ràng, thực tiễn, "
        "nhưng CHỈ dựa vào ngữ cảnh pháp lý được cung cấp (điều, khoản, điểm, nghị định, luật). "
        "Nhiệm vụ: (1) phân tích câu hỏi và xác định các ý hỏi chính (1),(2),(3)... nếu có; "
        "(2) trích xuất QUY ĐỊNH ÁP DỤNG từ context (quyền, nghĩa vụ, điều kiện, thủ tục, chế tài…); "
        "(3) soạn câu trả lời tư vấn ngắn gọn, dễ hiểu, bám sát từng ý hỏi; "
        "(4) liệt kê rõ điều/khoản/điểm và văn bản áp dụng để người hỏi có thể tự tra cứu; "
        "(5) nêu rõ khuyến nghị/đề xuất bước tiếp theo. "
        "Không được bịa đặt nội dung ngoài context, nhưng được suy luận hợp lý từ các quy định đã trích dẫn. "
        "Kết quả phải là JSON, mọi diễn đạt bằng tiếng Việt, văn phong tư vấn cho người dùng."
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
        },
        "rules": [
            "Luôn tạo 'answer' bằng tiếng Việt, như đang tư vấn trực tiếp cho người hỏi.",
            "Nếu câu hỏi có đánh số (1),(2),(3)... thì câu trả lời cũng phải có (1),(2),(3) tương ứng trong 'answer'.",
            "Mỗi luận điểm chính trong 'answer' nên gắn với ít nhất một trích dẫn trong 'matched' (nếu có).",
            "Trong chế độ tư vấn này, decision nên là 'INFO' trừ khi hoàn toàn thiếu căn cứ; chỉ dùng 'UNCERTAIN' khi context rỗng hoặc không liên quan.",
            "Nếu thiếu căn cứ rõ ràng, thêm mục 'Cần bổ sung:' và 'Đề xuất:' trong 'explanation'.",
        ],
    }
    return sys, user


def violation_judgment_llm(
    question: str, effective_at: str, contexts: List[dict]
) -> Optional[dict]:
    """
    Gọi LLM (Gemini) để tư vấn pháp lý dựa trên context đã retrieve.
    Trả về dict đã parse JSON theo schema (answer, decision, matched, explanation)
    hoặc None nếu có lỗi / không dùng LLM.
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
                    "temperature": 0,
                    "response_mime_type": "application/json",
                    "max_output_tokens": 3000,
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
        # Không để lỗi LLM làm hỏng cả pipeline; fallback sang None
        pass
    return None


__all__ = ["violation_judgment_llm"]

