from typing import Any, Dict, List
import re

from .retrieval import _fetch_node


def _full_clause_text(ctx: Dict[str, Any]) -> str:
    """Tra ve noi dung dieu/khoan tu context, uu tien lay tu law-service."""
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
    Fallback tra loi ngan gon dua tren context (khi LLM khong tra loi).
    """
    if not contexts:
        return (
            "Tu van phap ly:\n"
            "- He thong chua tim thay trich dan phu hop de dua ra cau tra loi chinh xac.\n"
            "- Can bo sung: ten van ban hoac dieu khoan cu the lien quan de truy van lai."
        )

    return build_structured_advice(contexts)


def _pick_clause(contexts: List[dict], article_no: int, strict: bool = False) -> Dict[str, str]:
    """
    Chon mot doan luat phu hop (Dieu X) tu context de trich dan.
    """
    best = None
    key = f"dieu {article_no}".lower()
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
    Tao ban tom tat tu van dua tren context.
    - Liet ke cac diem chinh tu vai context dau.
    - Them trich dan (blockquote) ngay ben duoi.
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
        parts.append("Cac diem chinh duoc rut ra tu ngu canh lien quan:")
        parts.extend(head_items)

    quotes = []
    for c in (contexts or [])[:3]:
        full = _full_clause_text(c)
        if not full:
            continue
        code = c.get("law_code") or "N/A"
        path = c.get("node_path") or ""
        lines = full.splitlines()
        quoted = "\n".join([f"> {line}".rstrip() if line.strip() else ">" for line in lines])
        quotes.append(f"Can cu ({code} - {path}):\n{quoted}")
        if len(quotes) >= 3:
            break

    if quotes:
        parts.append("")
        parts.extend(quotes)

    return "\n".join(parts)


def attach_full_citations(answer: str, contexts: List[dict], citations: List[dict], max_items: int = 4) -> str:
    """Append full law excerpts (from system data) after the LLM answer."""
    picked: List[dict] = []
    seen = set()

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


def _accentize_common(text: str) -> str:
    """Best-effort normalize common accentless boilerplate to Vietnamese with dau."""
    replacements = {
        r"tu van phap ly": "tư vấn pháp lý",
        r"tom tat": "tóm tắt",
        r"quy dinh": "quy định",
        r"thieu can cu ro rang": "thiếu căn cứ rõ ràng",
        r"thieu can cu ro rang tu trich dan de ket luan vi pham": "thiếu căn cứ rõ ràng từ trích dẫn để kết luận vi phạm",
        r"can cu ro rang": "căn cứ rõ ràng",
        r"thieu can cu ro rang tu trich dan": "thiếu căn cứ rõ ràng từ trích dẫn",
        r"de ket luan vi pham": "để kết luận vi phạm",
        r"trich dan": "trích dẫn",
        r"tu trich dan": "từ trích dẫn",
        r"rut gon": "rút gọn",
        r"nguoi hoi": "người hỏi",
        r"de xuat": "đề xuất",
    }
    out = text
    for pattern, repl in replacements.items():
        out = re.sub(pattern, repl, out, flags=re.IGNORECASE)
    return out


def _fallback_paragraph(contexts: List[dict]) -> str:
    """Compose a short advisory paragraph from top contexts (no citations in text)."""
    parts: List[str] = []
    for c in (contexts or [])[:3]:
        full = _full_clause_text(c)
        if not full:
            continue
        parts.append(full.strip())
    if not parts:
        return ""
    return " ".join(parts)[:800].strip()


def normalize_answer_vi(text: str, contexts: List[dict], is_explanation: bool = False) -> str:
    """
    Clean technical placeholders, strip citations/placeholders, accentize common phrases,
    and return a single advisory text block (no citations inside).
    """
    txt = (text or '').strip()
    patterns = [
        r"(?im)^tu van phap ly\s*\(rut gon\)\s*:?",
        r"(?im)^t[ou] van phap ly\s*:?",
        r"(?im)^tom tat quy dinh lien quan.*:?",
        r"(?im)^trich dan day du dieu/khoan.*:?",
        r"(?im)^1\.\s*noi dung tu van\s*:?",
        r"(?im)^2\.\s*can cu phap ly trich dan\s*:?",
        r"(?im)^- Tom tat quy dinh lien quan.*:?",
        r"(?im)^Hinh thuc xu phat bo sung.*:?",
        r"(?im)^cac diem chinh duoc rut ra tu ngu canh lien quan.*:?",
    ]
    for pat in patterns:
        txt = re.sub(pat, '', txt).strip()

    txt = re.sub(r"\[[^\]]+\]", ' ', txt)
    txt = re.sub(r"(?im)^>.*$", ' ', txt)
    txt = re.sub(r"(?im)^can cu\s*\([^)]*\)\s*:?,?", ' ', txt)
    txt = re.sub(r"(?im)^c\w*n cu\s*\([^)]*\)\s*:?,?", ' ', txt)
    txt = re.sub(r"(?im)^cac diem chinh duoc rut ra tu ngu canh lien quan.*$", ' ', txt)
    txt = re.sub(r"(?m)^\s*-\s*", '', txt)  # strip leading dashes from pasted bullets
    txt = re.sub(r"\s{2,}", ' ', txt).strip()

    txt = _accentize_common(txt)

    if not txt or len(txt) < 40:
        txt = _accentize_common(_fallback_paragraph(contexts) or txt)

    if not txt:
        return ''

    txt = txt.replace('\n', ' ').strip()
    if not txt.endswith(('.', '!', '?')):
        txt += '.'
    return txt


def violation_judgment_heuristic(question: str, contexts: List[dict]) -> dict:
    """
    Heuristic fallback tong quat cho /analyze khi khong dung duoc LLM.
    Khong gan voi case cu the; luon tra UNCERTAIN + trich dan context.
    """
    return {
        "answer": synthesize_answer2(question, "", contexts),
        "decision": "UNCERTAIN",
        "matched": [],
        "explanation": "Thiếu căn cứ rõ ràng từ trích dẫn để kết luận vi phạm.",
        "analysis": "",
    }


__all__ = ["synthesize_answer2", "violation_judgment_heuristic", "attach_full_citations", "build_structured_advice", "normalize_answer_vi"]
