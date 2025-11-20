import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from . import config
from .utils import safe_json_parse, norm_text, detect_polygamy_intent


def _build_analyze_prompts(question: str, effective_at: str, contexts: List[dict]) -> Tuple[str, Dict[str, Any]]:
    """
    Xây system prompt + payload cho LLM phân tích vi phạm/hành vi pháp lý.

    Mục tiêu: tận dụng tối đa context (điều luật, nghị định, mức xử phạt)
    để tạo câu trả lời giàu thông tin hơn, nhưng vẫn giữ schema JSON cũ.
    """
    sys = (
        "Bạn là luật sư tư vấn pháp lý tiếng Việt. Trả lời hướng tới người dân, rõ ràng, thực tiễn, "
        "nhưng CHỈ dựa vào ngữ cảnh pháp lý được cung cấp (điều, khoản, điểm, nghị định, luật). "
        "Nhiệm vụ: (1) phân tích câu hỏi và xác định vấn đề pháp lý chính; "
        "(2) trích xuất QUY ĐỊNH ÁP DỤNG từ context (luật, nghị định, mức xử phạt…); "
        "(3) dựa trên các quy định đó để ĐƯA RA KẾT LUẬN về việc có vi phạm hay không (decision); "
        "(4) soạn câu trả lời tư vấn ngắn gọn, dễ hiểu nhưng đầy đủ ý chính; "
        "(5) liệt kê rõ điều/khoản/điểm và văn bản áp dụng; "
        "(6) nêu MỨC XỬ LÝ / CHẾ TÀI nếu trong context có nêu. "
        "Không được bịa đặt nội dung ngoài context, nhưng được suy luận hợp lý từ các quy định đã trích dẫn. "
        "CHỈ dùng kết luận UNCERTAIN khi context trống hoặc hoàn toàn không liên quan đến vấn đề được hỏi. "
        "Nếu thiếu căn cứ rõ ràng, hãy ghi rõ phần 'Cần bổ sung:' nêu thêm tài liệu/điều luật cần tra cứu; "
        "và phần 'Đề xuất:' gợi ý bước tiếp theo cho người hỏi. "
        "Luôn ưu tiên mô tả cụ thể nghĩa vụ, hành vi bị cấm, điều kiện, mức phạt, thẩm quyền xử lý nếu có trong context. "
        "Khi trích dẫn, phải dùng đúng các trường law_code và node_path để người dùng tra cứu lại. "
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
            "decision": "VIOLATION|NO_VIOLATION|UNCERTAIN",
            "matched": [
                {"law_code": "string", "node_path": "string", "node_id": "number|null"}
            ],
            "explanation": "string",
        },
        "rules": [
            "Luôn tạo 'answer' bằng tiếng Việt, như đang tư vấn trực tiếp cho người hỏi; "
            "tránh nói chung chung 'ngữ cảnh không cung cấp' mà hãy mô tả rõ 'trong các trích dẫn dưới đây không ghi nhận ...'.",
            "ƯU TIÊN đưa ra kết luận VIOLATION hoặc NO_VIOLATION nếu context có các quy định gần với tình huống, "
            "dù không trùng khớp 100%, và giải thích rõ mức độ chắc chắn trong 'explanation'.",
            "Chỉ dùng decision=UNCERTAIN khi: (a) context rỗng; hoặc (b) context chỉ chứa các quy định rõ ràng không liên quan đến vấn đề được hỏi.",
            "Nếu trong context có quy định về hành vi bị cấm, nghĩa vụ, điều kiện, mức phạt, "
            "phải nêu rõ trong 'explanation' (có thể dùng gạch đầu dòng) và sử dụng chúng để hỗ trợ kết luận.",
            "Nếu cần thêm căn cứ nhưng context không có, thêm mục 'Cần bổ sung:' "
            "(liệt kê điều luật/văn bản cần tra cứu thêm) và 'Đề xuất:' "
            "(bước tiếp theo, ví dụ liên hệ cơ quan, xem thêm nghị định xử phạt...).",
            "Nếu decision=VIOLATION, phải có ít nhất một trích dẫn trong 'matched' liên quan trực tiếp tới hành vi đó.",
            "Ưu tiên dẫn chiếu đầy đủ node_path (điều/khoản/điểm). Không đưa trích dẫn ngoài context.",
            "Ưu tiên dẫn chiếu nghị định (DECREE) nếu trong context có quy định chi tiết về xử phạt; "
            "đồng thời dẫn chiếu luật (LAW) làm căn cứ chung nếu thích hợp.",
            "Giữ 'answer' ngắn gọn, tách ý bằng câu hoặc gạch đầu dòng, nêu rõ: "
            "(1) có/không vi phạm; (2) căn cứ; (3) hậu quả/xử lý; (4) khuyến nghị.",
            "Không đánh đồng 'dưới 36 tháng' với '3 tuổi'; dùng đúng cách diễn đạt trong trích dẫn.",
        ],
    }
    return sys, user


def violation_judgment_llm(question: str, effective_at: str, contexts: List[dict]) -> Optional[dict]:
    """
    Gọi LLM (Gemini) để phân tích vi phạm dựa trên context đã retrieve.
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

            # Hậu xử lý: nếu LLM vẫn để UNCERTAIN nhưng ngữ cảnh và tình huống
            # rất điển hình (ví dụ vi phạm chế độ một vợ một chồng) thì cố gắng
            # đưa ra quyết định dựa trên luật trong context.
            parsed = _postprocess_decision(question, contexts, parsed or {})
            return parsed
    except Exception:
        # Không để lỗi LLM làm hỏng cả pipeline; fallback sang None
        pass
    return None


def _postprocess_decision(
    question: str, contexts: List[dict], result: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Lớp logic quyết định bổ sung bên ngoài LLM.

    Mục tiêu: khi LLM quá thận trọng (decision=UNCERTAIN) nhưng
    context + pattern cho phép kết luận rõ hơn, ta điều chỉnh lại.
    """
    decision = (result.get("decision") or "").upper()
    if decision and decision != "UNCERTAIN":
        return result

    q_norm = norm_text(question or "")
    ctx_norms = [norm_text((c.get("content") or "") + " " + (c.get("node_path") or "")) for c in contexts or []]

    # Case 1: nghi vấn vi phạm chế độ một vợ một chồng
    try:
        if detect_polygamy_intent(question):
            has_monogamy_rule = any(
                "mot vo mot chong" in t
                or "che do mot vo" in t
                or "cac hanh vi bi cam" in t
                for t in ctx_norms
            )
            if has_monogamy_rule and contexts:
                # Lấy một vài context tiêu biểu làm citations
                citations = []
                for c in contexts:
                    t = norm_text((c.get("content") or "") + " " + (c.get("node_path") or ""))
                    if "mot vo mot chong" in t or "cac hanh vi bi cam" in t or "che do mot vo" in t:
                        citations.append(
                            {
                                "lawCode": c.get("law_code"),
                                "nodePath": c.get("node_path"),
                                "nodeId": c.get("node_id"),
                            }
                        )
                    if len(citations) >= 3:
                        break

                base_expl = (
                    "Các trích dẫn pháp luật trong ngữ cảnh có quy định về chế độ một vợ một chồng "
                    "và hành vi 'chung sống như vợ chồng với người khác khi đang có vợ hoặc có chồng' "
                    "là hành vi bị cấm. Do đó, hành vi trong tình huống được xem là VI PHẠM chế độ một vợ một chồng. "
                )
                llm_expl = (result.get("explanation") or "").strip()
                if llm_expl:
                    explanation = base_expl + "\n\nPhân tích bổ sung từ LLM:\n" + llm_expl
                else:
                    explanation = base_expl

                result["decision"] = "VIOLATION"
                result["explanation"] = explanation
                # Chỉ overwrite citations nếu LLM chưa có gì hoặc rất ít
                if not result.get("citations"):
                    result["citations"] = citations
                return result
    except Exception:
        # Không để lỗi heuristic làm hỏng kết quả
        return result

    return result


__all__ = ["violation_judgment_llm"]
