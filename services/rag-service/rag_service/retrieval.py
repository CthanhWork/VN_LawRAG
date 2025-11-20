from typing import Any, Dict, List, Optional, Tuple, Set
import re

from . import config
from . import state
from .metrics import RET_DOCS
from .utils import (
    boost_score_norm,
    boost_with_must_phrases_norm,
    expand_queries,
    norm_text,
    parse_date,
    penalize_noise,
    penalize_offtopic,
    detect_polygamy_intent,
)
from .llm_qu import query_understanding_llm
from . import config as _cfg


_LAW_CODE_ID_CACHE: Dict[str, Optional[int]] = {}
_LAW_ID_CODE_CACHE: Dict[int, Optional[str]] = {}
_LAW_ID_DOC_TYPE_CACHE: Dict[int, Optional[str]] = {}


def _http_get_json(url: str, params: Optional[Dict[str, Any]] = None, timeout: int = 5) -> Optional[dict]:
    try:
        import requests

        resp = requests.get(url, params=params or {}, timeout=timeout)
        if resp.ok:
            return resp.json()
    except Exception:
        return None
    return None


def _law_code_to_id(law_code: Optional[str]) -> Optional[int]:
    if not law_code:
        return None
    if law_code in _LAW_CODE_ID_CACHE:
        return _LAW_CODE_ID_CACHE.get(law_code)  # type: ignore
    url = f"{_cfg.LAW_SERVICE_URL.rstrip('/')}/api/laws/search"
    data = _http_get_json(url, params={"keyword": law_code, "page": 0, "size": 5})
    law_id: Optional[int] = None
    try:
        for it in (data.get("content") or []):
            code = (it.get("code") or "").strip()
            if code.lower() == law_code.lower():
                law_id = int(it.get("id"))
                break
        if law_id is None:
            # fallback pick first if code contains keyword closely
            for it in (data.get("content") or []):
                code = (it.get("code") or "").strip()
                if law_code.lower() in code.lower():
                    law_id = int(it.get("id"))
                    break
    except Exception:
        law_id = None
    _LAW_CODE_ID_CACHE[law_code] = law_id
    if law_id is not None and law_id not in _LAW_ID_CODE_CACHE:
        _LAW_ID_CODE_CACHE[law_id] = law_code
    return law_id


def _law_id_to_code(law_id: Optional[int]) -> Optional[str]:
    if law_id is None:
        return None
    if law_id in _LAW_ID_CODE_CACHE:
        return _LAW_ID_CODE_CACHE.get(law_id)  # type: ignore
    url = f"{_cfg.LAW_SERVICE_URL.rstrip('/')}/api/laws/{int(law_id)}"
    data = _http_get_json(url)
    code = None
    try:
        code = (data.get("code") or "").strip()
    except Exception:
        code = None
    _LAW_ID_CODE_CACHE[law_id] = code
    if code is not None and code not in _LAW_CODE_ID_CACHE:
        _LAW_CODE_ID_CACHE[code] = law_id
    return code


def _law_id_to_doc_type(law_id: Optional[int]) -> Optional[str]:
    if law_id is None:
        return None
    if law_id in _LAW_ID_DOC_TYPE_CACHE:
        return _LAW_ID_DOC_TYPE_CACHE.get(law_id)  # type: ignore
    url = f"{_cfg.LAW_SERVICE_URL.rstrip('/')}/api/laws/{int(law_id)}"
    data = _http_get_json(url)
    doc_type = None
    try:
        doc_type = (data.get("docType") or "").strip().upper() or None
    except Exception:
        doc_type = None
    _LAW_ID_DOC_TYPE_CACHE[law_id] = doc_type
    return doc_type


def _search_nodes(keyword: str, effective_at: Optional[str] = None, page: int = 0, size: int = 20) -> List[dict]:
    url = f"{_cfg.LAW_SERVICE_URL.rstrip('/')}/api/nodes/search"
    params: Dict[str, Any] = {"keyword": keyword, "page": page, "size": size}
    if effective_at:
        params["effectiveAt"] = effective_at
    data = _http_get_json(url, params=params)
    try:
        return list(data.get("content") or [])
    except Exception:
        return []


# Match both "Điều" and ASCII fallback "Dieu"
_RE_ARTICLE = re.compile(r"\b(Điều|Dieu)\s+(\d{1,3})\b", re.IGNORECASE)
# Match common decree citation patterns, e.g., "Nghị định 123/2015/NĐ-CP" or "Nghị định số 12/2021/ND-CP"
_RE_DECREE = re.compile(
    r"Ngh?i\s*đ?i?n?h?\s*(s?o?\s*)?(?P<num>\d{1,3})\s*/\s*(?P<year>\d{4})\s*/\s*(?P<suf>NĐ-CP|ND-CP)",
    re.IGNORECASE,
)


def _find_article_refs(text: str) -> Set[int]:
    out: Set[int] = set()
    if not text:
        return out
    try:
        for m in _RE_ARTICLE.finditer(text):
            try:
                n = int(m.group(2))
                out.add(n)
            except Exception:
                continue
    except Exception:
        return out
    return out


def _find_decree_codes(text: str) -> Set[str]:
    out: Set[str] = set()
    if not text:
        return out
    try:
        for m in _RE_DECREE.finditer(text):
            num = (m.group("num") or "").strip()
            year = (m.group("year") or "").strip()
            suf = (m.group("suf") or "").upper().replace("ND-CP", "NĐ-CP")
            if num and year and suf:
                out.add(f"{num}/{year}/{suf}")
    except Exception:
        return out
    return out


def _select_article_node(nodes: List[dict], article_no: int, law_id: Optional[int]) -> Optional[dict]:
    if not nodes:
        return None
    # Prefer nodes that look like the article header (level=ARTICLE or path startswith Điều N)
    def score(n: dict) -> Tuple[int, int, int]:
        lvl = (n.get("level") or "").upper()
        path = (n.get("path") or "")
        law_ok = 1 if (law_id is None or int(n.get("lawId") or -1) == int(law_id)) else 0
        is_article = 1 if (lvl == "ARTICLE" or path.strip().startswith(f"Điều {article_no}")) else 0
        short_path = 1 if ("→" not in path) else 0
        return (law_ok, is_article, short_path)

    nodes_sorted = sorted(nodes, key=score, reverse=True)
    for n in nodes_sorted:
        try:
            pid_ok = law_id is None or int(n.get("lawId") or -1) == int(law_id)
            path = (n.get("path") or "")
            if pid_ok and (path.strip().startswith(f"Điều {article_no}") or (n.get("level") or "").upper() == "ARTICLE"):
                return n
        except Exception:
            continue
    return nodes_sorted[0] if nodes_sorted else None


def _http_get_list(url: str, params: Optional[Dict[str, Any]] = None, timeout: int = 8) -> Optional[List[dict]]:
    try:
        import requests

        resp = requests.get(url, params=params or {}, timeout=timeout)
        if resp.ok:
            data = resp.json()
            if isinstance(data, list):
                return data
    except Exception:
        return None
    return None


def _fetch_toc(law_id: Optional[int]) -> List[dict]:
    if law_id is None:
        return []
    url = f"{_cfg.LAW_SERVICE_URL.rstrip('/')}/api/laws/{int(law_id)}/toc"
    data = _http_get_list(url) or []
    return data


def _norm_label(s: str) -> str:
    s = (s or "").strip().lower()
    # crude ASCII fallback for "Điều" -> "dieu"
    return s.replace("đ", "d").replace("Điều", "dieu").replace("điều", "dieu")


def _find_article_in_toc(toc: List[dict], article_no: int) -> Optional[dict]:
    target1 = f"Điều {article_no}"
    target2 = f"dieu {article_no}"

    stack = list(toc or [])
    while stack:
        node = stack.pop()
        label = (node.get("label") or "").strip()
        if label.startswith(target1) or _norm_label(label).startswith(target2):
            return node
        for ch in (node.get("children") or [])[::-1]:
            stack.append(ch)
    return None


def _fetch_node(node_id: Optional[int]) -> Optional[dict]:
    if node_id is None:
        return None
    url = f"{_cfg.LAW_SERVICE_URL.rstrip('/')}/api/nodes/{int(node_id)}"
    return _http_get_json(url) or None


def _fetch_related_laws(law_id: Optional[int], doc_type: Optional[str] = None) -> List[dict]:
    if law_id is None:
        return []
    base = f"{_cfg.LAW_SERVICE_URL.rstrip('/')}/api/laws/{int(law_id)}/related"
    params = {"docType": doc_type} if doc_type else None
    data = _http_get_list(base, params=params) or []
    return data


def _collect_child_ids(toc_node: dict) -> List[int]:
    out: List[int] = []
    stack = list((toc_node.get("children") or [])[::-1])
    while stack:
        n = stack.pop()
        nid = n.get("id")
        try:
            if nid is not None:
                out.append(int(nid))
        except Exception:
            pass
        for ch in (n.get("children") or [])[::-1]:
            stack.append(ch)
    return out


def _ctx_items_for_article_and_children(law_id: Optional[int], article_id: int, max_children: int = 6) -> List[dict]:
    items: List[dict] = []
    main = _fetch_node(article_id)
    if main and isinstance(main, dict):
        items.append({
            "law_code": _law_id_to_code(law_id) or "",
            "node_path": main.get("path") or "",
            "node_id": main.get("id"),
            "content": (main.get("contentText") or ""),
            "doc_type": _law_id_to_doc_type(law_id) or "",
        })
        # children via TOC
        toc = _fetch_toc(law_id)
        if toc:
            art_node = None
            # find the same article in toc by id match
            stack = list(toc)
            while stack:
                t = stack.pop()
                if t.get("id") == article_id:
                    art_node = t
                    break
                for ch in (t.get("children") or [])[::-1]:
                    stack.append(ch)
            if art_node:
                child_ids = _collect_child_ids(art_node)[:max_children]
                for cid in child_ids:
                    nd = _fetch_node(cid)
                    if nd and isinstance(nd, dict):
                        items.append({
                            "law_code": _law_id_to_code(law_id) or "",
                            "node_path": nd.get("path") or "",
                            "node_id": nd.get("id"),
                            "content": (nd.get("contentText") or ""),
                            "doc_type": _law_id_to_doc_type(law_id) or "",
                        })
    return items


def _make_ctx_from_node(n: dict) -> Optional[dict]:
    if not n:
        return None
    node_id = n.get("id")
    if node_id is None:
        return None
    law_id = n.get("lawId")
    law_code = _law_id_to_code(law_id)
    doc_type = _law_id_to_doc_type(law_id)
    return {
        "law_code": law_code or "",
        "node_path": n.get("path") or "",
        "node_id": node_id,
        "content": n.get("contentText") or "",
        "doc_type": doc_type or "",
    }


def expand_references(contexts: List[dict], effective_at: Optional[str] = None, max_extra: int = 8, question: Optional[str] = None) -> List[dict]:
    """Expand contexts by following in-text references to articles (Điều N) within the same law.

    - Scans top contexts for patterns like "Điều 8" and pulls the referenced article node
      from law-service's search, restricted to the same law when possible.
    - Deduplicates by node_id and returns original contexts + new items (up to max_extra more).
    """
    if not contexts:
        return []
    seen_ids: Set[Any] = set(c.get("node_id") for c in contexts if c.get("node_id") is not None)
    additions: List[dict] = []
    for c in contexts[: max(8, len(contexts))]:
        content = c.get("content") or ""
        law_code = c.get("law_code")
        refs = _find_article_refs(content)
        dcrees = _find_decree_codes(content)
        if not refs:
            refs = set()
        law_id = _law_code_to_id(law_code)
        for art in sorted(refs):
            try:
                nodes = _search_nodes(f"Điều {art}", effective_at=effective_at, page=0, size=10)
                best = _select_article_node(nodes, art, law_id)
                # Prefer article + a few children to include full nội dung
                if best and best.get("id") is not None:
                    art_id = int(best.get("id"))
                    extra_items = _ctx_items_for_article_and_children(law_id, art_id, max_children=6) or []
                    for it in extra_items:
                        if it.get("node_id") not in seen_ids and it.get("content"):
                            additions.append(it)
                            seen_ids.add(it.get("node_id"))
                            if len(additions) >= max_extra:
                                break
                else:
                    # Fallback via TOC when search by content_text doesn't find the article
                    toc = _fetch_toc(law_id)
                    toc_art = _find_article_in_toc(toc, art) if toc else None
                    if toc_art and toc_art.get("id") is not None:
                        art_id = int(toc_art.get("id"))
                        extra_items = _ctx_items_for_article_and_children(law_id, art_id, max_children=6) or []
                        for it in extra_items:
                            if it.get("node_id") not in seen_ids and it.get("content"):
                                additions.append(it)
                                seen_ids.add(it.get("node_id"))
                                if len(additions) >= max_extra:
                                    break
            except Exception:
                continue
        # Expand decrees referenced in the content by pulling relevant nodes from that decree
        for code in sorted(dcrees):
            try:
                dec_id = _law_code_to_id(code)
                if dec_id is None:
                    continue
                # Search nodes by the original question context would be ideal, but we only have content here.
                # Use the article/condition keywords from this content as keyword query.
                # Fall back to a generic search for the decree code to fetch some nodes and then filter by lawId.
                candidates = _search_nodes(code, effective_at=effective_at, page=0, size=20) or []
                # Prefer matching this decree by lawId, and keep a few nodes with content present
                picked = 0
                for nd in candidates:
                    try:
                        if int(nd.get("lawId") or -1) != int(dec_id):
                            continue
                    except Exception:
                        continue
                    item = _make_ctx_from_node(nd)
                    if item and item.get("node_id") not in seen_ids and item.get("content"):
                        additions.append(item)
                        seen_ids.add(item.get("node_id"))
                        picked += 1
                        if len(additions) >= max_extra or picked >= 4:
                            break
            except Exception:
                continue
        # Also include decrees that are explicitly linked to the base law (related=LAW) when available
        try:
            if law_id is not None and (c.get("doc_type") or "").upper() == "LAW":
                rel_decs = _fetch_related_laws(law_id, doc_type="DECREE") or []
                # limit number of related decrees to avoid noise
                for dec in rel_decs[:2]:
                    dec_id = dec.get("id")
                    if dec_id is None:
                        continue
                    # search nodes using the original question where possible; fallback to article content
                    kw = (question or content or str(dec.get("code") or "")).strip()
                    cand = _search_nodes(kw, effective_at=effective_at, page=0, size=30) or []
                    picked = 0
                    for nd in cand:
                        try:
                            if int(nd.get("lawId") or -1) != int(dec_id):
                                continue
                        except Exception:
                            continue
                        item = _make_ctx_from_node(nd)
                        if item and item.get("node_id") not in seen_ids and item.get("content"):
                            additions.append(item)
                            seen_ids.add(item.get("node_id"))
                            picked += 1
                            if len(additions) >= max_extra or picked >= 3:
                                break
        except Exception:
            pass
        if len(additions) >= max_extra:
            break
    # Put additions first so downstream consumers that slice [:k] will include the referenced articles
    return additions + contexts


def _fetch_full_node(node_id: Optional[int]) -> Optional[dict]:
    if node_id is None:
        return None
    try:
        import requests

        url = f"{config.LAW_SERVICE_URL.rstrip('/')}/api/nodes/{int(node_id)}"
        resp = requests.get(url, timeout=5)
        if resp.ok:
            return resp.json()
    except Exception:
        return None
    return None


def _enrich_contexts(contexts: List[dict], limit: int = 8) -> List[dict]:
    out: List[dict] = []
    for c in (contexts or [])[:limit]:
        node_id = c.get("node_id")
        full = _fetch_full_node(node_id)
        if full and isinstance(full, dict):
            text = (full.get("contentText") or c.get("content") or "").strip()
            path = (full.get("path") or c.get("node_path") or "").strip()
            out.append({
                "law_code": c.get("law_code"),
                "node_path": path,
                "node_id": node_id,
                "content": text,
                "doc_type": c.get("doc_type") or "",
            })
        else:
            out.append({
                "law_code": c.get("law_code"),
                "node_path": c.get("node_path") or "",
                "node_id": node_id,
                "content": c.get("content") or "",
                "doc_type": c.get("doc_type") or "",
            })
    return out


def retrieve(question: str, effective_at: str, k: int = 8):
    if not state.ensure_inited():
        return [
            {
                "law_code": "N/A",
                "node_path": "",
                "node_id": None,
                "content": "Chưa khởi tạo mô hình/Chroma. Kiểm tra logs của container rag-service.",
            }
        ]

    qv = state.emb.encode([question])[0].tolist()
    res = state.col.query(query_embeddings=[qv], n_results=k)
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]

    eff_date = parse_date(effective_at) or __import__("datetime").date.today()
    out = []
    for text, m in zip(docs, metas):
        s_raw = m.get("effective_start") or "1900-01-01"
        e_raw = m.get("effective_end") or "9999-12-31"
        s = parse_date(s_raw) or __import__("datetime").date(1900, 1, 1)
        e = parse_date(e_raw) or __import__("datetime").date(9999, 12, 31)
        if s <= eff_date <= e:
            out.append({
                "law_code": m.get("law_code"),
                "node_path": m.get("node_path") or "",
                "node_id": m.get("node_id"),
                "content": text,
                "doc_type": m.get("doc_type") or "",
            })
    if not out:
        for text, m in zip(docs, metas):
            out.append({
                "law_code": m.get("law_code"),
                "node_path": m.get("node_path") or "",
                "node_id": m.get("node_id"),
                "content": text,
                "doc_type": m.get("doc_type") or "",
            })
    RET_DOCS.observe(len(out))
    return out


def retrieve2(question: str, effective_at: str, k: int = 8):
    """Improved retrieval with LLM query understanding first, then expansion, filters and rerank."""
    if not state.ensure_inited():
        return [
            {
                "law_code": "N/A",
                "node_path": "",
                "node_id": None,
                "content": "Chưa khởi tạo mô hình/Chroma. Kiểm tra logs của container rag-service.",
            }
        ]

    qu = query_understanding_llm(question, effective_at)
    pat_q, pat_must, pat_codes, pat_intent = state.apply_domain_patterns(question)
    is_poly = detect_polygamy_intent(question, pat_intent, pat_q, pat_must)
    q_norm = norm_text(question)
    is_marriage_cond = (
        "dieu kien ket hon" in q_norm
        or "dang ky ket hon" in q_norm
        or "tuoi ket hon" in q_norm
        or any("dieu 8" in norm_text(x) for x in (pat_q or []))
    )
    qu_queries: List[str] = []
    qu_keywords: List[str] = []
    qu_must: List[str] = []
    qu_law_codes: List[str] = []
    eff_override = None
    if is_poly:
        extra_queries = [
            "che do mot vo mot chong",
            "cam nguoi dang co vo hoac co chong ket hon hoac chung song nhu vo chong voi nguoi khac",
            "dieu 5 luat hon nhan va gia dinh cac hanh vi bi cam",
            "dieu 2 luat hon nhan va gia dinh nguyen tac hon nhan",
        ]
        qu_queries = (qu_queries or []) + extra_queries
        if not qu_must:
            qu_must = [
                "mot vo mot chong",
                "cac hanh vi bi cam",
                "dang co vo",
                "dang co chong",
                "chung song nhu vo chong",
            ]
    if qu:
        try:
            _qs = list(qu.get("subqueries") or [])
            normalized = qu.get("normalized")
            if isinstance(normalized, str) and normalized.strip():
                _qs.append(normalized.strip())
            filters = qu.get("filters") or {}
            _must = list(filters.get("must_phrases") or [])
            _codes = list(filters.get("law_codes") or [])
            eff_override = filters.get("effective_at") or None
            qu_queries = (qu_queries or []) + _qs
            qu_must = (qu_must or []) + _must
            qu_law_codes = (qu_law_codes or []) + _codes
            qu_keywords = (qu_keywords or []) + _must
        except Exception:
            pass

    # Xây tập truy vấn dựa trên kết quả LLM (từ khóa + subqueries) và patterns
    queries: List[str] = []
    for kw in (qu_keywords or []):
        if kw:
            queries.append(str(kw))
    if pat_q:
        queries.extend(pat_q)
    if qu_queries:
        queries.extend(qu_queries)
    if not queries:
        # Fallback: mở rộng từ chính câu hỏi gốc nếu LLM không trả gì
        queries = expand_queries(question) or [question]
    seenq = set()
    deduped: List[str] = []
    for q in queries:
        if q and q not in seenq:
            seenq.add(q)
            deduped.append(q)
    queries = deduped[:8]
    qvecs = [state.emb.encode([q])[0].tolist() for q in queries]

    res = state.col.query(
        query_embeddings=qvecs,
        n_results=max(k, 8),
        include=["documents", "metadatas", "distances"],
    )

    merged: Dict[Any, Dict[str, Any]] = {}
    distances = res.get("distances", [])
    all_docs = res.get("documents", [])
    all_metas = res.get("metadatas", [])

    for qi in range(len(all_docs)):
        docs = all_docs[qi]
        metas = all_metas[qi]
        dists = distances[qi] if qi < len(distances) else [None] * len(docs)
        for text, m, dist in zip(docs, metas, dists):
            node_id = (m or {}).get("node_id")
            sim = 0.0
            try:
                if dist is not None:
                    sim = max(0.0, min(1.0, 1.0 - float(dist)))
            except Exception:
                sim = 0.0
            sim = boost_score_norm(text or "", sim)
            if qu_must:
                sim = boost_with_must_phrases_norm(text or "", sim, qu_must)
            if pat_must:
                sim = boost_with_must_phrases_norm(text or "", sim, pat_must)
            try:
                if is_poly:
                    path = (m.get("node_path") if m else "") or ""
                    p_norm = norm_text(path)
                    t_norm = norm_text(text or "")
                    if "dieu 5" in p_norm or "cac hanh vi bi cam" in t_norm:
                        sim = min(1.0, sim + 0.08)
                if is_marriage_cond:
                    path = (m.get("node_path") if m else "") or ""
                    p_norm2 = norm_text(path)
                    t_norm2 = norm_text(text or "")
                    if "dieu 8" in p_norm2:
                        sim = min(1.0, sim + 0.20)
                    if "dieu kien ket hon" in t_norm2:
                        sim = min(1.0, sim + 0.12)
                    if "nam tu du 20" in t_norm2:
                        sim = min(1.0, sim + 0.08)
                    if "nu tu du 18" in t_norm2:
                        sim = min(1.0, sim + 0.08)
            except Exception:
                pass
            sim = penalize_noise(text or "", sim)
            if is_poly:
                sim = penalize_offtopic(text or "", sim)
            if node_id not in merged or sim > merged[node_id]["_sim"]:
                merged[node_id] = {
                    "law_code": m.get("law_code") if m else None,
                    "node_path": (m.get("node_path") if m else "") or "",
                    "node_id": node_id,
                    "content": text,
                    "doc_type": (m.get("doc_type") if m else "") or "",
                    "effective_start": (m.get("effective_start") if m else None),
                    "effective_end": (m.get("effective_end") if m else None),
                    "_sim": sim,
                }

    try:
        eff_date = parse_date(eff_override or effective_at) or __import__("datetime").date.today()
    except Exception:
        eff_date = parse_date(effective_at) or __import__("datetime").date.today()
    candidates = list(merged.values())
    filtered: List[Dict[str, Any]] = []
    for it in candidates:
        s_raw = it.get("effective_start") or "1900-01-01"
        e_raw = it.get("effective_end") or "9999-12-31"
        s = parse_date(s_raw) or __import__("datetime").date(1900, 1, 1)
        e = parse_date(e_raw) or __import__("datetime").date(9999, 12, 31)
        if s <= eff_date <= e:
            filtered.append(it)
    items = filtered or candidates

    # Extra deterministic retrieval cho các case vi phạm chế độ một vợ một chồng:
    # nếu câu hỏi thể hiện ý định "polygamy" (is_poly=True) thì bổ sung
    # các node tìm trực tiếp từ law-service theo cụm từ khóa mạnh.
    if is_poly:
        try:
            poly_keywords = [
                "mot vo mot chong",
                "che do mot vo mot chong",
                "chung song nhu vo chong",
            ]
            seen_extra: Set[int] = set()
            extra_items: List[Dict[str, Any]] = []
            eff_str = eff_date.isoformat()
            for kw in poly_keywords:
                nodes = _search_nodes(kw, effective_at=eff_str, page=0, size=5)
                for n in nodes:
                    try:
                        nid = int(n.get("id"))
                    except Exception:
                        continue
                    if nid in seen_extra:
                        continue
                    seen_extra.add(nid)
                    law_id = n.get("lawId")
                    law_code = _law_id_to_code(law_id) or ""
                    doc_type = _law_id_to_doc_type(law_id) or "LAW"
                    node_path = (n.get("path") or "").strip()
                    content = (n.get("contentText") or n.get("contentHtml") or "").strip()
                    if not content:
                        continue
                    extra_items.append(
                        {
                            "law_code": law_code,
                            "node_path": node_path,
                            "node_id": nid,
                            "content": content,
                            "doc_type": doc_type,
                            "effective_start": n.get("effectiveStart") or "1900-01-01",
                            "effective_end": n.get("effectiveEnd") or "9999-12-31",
                            "_sim": 1.0,
                        }
                    )

            if extra_items:
                existing_ids = {it.get("node_id") for it in items}
                # Ưu tiên chèn các node "một vợ một chồng" lên đầu danh sách.
                for ei in extra_items:
                    if ei["node_id"] not in existing_ids:
                        items.insert(0, ei)
                        existing_ids.add(ei["node_id"])
        except Exception:
            # Không để lỗi deterministic search phá hỏng retrieval thông thường.
            pass
    items.sort(key=lambda x: x.get("_sim", 0.0), reverse=True)
    out = [
        {
            "law_code": it.get("law_code"),
            "node_path": it.get("node_path") or "",
            "node_id": it.get("node_id"),
            "content": it.get("content"),
            "doc_type": it.get("doc_type") or "",
        }
        for it in items[:k]
    ]
    RET_DOCS.observe(len(out))
    return out


__all__ = ["retrieve", "retrieve2", "_enrich_contexts", "expand_references"]
