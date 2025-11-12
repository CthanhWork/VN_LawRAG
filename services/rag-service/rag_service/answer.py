from typing import Any, Dict, List

from .utils import norm_text, detect_polygamy_intent


def synthesize_answer2(question: str, effective_at: str, contexts: list):
    if not contexts:
        return (
            "Tu van phap ly (rut gon):\n"
            "- Chua co trich dan phu hop de tra loi chinh xac.\n"
            "- Can bo sung: ten van ban/ma van ban hoac dieu, khoan cu the lien quan."
        )

    from .state import apply_domain_patterns

    pat_q, pat_must, pat_codes, pat_intent = apply_domain_patterns(question)
    is_poly_q = detect_polygamy_intent(question, pat_intent, pat_q, pat_must)
    ctx_norms = [norm_text(c.get("content") or "") for c in contexts]
    has_monogamy = any("mot vo mot chong" in text for text in ctx_norms)
    has_prohibit = any(
        ("cam" in text and ("dang co vo" in text or "dang co chong" in text))
        or "da the" in text
        or "da phu" in text
        or "bigamy" in text
        for text in ctx_norms
    )

    if is_poly_q and (has_monogamy or has_prohibit):
        bullets = []
        for c in contexts[:3]:
            code = c.get("law_code") or "N/A"
            path = c.get("node_path") or ""
            content = c.get("content") or ""
            bullets.append(f"- {content} [{code} - {path}]")
        return (
            "Tu van phap ly (rut gon):\n"
            "- Nguyen tac: Che do mot vo, mot chong; cam chung song nhu vo chong khi dang co vo/chong.\n"
            "- Ap dung: Hanh vi neu co dau hieu xam pham che do mot vo mot chong co the bi xem xet xu ly theo quy dinh phap luat.\n"
            "Can cu trich dan:\n" + "\n".join(bullets)
        )

    bullets = []
    for c in contexts[:3]:
        code = c.get("law_code") or "N/A"
        path = c.get("node_path") or ""
        content = c.get("content") or ""
        bullets.append(f"- {content} [{code} - {path}]")
    return (
        "Tu van phap ly (rut gon):\n"
        "- Tom tat quy dinh lien quan: \n" + "\n".join(bullets)
    )


def _select_relevant_citations(contexts: List[dict], limit: int = 6) -> List[dict]:
    keys = [
        "mot vo mot chong",
        "c?m",
        "cam",
        "dang co vo",
        "dang co chong",
        "chung song nhu vo chong",
        "da the",
        "da phu",
        "bigamy",
    ]
    scored = []
    for c in contexts:
        t = (norm_text(c.get("content") or "")).lower()
        score = sum(1 for k in keys if k in t)
        scored.append((score, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:limit]]


def violation_judgment_heuristic(question: str, contexts: List[dict]) -> dict:
    is_poly = detect_polygamy_intent(question)
    ctx_norms = [norm_text(c.get("content") or "") for c in contexts]
    monogamy_ctx = any("mot vo mot chong" in text for text in ctx_norms)
    fidelity_ctx = any(
        "chung thuy" in text or "nghia vu vo chong" in text for text in ctx_norms
    )
    prohibit_ctx = any(
        ("cam" in text and ("dang co vo" in text or "dang co chong" in text))
        or "da the" in text
        or "da phu" in text
        or "bigamy" in text
        for text in ctx_norms
    )
    if is_poly and (monogamy_ctx or prohibit_ctx or fidelity_ctx):
        rel = _select_relevant_citations(contexts)
        return {
            "answer": synthesize_answer2(question, "", contexts),
            "decision": "VIOLATION",
            "matched": [
                {
                    "law_code": c.get("law_code"),
                    "node_path": c.get("node_path"),
                    "node_id": c.get("node_id"),
                }
                for c in rel[:3]
            ],
            "explanation": "Hanh vi xam pham che do mot vo mot chong/chung thuy; phap luat quy dinh nghia vu chung thuy va cam chung song nhu vo chong voi nguoi khac khi dang co vo/chong.",
        }
    return {
        "answer": synthesize_answer2(question, "", contexts),
        "decision": "UNCERTAIN",
        "matched": [],
        "explanation": "Thieu can cu ro rang tu trich dan de ket luan vi pham.",
    }


__all__ = [
    "synthesize_answer2",
    "_select_relevant_citations",
    "violation_judgment_heuristic",
]
