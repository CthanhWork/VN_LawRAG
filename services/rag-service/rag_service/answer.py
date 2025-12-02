from typing import Any, Dict, List

from .retrieval import _fetch_node


def _full_clause_text(ctx: Dict[str, Any]) -> str:
    """
    Trả về nguyên văn nội dung của điều/khoản tương ứng với context.

    Ưu tiên gọi law-service để lấy full contentText; nếu lỗi thì fallback
    về trường content đang có trong context.
    """
    node_id = ctx.get("node_id")
    if node_id is not None:
        try:
            node = _fetch_node(node_id)
        except Exception:
            node = None
        if isinstance(node, dict):
            txt = (node.get("contentText") or node.get("contentHtml") or "").strip()
            if txt:
                return txt
    return (ctx.get("content") or "").strip()


def synthesize_answer2(question: str, effective_at: str, contexts: list):
    """
    Sinh câu trả lời rút gọn dựa trên context, kèm trích dẫn nguyên văn điều/khoản.

    Áp dụng chung cho mọi loại câu hỏi, không hard-code theo từng kịch bản.
    """
    if not contexts:
        return (
            "Tu van phap ly (rut gon):\n"
            "- Chua co trich dan phu hop de tra loi chinh xac.\n"
            "- Can bo sung: ten van ban/ma van ban hoac dieu, khoan cu the lien quan."
        )

    top_ctx = contexts[:3]
    bullets: List[str] = []
    for c in top_ctx:
        code = c.get("law_code") or "N/A"
        path = c.get("node_path") or ""
        full_text = _full_clause_text(c)
        bullets.append(f"- {full_text} [{code} - {path}]")

    return (
        "Tu van phap ly (rut gon):\n"
        "- Tom tat quy dinh lien quan (trich dan nguyen van dieu/khoan): \n"
        + "\n".join(bullets)
    )


def _pick_clause(contexts: List[dict], article_no: int, strict: bool = False) -> Dict[str, str]:
    """
    Chọn một đoạn luật phù hợp (Điều X) từ context để trích dẫn.
    Ưu tiên node_path chứa "Dieu-{article_no}" hoặc content chứa "Điều {article_no}".
    Nếu strict=True và không tìm thấy, trả về rỗng thay vì lấy đại.
    """
    best = None
    key = f"điều {article_no}".lower()
    key2 = f"dieu-{article_no}".lower()
    for ctx in contexts or []:
        path = (ctx.get("node_path") or "").lower()
        content = (ctx.get("content") or "").strip()
        if not content:
            continue
        if key in content.lower() or key2 in path:
            best = ctx
            break
        if best is None:
            best = ctx
    if strict and best is None:
        return {"law_code": "", "node_path": "", "text": ""}
    if best:
        return {
            "law_code": best.get("law_code") or "",
            "node_path": best.get("node_path") or "",
            "text": _full_clause_text(best),
        }
    return {"law_code": "", "node_path": "", "text": ""}


def build_structured_advice(contexts: List[dict]) -> str:
    """
    Tạo bản tóm tắt tư vấn dựa trên context mà không gắn kịch bản cố định.
    - Liệt kê các điểm chính từ vài context đầu.
    - Đính kèm trích dẫn ngay dưới bằng blockquote.
    """
    parts: List[str] = []
    head_items = []
    for c in (contexts or [])[:3]:
        content = (c.get("content") or "").strip()
        if not content:
            continue
        code = c.get("law_code") or "N/A"
        path = c.get("node_path") or ""
        head_items.append(f"- {content} [{code} - {path}]")

    if head_items:
        parts.append("Các điểm chính được rút ra từ ngữ cảnh liên quan:")
        parts.extend(head_items)

    # Trích dẫn chi tiết (2-3 đoạn)
    quotes = []
    for c in (contexts or [])[:3]:
        full = _full_clause_text(c)
        if not full:
            continue
        code = c.get("law_code") or "N/A"
        path = c.get("node_path") or ""
        lines = full.splitlines()
        quoted = "\n".join([f"> {line}".rstrip() if line.strip() else ">" for line in lines])
        quotes.append(f"Căn cứ ({code} - {path}):\n{quoted}")
        if len(quotes) >= 3:
            break

    if quotes:
        parts.append("")
        parts.extend(quotes)

    return "\n".join(parts)


def attach_full_citations(answer: str, contexts: List[dict], citations: List[dict], max_items: int = 4) -> str:
    """
    Append full law excerpts (from system data) after the LLM answer.

    We don't trust the LLM to supply verbatim statute text, so we pull the
    node contents ourselves and stitch them under a 'Trich dan day du' section.
    """
    picked: List[dict] = []
    seen = set()

    # Prefer matched citations; fall back to top contexts
    for c in (citations or []):
        for ctx in contexts or []:
            same_node = ctx.get("node_id") is not None and ctx.get("node_id") == c.get("node_id")
            same_path = (ctx.get("law_code") or "", ctx.get("node_path") or "") == (c.get("law_code") or "", c.get("node_path") or "")
            if (same_node or same_path) and ctx.get("node_id") not in seen:
                picked.append(ctx)
                seen.add(ctx.get("node_id"))
                break
            if len(picked) >= max_items:
                break
        if len(picked) >= max_items:
            break

    if not picked:
        picked = (contexts or [])[:max_items]

    lines: List[str] = []
    for ctx in picked[:max_items]:
        full_text = _full_clause_text(ctx)
        if not full_text:
            continue
        code = ctx.get("law_code") or "N/A"
        path = ctx.get("node_path") or ""
        lines.append(f"- [{code} - {path}] {full_text}")

    if not lines:
        return answer

    suffix = "Trich dan day du dieu/khoan (tu he thong):\n" + "\n".join(lines)
    if answer and answer.strip():
        return answer.strip() + "\n\n" + suffix
    return suffix


def violation_judgment_heuristic(question: str, contexts: List[dict]) -> dict:
    """
    Heuristic fallback tổng quát cho /analyze khi không dùng được LLM.
    Không gắn với case cụ thể; luôn trả UNCERTAIN + trích dẫn context.
    """
    return {
        "answer": synthesize_answer2(question, "", contexts),
        "decision": "UNCERTAIN",
        "matched": [],
        "explanation": "Thieu can cu ro rang tu trich dan de ket luan vi pham.",
    }


__all__ = ["synthesize_answer2", "violation_judgment_heuristic", "attach_full_citations", "build_structured_advice"]
