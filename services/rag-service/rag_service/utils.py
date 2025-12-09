import json
import re
import unicodedata
from datetime import date, datetime
from typing import Any, Dict, List, Optional


def norm_text(s: str) -> str:
    if s is None:
        return ""
    s = str(s).lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = s.replace("\u0111", "d")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_date(value: str):
    """Parse various ISO-like date/datetime strings into a date object."""
    if not value:
        return None
    s = str(value).strip()
    try:
        if "T" in s:
            s = s.split("T", 1)[0]
        elif " " in s and len(s) > 10:
            s = s.split(" ", 1)[0]
        return date.fromisoformat(s)
    except Exception:
        try:
            return datetime.fromisoformat(str(value)).date()
        except Exception:
            return None


def safe_json_parse(s: str) -> Optional[dict]:
    try:
        return json.loads(s)
    except Exception:
        return None


# Heuristics & scoring helpers -------------------------------------------------

def expand_queries(question: str) -> List[str]:
    """Lightweight query expansion cho QA phap luat tieng Viet."""
    q = (question or "").strip()
    if not q:
        return []
    norm = norm_text(q)
    expansions = [q]

    if detect_polygamy_intent(q):
        expansions.extend(
            [
                "che do mot vo mot chong",
                "cam nguoi dang co vo hoac co chong ket hon hoac chung song nhu vo chong voi nguoi khac",
                "dang co vo ma ket hon voi nguoi khac co bi cam khong",
                "hanh vi vi pham che do mot vo mot chong",
                "dieu 2 luat hon nhan va gia dinh nguyen tac hon nhan",
                "dieu 5 luat hon nhan va gia dinh cac hanh vi bi cam",
            ]
        )

    marriage_markers = ["ket hon", "vo chong", "hon nhan", "dang ky ket hon"]
    affair_markers = [
        "ngoai tinh",
        "nguoi tinh",
        "chung song nhu vo chong",
        "song nhu vo chong",
        "ngoai hon nhan",
        "chung thuy",
    ]
    if any(marker in norm for marker in marriage_markers) or any(
        marker in norm for marker in affair_markers
    ) or ("vo " in norm or " chong " in norm):
        expansions.extend(
            [
                "luat hon nhan va gia dinh quy dinh",
                "dieu kien ket hon luat hon nhan va gia dinh",
                "dieu 5 luat hon nhan va gia dinh cac hanh vi bi cam",
                "che do mot vo mot chong",
                "dieu 19 luat hon nhan va gia dinh nghia vu cua vo chong",
                "nghia vu vo chong luat hon nhan va gia dinh",
            ]
        )

    seen = set()
    out: List[str] = []
    for s in expansions:
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out[:6]


def boost_with_must_phrases_norm(text: str, base: float, phrases: List[str]) -> float:
    if not phrases:
        return base
    t_norm = norm_text(text or "")
    inc = 0.0
    for p in phrases:
        p_norm = norm_text(p or "")
        if p_norm and p_norm in t_norm:
            inc += 0.05
            if inc >= 0.15:
                break
    return min(1.0, base + inc)


def boost_score_norm(text: str, base: float) -> float:
    t_norm = norm_text(text or "")
    boost = 0.0
    if "mot vo mot chong" in t_norm:
        boost += 0.10
    if "cac hanh vi bi cam" in t_norm:
        boost += 0.08
    if "chung song nhu vo chong" in t_norm:
        boost += 0.06
    if "dang co vo" in t_norm or "dang co chong" in t_norm:
        boost += 0.04
    if "chung thuy" in t_norm or "nghia vu vo chong" in t_norm:
        boost += 0.06
    return min(1.0, base + boost)


def penalize_noise(text: str, base: float) -> float:
    t = (text or "").lower()
    tn = norm_text(text or "")
    penalty = 0.0
    if "about:blank" in t:
        penalty += 0.08
    if "mang thai ho" in tn or "tom tat ly do dong y" in tn:
        penalty += 0.08
    if "dieu nay ." in t or "dieu nay." in t or "điều này ." in t:
        penalty += 0.03
    return max(0.0, base - penalty)


def penalize_offtopic(text: str, base: float) -> float:
    t = (text or "").lower()
    penalty = 0.0
    if ("đời" in t or "doi" in t) and ("phạm vi" in t or "pham vi" in t):
        penalty += 0.06
    if "bốn đời" in t or "bon doi" in t or "ba đời" in t or "ba doi" in t:
        penalty += 0.05
    return max(0.0, base - penalty)


def detect_polygamy_intent(
    question: str,
    hint_intent: Optional[str] = None,
    hint_queries: Optional[List[str]] = None,
    hint_phrases: Optional[List[str]] = None,
) -> bool:
    norm = norm_text(question)
    if not norm:
        return False

    def _contains_monogamy_markers(items: Optional[List[str]]) -> bool:
        for item in items or []:
            text = norm_text(item)
            if not text:
                continue
            if "mot vo mot chong" in text or "che do mot vo" in text:
                return True
            if "da the" in text or "da phu" in text or "bigamy" in text or "polygamy" in text:
                return True
        return False

    key_markers = [
        "mot vo mot chong",
        "che do mot vo",
        "da the",
        "da phu",
        "ngoai tinh",
        "nguoi tinh",
        "ngoai hon nhan",
        "quan he ngoai hon nhan",
        "lay nhieu vo",
        "lay nhieu chong",
        "lay them vo",
        "lay them chong",
        "them vo",
        "them chong",
        "chung song nhu vo chong voi nguoi khac",
        "chung song nhu vo chong",
        "song nhu vo chong",
        "bigamy",
        "polygamy",
    ]
    if any(marker in norm for marker in key_markers):
        return True

    if re.search(r"\b\d+\s+(nguoi\s+)?(vo|chong)\b", norm):
        return True
    if re.search(r"\b(vo|chong)\s+thu\s+\d+\b", norm):
        return True
    if re.search(r"\bket hon\s+lan\s+\d+\b", norm) or re.search(r"\blan\s+\d+\s+ket hon\b", norm):
        return True

    spelled_numbers = [
        "hai",
        "ba",
        "bon",
        "tu",
        "nam",
        "sau",
        "bay",
        "tam",
        "chin",
        "muoi",
        "muoi mot",
        "muoi hai",
        "muoi ba",
        "muoi bon",
        "muoi nam",
        "hai muoi",
        "ba muoi",
        "bon muoi",
        "nam muoi",
    ]
    for word in spelled_numbers:
        combos = [
            f"{word} vo",
            f"{word} chong",
            f"{word} nguoi vo",
            f"{word} nguoi chong",
            f"vo thu {word}",
            f"chong thu {word}",
            f"thu {word} vo",
            f"thu {word} chong",
        ]
        if any(combo in norm for combo in combos):
            return True

    status_markers = [
        "dang co vo",
        "da co vo",
        "dang co chong",
        "da co chong",
    ]
    action_markers = [
        "ket hon",
        "dang ky ket hon",
        "chung song nhu vo chong",
        "song nhu vo chong",
        "lay them vo",
        "lay them chong",
        "lay vo thu",
        "lay chong thu",
    ]
    if any(s in norm for s in status_markers) and any(a in norm for a in action_markers):
        return True

    if hint_intent == "YES_NO" and (
        _contains_monogamy_markers(hint_queries) or _contains_monogamy_markers(hint_phrases)
    ):
        return True

    return False

