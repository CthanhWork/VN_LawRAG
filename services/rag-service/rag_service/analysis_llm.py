import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from . import config
from .utils import safe_json_parse


def _build_analyze_prompts(question: str, effective_at: str, contexts: List[dict]) -> Tuple[str, Dict[str, Any]]:
    sys = (
        "Bạn là luật sư tư vấn pháp lý tiếng Việt. Trả lời hướng tới người dùng, rõ ràng, thực tiễn, nhưng CHỈ dựa vào ngữ cảnh pháp lý được cung cấp (điều, khoản, điểm). "
        "Nhiệm vụ: (1) phân tích câu hỏi; (2) trích xuất quy định áp dụng; (3) soạn câu trả lời tư vấn ngắn gọn, dễ hiểu; (4) dẫn chiếu điều/khoản/điểm và nghị định (nếu có). "
        "Không bịa đặt nội dung ngoài ngữ cảnh. Nếu thiếu căn cứ để trả lời dứt điểm, nêu phần 'Cần bổ sung:'/ 'Đề xuất:' thay vì nói chung chung về hệ thống. "
        "Tái sử dụng chính xác các trường law_code và node_path khi trích dẫn. "
        "Kết quả phải là JSON; mọi diễn đạt bằng tiếng Việt, văn phong tư vấn cho người dùng."
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
            "decision": "VIOLATION|NO_VIOLATION|UNCERTAIN",
            "matched": [{"law_code": "string", "node_path": "string", "node_id": "number|null"}],
            "explanation": "string"
        },
        "rules": [
            "Luôn tạo 'answer' bằng tiếng Việt, như đang tư vấn trực tiếp cho người dùng; tránh nói 'ngữ cảnh không cung cấp'.",
            "Nếu còn thiếu căn cứ, thêm mục 'Cần bổ sung:' (liệt kê dữ kiện/điều luật cần có) và 'Đề xuất:' (bước tiếp theo).",
            "Chỉ quyết định VIOLATION/NO_VIOLATION khi câu hỏi là đánh giá hành vi; nếu không, để UNCERTAIN.",
            "Nếu decision=VIOLATION, phải có ít nhất một trích dẫn trong 'matched'.",
            "Ưu tiên dẫn chiếu đầy đủ node_path (điều/khoản/điểm). Không đưa trích dẫn ngoài context.",
            "Ưu tiên trích dẫn cả Nghị định (DECREE) nếu có trong context; nếu có xung đột, viện dẫn Luật (LAW) và nêu nghị định cụ thể áp dụng.",
            "Giữ 'answer' ngắn gọn, có thể dùng gạch đầu dòng cho điều kiện/bước xử lý.",
            "Không đồng nhất 'dưới 36 tháng' với '3 tuổi'; chỉ dùng từ ngữ đúng theo trích dẫn.",
        ],
    }
    return sys, user


def violation_judgment_llm(question: str, effective_at: str, contexts: List[dict]) -> Optional[dict]:
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
                    "LLM_ANALYZE req=%s", json.dumps(user, ensure_ascii=False)[:2000]
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
                    "LLM_ANALYZE resp=%s", (txt or "")[: config.LLM_LOG_SLICE]
                )
            parsed = safe_json_parse(txt or "")
            if config.LLM_DEBUG:
                logging.getLogger(__name__).info(
                    "LLM_ANALYZE data=%s", json.dumps(parsed or {}, ensure_ascii=False)[: config.LLM_LOG_SLICE]
                )
            return parsed
    except Exception:
        pass
    return None


__all__ = ["violation_judgment_llm"]
