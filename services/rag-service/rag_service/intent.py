from typing import Literal

from .utils import norm_text


Mode = Literal["VIOLATION_CHECK", "LEGAL_ADVICE"]


def classify_mode(question: str) -> Mode:
    """
    Phân loại câu hỏi thành:
      - VIOLATION_CHECK: hỏi "có vi phạm / có bị xử lý không?"
      - LEGAL_ADVICE: hỏi quyền, nghĩa vụ, thủ tục, điều kiện...
    Dùng rule đơn giản, áp dụng chung cho mọi lĩnh vực.
    """
    qn = norm_text(question or "")
    if not qn:
        return "LEGAL_ADVICE"

    violation_markers = [
        "vi pham",
        "co bi phat",
        "co bi xu phat",
        "co bi xu ly",
        "xu phat hanh chinh",
        "xu phat hinh su",
        "phat tien",
        "truy cuu trach nhiem",
        "truy cuu hinh su",
        "trai quy dinh",
        "trai phap luat",
    ]
    question_markers = [
        "co vi pham khong",
        "co phai vi pham khong",
        "co bi phat khong",
        "co bi xu phat khong",
    ]

    if any(m in qn for m in violation_markers) or any(m in qn for m in question_markers):
        return "VIOLATION_CHECK"

    return "LEGAL_ADVICE"


__all__ = ["classify_mode", "Mode"]

