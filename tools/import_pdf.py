#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Nhập 1 file PDF văn bản pháp luật vào MySQL (tables: laws, law_nodes)

- Trích xuất text từ PDF (ưu tiên PyPDF2; fallback pdfminer.six nếu có)
- Tách theo Điều/Khoản bằng heuristic phổ biến ("Điều X.", "Khoản Y" hoặc "Y.")
- Ghi bản ghi vào bảng `laws` (unique code, doc_type=LAW/DECREE, liên kết related_law_id nếu có) và các `law_nodes` (DIEU, KHOAN) kèm sort_key, path, title.

Cách dùng (với MySQL trong docker-compose: localhost:3307, app/app):

  pip install PyPDF2 pymysql
  python tools/import_pdf.py \
    --file 121-vbhn-vpqh.pdf \
    --code "121/VBHN-VPQH" \
    --title "Văn bản hợp nhất 121/VBHN-VPQH" \
    --effective-start 2019-01-01

Nhập Nghị định (gắn với Luật HN&GĐ):

  python tools/import_pdf.py \
    --file nghi-dinh-x.pdf \
    --title "Nghị định ..." \
    --doc-type DECREE \
    --related-law-code "52/2014/QH13" \
    --effective-start 2015-01-01

Tuỳ chọn DB:
  --db-host localhost --db-port 3307 --db-name laws --db-user app --db-pass app

Lưu ý:
- Đây là parser heuristic, không hoàn hảo cho mọi PDF. Bạn có thể chạy với --dry-run để xem kết quả parse trước khi ghi.
- Sau khi nhập MySQL xong, để RAG sử dụng, cần chạy embed (embed_laws.py) để cập nhật Chroma.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from typing import List, Tuple, Optional

import pymysql


def read_pdf_text(path: str, prefer_pdfminer: bool = False) -> str:
    """Extract text from a PDF.
    - If prefer_pdfminer is True, try pdfminer.six first, then fall back to PyPDF2.
    - Otherwise, try PyPDF2 first, then fall back to pdfminer.six.
    Returns a UTF-8 string with newlines preserved as best effort.
    """
    text = None

    def _pypdf2_extract(p: str) -> Optional[str]:
        try:
            from PyPDF2 import PdfReader  # type: ignore
            reader = PdfReader(p)
            chunks = []
            for page in reader.pages:
                t = page.extract_text() or ""
                chunks.append(t)
            return "\n\n".join(chunks)
        except Exception as e:
            sys.stderr.write(f"[warn] PyPDF2 failed: {e}\n")
            return None

    def _pdfminer_extract(p: str) -> Optional[str]:
        try:
            from pdfminer.high_level import extract_text  # type: ignore
            return extract_text(p)
        except Exception as e:
            sys.stderr.write(f"[warn] pdfminer failed: {e}\n")
            return None

    # Try in selected order
    if prefer_pdfminer:
        text = _pdfminer_extract(path) or _pypdf2_extract(path)
    else:
        text = _pypdf2_extract(path) or _pdfminer_extract(path)

    if text and text.strip():
        return text

    sys.stderr.write(
        "[error] Cannot extract text. Install one of: PyPDF2 or pdfminer.six\n"
        "  pip install PyPDF2\n  pip install pdfminer.six\n"
    )
    sys.exit(2)


def normalize_lines(text: str) -> List[str]:
    """Basic cleanup: normalize whitespace, split into lines, drop leading/trailing empty clusters.
    Also trims spaces before punctuation to mitigate common PDF extraction artifacts.
    """
    # Normalize Windows CRLF and multiple spaces
    t = text.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse 3+ newlines into 2 to avoid huge gaps
    t = re.sub(r"\n{3,}", "\n\n", t)
    # Trim trailing spaces per line and collapse multi-spaces
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in t.split("\n")]
    # Remove spaces before common punctuation
    lines = [re.sub(r"\s+([,.;:!?])", r"\1", ln) for ln in lines]
    # Remove leading/trailing empty lines
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return lines


_RE_DIEU = re.compile(r"^(Điều|DIEU)\s+([IVXLCDM]+|\d{1,3})(?:\.|:)?\s*(.*)$", re.IGNORECASE)
_RE_KHOAN = re.compile(r"^(Khoản|KHOAN)\s+(\d{1,2})(?:\.|:)?\s*(.*)$", re.IGNORECASE)
_RE_STT = re.compile(r"^(\d{1,2})\.(.*)$")  # e.g., "1. ..." as Khoản
_RE_CHUONG = re.compile(r"^(Chương|CHUONG)\s+([IVXLCDM]+|\d{1,3})(?:\.|:)?\s*(.*)$", re.IGNORECASE)


# Override regexes with diacritic-tolerant patterns (redefine after initial declarations)
_RE_DIEU = re.compile(r"^(Điều|DIEU|Dieu)\s+([IVXLCDM]+|\d{1,3})[\.:]?\s*(.*)$", re.IGNORECASE | re.UNICODE)
_RE_KHOAN = re.compile(r"^(Khoản|KHOAN|Khoan)\s+(\d{1,2})[\.:]?\s*(.*)$", re.IGNORECASE | re.UNICODE)
_RE_STT = re.compile(r"^(\d{1,2})[\.)]\s*(.*)$")
_RE_CHUONG = re.compile(r"^(Chương|CHUONG|Chuong)\s+([IVXLCDM]+|\d{1,3})[\.:]?\s*(.*)$", re.IGNORECASE | re.UNICODE)

# Điểm patterns (allow optional leading dash and optional ')' after word form)
_RE_DIEM_WORD = re.compile(r"^(Điểm|DIEM|Diem)\s+([a-zA-ZđĐ])\)?\s*(.*)$")
_RE_DIEM_LETTER = re.compile(r"^[\-•]?\s*([a-zA-ZđĐ])\)\s+(.*)$")

class Khoan:
    def __init__(self, number: str):
        self.number = number
        self.preamble: str = ""  # text before first 'điểm'
        self.diems: List[Tuple[str, str]] = []  # list of (letter, text)


class Dieu:
    def __init__(self, number: str, heading: str):
        self.number = number  # as string (may be roman)
        self.heading = heading.strip()
        self.khoans: List[Khoan] = []


def roman_to_int(s: str) -> Optional[int]:
    roman_map = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    s = s.upper()
    if not re.fullmatch(r"[IVXLCDM]+", s):
        return None
    total = 0
    prev = 0
    for ch in reversed(s):
        val = roman_map.get(ch, 0)
        if val < prev:
            total -= val
        else:
            total += val
            prev = val
    return total


_RE_DIEM_WORD = re.compile(r"^(Điểm|DIEM)\s+([a-zA-ZđĐ])\)\s*(.*)$")
_RE_DIEM_LETTER = re.compile(r"^([a-zA-ZđĐ])\)\s+(.*)$")


class Chuong:
    def __init__(self, number: str, heading: str):
        self.number = number
        self.heading = heading.strip()
        self.dieus: List[Dieu] = []


def parse_structure(lines: List[str]) -> Tuple[List[Chuong], List[Dieu]]:
    """Parse document structure: Chapters -> Articles -> Clauses -> Items.
    Returns (list_of_chapters, orphan_articles).
    """
    chapters: List[Chuong] = []
    orphans: List[Dieu] = []
    cur_chuong: Optional[Chuong] = None
    cur_dieu: Optional[Dieu] = None
    cur_khoan: Optional[Khoan] = None
    buf_khoan: List[str] = []  # buffer before first diem in a khoan
    cur_diem_letter: Optional[str] = None
    buf_diem: List[str] = []

    def flush_diem():
        nonlocal cur_diem_letter, buf_diem
        if cur_khoan and cur_diem_letter is not None:
            content = " ".join(x for x in buf_diem).strip()
            if content:
                cur_khoan.diems.append((cur_diem_letter, content))
        cur_diem_letter = None
        buf_diem = []

    def flush_khoan():
        nonlocal cur_khoan, buf_khoan
        flush_diem()
        if cur_dieu and cur_khoan is not None:
            # Save preamble text
            pre = " ".join(x for x in buf_khoan).strip()
            cur_khoan.preamble = pre
            cur_dieu.khoans.append(cur_khoan)
        cur_khoan = None
        buf_khoan = []

    for raw in lines:
        line = raw.strip()
        if not line:
            # paragraph separator
            if cur_diem_letter is not None:
                buf_diem.append("")
            elif cur_khoan is not None:
                buf_khoan.append("")
            continue

        # Chapter?
        m_c = _RE_CHUONG.match(line)
        if m_c:
            flush_khoan()
            cur_chuong = Chuong(m_c.group(2), m_c.group(3) or "")
            chapters.append(cur_chuong)
            continue

        m_d = _RE_DIEU.match(line)
        if m_d:
            flush_khoan()
            cur_dieu = Dieu(m_d.group(2), m_d.group(3) or "")
            if cur_chuong:
                cur_chuong.dieus.append(cur_dieu)
            else:
                orphans.append(cur_dieu)
            continue

        if cur_dieu is None:
            continue  # skip preamble before first article

        m_k = _RE_KHOAN.match(line)
        if m_k:
            flush_khoan()
            cur_khoan = Khoan(m_k.group(2))
            rest = (m_k.group(3) or "").strip()
            if rest:
                buf_khoan = [rest]
            else:
                buf_khoan = []
            continue

        m_stt = _RE_STT.match(line)
        if m_stt:
            flush_khoan()
            cur_khoan = Khoan(m_stt.group(1))
            rest = (m_stt.group(2) or "").strip()
            buf_khoan = [rest] if rest else []
            continue

        if cur_khoan is not None:
            # Detect DIEM
            m_dw = _RE_DIEM_WORD.match(line)
            m_dl = _RE_DIEM_LETTER.match(line) if not m_dw else None
            if m_dw or m_dl:
                flush_diem()
                letter = (m_dw.group(2) if m_dw else m_dl.group(1)).lower()
                rest = (m_dw.group(3) if m_dw else m_dl.group(2)) or ""
                cur_diem_letter = letter
                buf_diem = [rest.strip()] if rest.strip() else []
                continue

            # Accumulate into current diem or khoan preamble
            if cur_diem_letter is not None:
                buf_diem.append(line)
            else:
                buf_khoan.append(line)

    # Final flushes
    flush_khoan()
    return chapters, orphans


def infer_code_from_filename(path: str) -> str:
    name = os.path.basename(path)
    name = re.sub(r"\.pdf$", "", name, flags=re.IGNORECASE)
    # e.g., "121-vbhn-vpqh" or "cach thi hanh luat" -> tokens
    parts = re.split(r"[\s_\-]+", name)
    parts = [p.upper() for p in parts if p]
    return "/".join(parts)


def connect_db(host: str, port: int, user: str, password: str, db: str):
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=db,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )
    return conn


def get_law_id_by_code(conn, code: str) -> Optional[int]:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM laws WHERE code=%s", (code,))
        row = cur.fetchone()
        return int(row["id"]) if row else None


def upsert_law(conn, code: str, title: str, issuing_body: Optional[str] = None,
               promulgation_date: Optional[str] = None,
               effective_date: Optional[str] = None,
               expire_date: Optional[str] = None,
               doc_type: Optional[str] = None,
               related_law_code: Optional[str] = None) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM laws WHERE code=%s", (code,))
        row = cur.fetchone()
        related_id = None
        if related_law_code:
            cur.execute("SELECT id FROM laws WHERE code=%s", (related_law_code,))
            r = cur.fetchone()
            related_id = int(r["id"]) if r else None
        if row:
            # If exists, optionally update doc_type/related_law if provided
            if doc_type or related_id is not None:
                cur.execute(
                    "UPDATE laws SET doc_type=COALESCE(%s, doc_type), related_law_id=%s WHERE id=%s",
                    (doc_type, related_id, int(row["id"]))
                )
            return int(row["id"])
        cur.execute(
            """
            INSERT INTO laws (code, doc_type, title, issuing_body, promulgation_date, effective_date, expire_date, status, related_law_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (code, (doc_type or 'LAW'), title, issuing_body, promulgation_date, effective_date, expire_date, None, related_id),
        )
        return int(cur.lastrowid)


def delete_nodes_for_law(conn, law_id: int):
    """Delete existing nodes of a law bottom-up to satisfy self-referencing FK.

    MySQL FK `fk_nodes_parent` (parent_id -> law_nodes.id) is RESTRICT by default
    in this project, so we must delete children before parents. We proceed by
    semantic level depth, then do a final sweep by parent_id.
    """
    with conn.cursor() as cur:
        # Delete deeper levels first
        levels_bottom_up = [
            'DIEM', 'KHOAN', 'DIEU', 'TIEU_MUC', 'MUC', 'CHUONG', 'PHAN'
        ]
        for lvl in levels_bottom_up:
            cur.execute(
                "DELETE FROM law_nodes WHERE law_id=%s AND level=%s",
                (law_id, lvl)
            )
        # Safety sweep for any remaining children, then roots
        cur.execute(
            "DELETE FROM law_nodes WHERE law_id=%s AND parent_id IS NOT NULL",
            (law_id,)
        )
        cur.execute(
            "DELETE FROM law_nodes WHERE law_id=%s AND parent_id IS NULL",
            (law_id,)
        )


def to_int_or_roman(s: str) -> Optional[int]:
    s = s.strip()
    if s.isdigit():
        return int(s)
    return roman_to_int(s)


def _letter_index(letter: str) -> int:
    # Simple order a..z (đ close to d)
    l = letter.lower()
    if l == 'đ':
        return ord('d') - 96  # place near d
    if 'a' <= l <= 'z':
        return ord(l) - 96
    return 99


def insert_nodes(conn, law_id: int, code: str, chapters: List[Chuong], orphans: List[Dieu], effective_start: Optional[str], effective_end: Optional[str]):
    with conn.cursor() as cur:
        # First, insert chapters
        chapter_id_by_key: dict[str, int] = {}
        for ch in chapters:
            ch_num_int = to_int_or_roman(ch.number) or 0
            ch_sort = f"{ch_num_int:03d}"
            ch_path = f"/{code}/Chuong-{ch.number}"
            ch_title = ch.heading or f"Chương {ch.number}"
            cur.execute(
                """
                INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, heading, content_text, sort_key, path, title, effective_start, effective_end)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (law_id, None, 'CHUONG', f"Chương {ch.number}", ch.heading or None, None, ch_sort, ch_path, ch_title, effective_start, effective_end)
            )
            chapter_id_by_key[ch.number] = int(cur.lastrowid)

        def _insert_dieu(d: Dieu, parent_id: Optional[int], chapter_number: Optional[str] = None):
            num_int = to_int_or_roman(d.number) or 0
            d_sort = f"{num_int:03d}"
            if parent_id is None:
                d_path = f"/{code}/Dieu-{d.number}"
            else:
                # If under chapter, include it in path for readability
                ch_seg = f"Chuong-{chapter_number}" if chapter_number else "Chuong"
                d_path = f"/{code}/{ch_seg}/Dieu-{d.number}"
            d_title = d.heading or f"Điều {d.number}"
            cur.execute(
                """
                INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, heading, content_text, sort_key, path, title, effective_start, effective_end)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (law_id, parent_id, 'DIEU', f"Điều {d.number}", d.heading or None, None, d_sort, d_path, d_title, effective_start, effective_end)
            )
            dieu_id = int(cur.lastrowid)

            # Insert Khoans (+ optional Diems)
            k_index = 0
            for k in d.khoans:
                k_index += 1
                try:
                    k_int = int(k.number)
                except Exception:
                    k_int = k_index
                k_sort = f"{d_sort}.{k_int:03d}"
                k_path = f"{d_path}/Khoan-{k.number}"
                k_title = f"Khoản {k.number}"
                cur.execute(
                    """
                    INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, heading, content_text, sort_key, path, title, effective_start, effective_end)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (law_id, dieu_id, 'KHOAN', f"Khoản {k.number}", None, (k.preamble or None), k_sort, k_path, k_title, effective_start, effective_end)
                    )
                khoan_id = int(cur.lastrowid)

                # Insert diems
                d_index = 0
                for letter, d_text in k.diems:
                    d_index += 1
                    di = _letter_index(letter)
                    di = di if di < 99 else d_index
                    di_sort = f"{k_sort}.{di:03d}"
                    di_path = f"{k_path}/Diem-{letter}"
                    di_title = f"Điểm {letter}"
                    cur.execute(
                        """
                        INSERT INTO law_nodes (law_id, parent_id, level, ordinal_label, heading, content_text, sort_key, path, title, effective_start, effective_end)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (law_id, khoan_id, 'DIEM', f"Điểm {letter}", None, d_text, di_sort, di_path, di_title, effective_start, effective_end)
                    )

        # Insert dieus under chapters
        for ch in chapters:
            parent_id = chapter_id_by_key.get(ch.number)
            for d in ch.dieus:
                _insert_dieu(d, parent_id, ch.number)

        # Insert orphan dieus at root
        for d in orphans:
            _insert_dieu(d, None, None)


def main():
    ap = argparse.ArgumentParser(description="Import Vietnamese law PDF into MySQL (laws, law_nodes)")
    ap.add_argument("--file", required=True, help="Path to PDF file")
    ap.add_argument("--code", help="Law code (e.g., 121/VBHN-VPQH). Default inferred from filename")
    ap.add_argument("--title", help="Law title. Default: first non-empty line or filename")
    ap.add_argument("--effective-start", dest="effective_start", help="YYYY-MM-DD (default: 1900-01-01)")
    ap.add_argument("--effective-end", dest="effective_end", help="YYYY-MM-DD (default: 9999-12-31)")
    ap.add_argument("--issuing-body", dest="issuing_body", help="Issuing body (optional)")
    ap.add_argument("--promulgation-date", dest="promulgation_date", help="YYYY-MM-DD (optional)")
    ap.add_argument("--replace", action="store_true", help="If law code exists: delete old nodes and re-import")
    ap.add_argument("--doc-type", dest="doc_type", choices=["LAW", "DECREE"], default=None, help="Document type: LAW or DECREE")
    ap.add_argument("--related-law-code", dest="related_law_code", help="Code of the law this document is related to (e.g., 52/2014/QH13)")
    ap.add_argument("--dry-run", action="store_true", help="Parse only, do not write to DB")
    ap.add_argument("--prefer-pdfminer", action="store_true", help="Prefer pdfminer.six over PyPDF2 for text extraction")

    ap.add_argument("--db-host", default=os.getenv("DB_HOST") or "localhost")
    ap.add_argument("--db-port", type=int, default=int(os.getenv("DB_PORT") or 3307))
    ap.add_argument("--db-name", default=os.getenv("DB_NAME") or "laws")
    ap.add_argument("--db-user", default=os.getenv("DB_USER") or "app")
    ap.add_argument("--db-pass", default=os.getenv("DB_PASS") or "app")

    args = ap.parse_args()

    # Heuristic: if doc-type is not provided, infer from filename keywords
    if not args.doc_type:
        fname = os.path.basename(args.file).lower()
        if "nghi" in fname or "nghidinh" in fname or "nghi-dinh" in fname or "nghi_dinh" in fname:
            args.doc_type = "DECREE"
        else:
            args.doc_type = "LAW"

    # Provide sensible defaults for decrees if not set
    if args.doc_type == "DECREE":
        if not args.related_law_code:
            args.related_law_code = os.getenv("RELATED_LAW_CODE", "52/2014/QH13")
        if not args.effective_start:
            args.effective_start = os.getenv("DECREE_EFFECTIVE_START", "2015-01-01")

    if not os.path.isfile(args.file):
        sys.stderr.write(f"File not found: {args.file}\n")
        sys.exit(1)

    raw_text = read_pdf_text(args.file, prefer_pdfminer=args.prefer_pdfminer)
    lines = normalize_lines(raw_text)

    # Infer title if not provided: pick first non-empty line that looks like a heading
    title = args.title
    if not title:
        for ln in lines[:50]:
            s = ln.strip()
            if not s:
                continue
            # Skip common headers
            if re.search(r"CỘNG HÒA|XÃ HỘI|ĐỘC LẬP|TỰ DO|HẠNH PHÚC", s, flags=re.IGNORECASE):
                continue
            title = s
            break
        if not title:
            title = os.path.basename(args.file)

    code = args.code or infer_code_from_filename(args.file)

    chapters, orphans = parse_structure(lines)

    if args.dry_run:
        print(f"[DRY] Law code: {code}")
        print(f"[DRY] Title   : {title}")
        # DRY summary
        total_d = sum(len(ch.dieus) for ch in chapters) + len(orphans)
        print(f"[DRY] Parsed  : {total_d} điều (in {len(chapters)} chương + {len(orphans)} điều lẻ)")
        total_k = sum(sum(len(d.khoans) for d in ch.dieus) for ch in chapters) + sum(len(d.khoans) for d in orphans)
        print(f"[DRY] Khoản   : {total_k}")
        demo_dieus: List[Dieu] = []
        for ch in chapters:
            demo_dieus.extend(ch.dieus)
        demo_dieus.extend(orphans)
        for d in demo_dieus[:3]:
            print(f"  - Điều {d.number}: {d.heading} (khoản: {len(d.khoans)})")
            for k in d.khoans[:2]:
                if k.diems:
                    print(f"      + Khoản {k.number} (có {len(k.diems)} điểm)")
                    for letter, txt in k.diems[:2]:
                        print(f"          * Điểm {letter}: {txt[:60]}...")
                else:
                    print(f"      + Khoản {k.number}: {(k.preamble or '')[:80]}...")
        return

    eff_start = args.effective_start or "1900-01-01"
    eff_end = args.effective_end or "9999-12-31"

    conn = connect_db(args.db_host, args.db_port, args.db_user, args.db_pass, args.db_name)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM laws WHERE code=%s", (code,))
            existing = cur.fetchone()

        if existing and not args.replace:
            print(f"Law code '{code}' already exists (id={existing['id']}). Use --replace to overwrite nodes.")
            return

        if existing and args.replace:
            delete_nodes_for_law(conn, int(existing["id"]))
            law_id = int(existing["id"])
        else:
            law_id = upsert_law(conn, code, title, args.issuing_body, args.promulgation_date, eff_start, eff_end, args.doc_type, args.related_law_code)

        insert_nodes(conn, law_id, code, chapters, orphans, eff_start, eff_end)
        conn.commit()
        total_d = sum(len(ch.dieus) for ch in chapters) + len(orphans)
        total_k = sum(sum(len(d.khoans) for d in ch.dieus) for ch in chapters) + sum(len(d.khoans) for d in orphans)
        print(f"Imported law '{code}' (id={law_id}) with {total_d} điều and {total_k} khoản.")
    except Exception as e:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
