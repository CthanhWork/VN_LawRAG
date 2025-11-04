from flask import Flask, request, jsonify, Response
import os
import time
import json
import re
from datetime import date, datetime
from typing import List, Dict, Any, Optional
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# Lazy-initialized globals
emb = None
client = None
col = None
init_error = None

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "keepitreal/vietnamese-sbert")
CHROMA_PATH = os.getenv("CHROMA_PATH", "/data/chroma")
USE_LLM_QU = os.getenv("USE_LLM_QU", "false").lower() in ("1", "true", "yes")
QU_MODEL = os.getenv("QU_MODEL", os.getenv("OPENAI_MODEL", "gpt-4o-mini"))

app = Flask(__name__)


# Prometheus metrics
REQ_COUNT = Counter('rag_requests_total', 'Total RAG requests', ['endpoint'])
REQ_LAT = Histogram('rag_request_latency_seconds', 'Request latency in seconds', ['endpoint'])
RET_DOCS = Histogram('rag_retrieve_results', 'Number of retrieved documents', buckets=[0, 1, 3, 5, 8, 13, 21])


def ensure_inited():
    """Initialize SentenceTransformer and Chroma on first use.
    Do not crash the app if init fails; remember the error and return 503 later.
    """
    global emb, client, col, init_error
    if emb is not None and client is not None and col is not None:
        return True

    if init_error:
        return False

    try:
        from sentence_transformers import SentenceTransformer
        import chromadb
        os.makedirs(CHROMA_PATH, exist_ok=True)
        emb = SentenceTransformer(EMBEDDING_MODEL)
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        col = client.get_or_create_collection("law_chunks", metadata={"hnsw:space": "cosine"})
        return True
    except Exception as e:
        init_error = str(e)
        return False


def _parse_date(value: str):
    """Parse various ISO-like date/datetime strings into a date object.
    Accepts:
      - YYYY-MM-DD
      - YYYY-MM-DDTHH:MM[:SS][.mmm][Z|Â±HH:MM]
      - YYYY-MM-DD HH:MM[:SS]
    Returns None if unparsable.
    """
    if not value:
        return None
    s = str(value).strip()
    try:
        # Common case: date only
        if 'T' in s:
            s = s.split('T', 1)[0]
        elif ' ' in s and len(s) > 10:
            # Handle "YYYY-MM-DD HH:MM:SS"
            s = s.split(' ', 1)[0]
        return date.fromisoformat(s)
    except Exception:
        try:
            return datetime.fromisoformat(str(value)).date()
        except Exception:
            return None


def _expand_queries(question: str) -> List[str]:
    """Lightweight query expansion for Vietnamese legal QA.
    - Normalizes common shorthand
    - Adds domain synonyms for better recall (multi-query)
    """
    q = (question or "").strip()
    if not q:
        return []
    low = q.lower()

    expansions = [q]

    # Polygamy / monogamy related
    poly_markers = [
        "hai vo", "ba vo", "nhieu vo", "da the", "lay 2 vo", "lay 3 vo",
        "hai vá»£", "ba vá»£", "nhiá»u vá»£", "Ä‘a thÃª", "láº¥y 2 vá»£", "láº¥y 3 vá»£",
        "co the lay nhieu vo", "lay nhieu vo", "chong lay them vo",
    ]
    if any(m in low for m in poly_markers) or ("vá»£" in low and low.count("vá»£") >= 2):
        expansions.extend([
            "cháº¿ Ä‘á»™ má»™t vá»£, má»™t chá»“ng",
            "cáº¥m ngÆ°á»i Ä‘ang cÃ³ vá»£ hoáº·c cÃ³ chá»“ng káº¿t hÃ´n hoáº·c chung sá»‘ng nhÆ° vá»£ chá»“ng vá»›i ngÆ°á»i khÃ¡c",
            "Ä‘ang cÃ³ vá»£ mÃ  káº¿t hÃ´n vá»›i ngÆ°á»i khÃ¡c cÃ³ bá»‹ cáº¥m khÃ´ng",
            "hÃ nh vi vi pháº¡m cháº¿ Ä‘á»™ má»™t vá»£, má»™t chá»“ng",
            "Ä‘iá»u 2 luáº­t hÃ´n nhÃ¢n vÃ  gia Ä‘Ã¬nh nguyÃªn táº¯c",
            "Ä‘iá»u 5 luáº­t hÃ´n nhÃ¢n vÃ  gia Ä‘Ã¬nh cÃ¡c hÃ nh vi bá»‹ cáº¥m",
        ])

    # Generic marriage-law expansions when question mentions vá»£ chá»“ng/káº¿t hÃ´n
    if any(x in low for x in ["káº¿t hÃ´n", "vo chong", "vá»£ chá»“ng", "hÃ´n nhÃ¢n"]):
        expansions.extend([
            "luáº­t hÃ´n nhÃ¢n vÃ  gia Ä‘Ã¬nh quy Ä‘á»‹nh",
            "Ä‘iá»u kiá»‡n káº¿t hÃ´n luáº­t hÃ´n nhÃ¢n vÃ  gia Ä‘Ã¬nh",
        ])

    # Deduplicate while keeping order
    seen = set()
    out = []
    for s in expansions:
        if s not in seen and s:
            seen.add(s)
            out.append(s)
    return out[:6]


def _boost_score(text: str, base: float) -> float:
    """Rule-based boosting for obviously relevant matches.
    Input base is similarity score in [0..1] (higher is better).
    We boost when chunk contains decisive cues like 'má»™t vá»£, má»™t chá»“ng' or 'cáº¥m ... Ä‘ang cÃ³ vá»£'.
    """
    t = (text or "").lower()
    boost = 0.0
    if "má»™t vá»£, má»™t chá»“ng" in t or "mot vo, mot chong" in t:
        boost += 0.08
    if "cáº¥m" in t and ("Ä‘ang cÃ³ vá»£" in t or "dang co vo" in t or "Ä‘ang cÃ³ chá»“ng" in t or "dang co chong" in t):
        boost += 0.06
    if "chung sá»‘ng nhÆ° vá»£ chá»“ng" in t or "chung song nhu vo chong" in t:
        boost += 0.04
    return min(1.0, base + boost)

def _penalize_offtopic(text: str, base: float) -> float:
    t = (text or '').lower()
    penalty = 0.0
    if ('d?i' in t or 'doi' in t) and ('ph?m vi' in t or 'pham vi' in t):
        penalty += 0.06
    if 'b?n d?i' in t or 'bon doi' in t or 'ba d?i' in t or 'ba doi' in t:
        penalty += 0.05
    return max(0.0, base - penalty)



# Lightweight LLM-assisted Query Understanding (optional)
def _boost_with_must_phrases(text: str, base: float, phrases: List[str]) -> float:
    if not phrases:
        return base
    t = (text or "").lower()
    inc = 0.0
    for p in phrases:
        p = (p or "").lower().strip()
        if p and p in t:
            inc += 0.05
            if inc >= 0.15:
                break
    return min(1.0, base + inc)


def _safe_json_parse(s: str) -> Optional[dict]:
    try:
        return json.loads(s)
    except Exception:
        return None


def query_understanding_llm(question: str, effective_at: Optional[str] = None) -> Optional[dict]:
    if not USE_LLM_QU:
        return None
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        sys = (
            "Báº¡n lÃ  bá»™ tiá»n xá»­ lÃ½ cÃ¢u há»i phÃ¡p lÃ½ Viá»‡t Nam. "
            "Chá»‰ chuáº©n hÃ³a truy váº¥n vÃ  trÃ­ch xuáº¥t rÃ ng buá»™c. "
            "KHÃ”NG táº¡o ná»™i dung phÃ¡p lÃ½ má»›i. Tráº£ vá» JSON Ä‘Ãºng schema."
        )
        user = {
            "question": question,
            "effective_at": effective_at,
            "schema": {
                "normalized": "string",
                "subqueries": ["string"],
                "filters": {
                    "effective_at": "string|null",
                    "must_phrases": ["string"],
                    "law_codes": ["string"],
                    "levels": ["string"],
                    "intent": "YES_NO|DEFINITION|CONDITION|PENALTY|PROCEDURE|OTHER",
                },
            },
        }
        resp = client.chat.completions.create(
            model=QU_MODEL,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": sys},
                {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
            ],
        )
        txt = resp.choices[0].message.content if resp and resp.choices else None
        data = _safe_json_parse(txt or "")
        return data or None
    except Exception:
        return None


def retrieve(question: str, effective_at: str, k: int = 8):
    # If not initialized, return a placeholder context explaining the issue
    if not ensure_inited():
        return [{
            "law_code": "N/A",
            "node_path": "",
            "node_id": None,
            "content": "ChÆ°a khá»Ÿi táº¡o mÃ´ hÃ¬nh/Chroma. Kiá»ƒm tra logs cá»§a container rag-service."
        }]

    # Encode & query
    qv = emb.encode([question])[0].tolist()
    res = col.query(query_embeddings=[qv], n_results=k)
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]

    # Filter by effective_at if metadata present (compare as proper dates)
    eff_date = _parse_date(effective_at) or date.today()
    out = []
    for text, m in zip(docs, metas):
        s_raw = m.get("effective_start") or "1900-01-01"
        e_raw = m.get("effective_end") or "9999-12-31"
        s = _parse_date(s_raw) or date(1900, 1, 1)
        e = _parse_date(e_raw) or date(9999, 12, 31)
        if s <= eff_date <= e:
            out.append({
                "law_code": m.get("law_code"),
                "node_path": m.get("node_path") or "",
                "node_id": m.get("node_id"),
                "content": text,
            })
    if not out:
        for text, m in zip(docs, metas):
            out.append({
                "law_code": m.get("law_code"),
                "node_path": m.get("node_path") or "",
                "node_id": m.get("node_id"),
                "content": text,
            })
    RET_DOCS.observe(len(out))
    return out


def retrieve2(question: str, effective_at: str, k: int = 8):
    """Improved retrieval with multi-query expansion, metadata filter and rerank."""
    if not ensure_inited():
        return [{
            "law_code": "N/A",
            "node_path": "",
            "node_id": None,
            "content": "ChÆ°a khá»Ÿi táº¡o mÃ´ hÃ¬nh/Chroma. Kiá»ƒm tra logs cá»§a container rag-service."
        }]

    # Call optional LLM-based query understanding (safe to fail)
    qu = query_understanding_llm(question, effective_at)
    # Heuristic detect polygamy question (digits/spelled numbers)
    is_poly = False
    try:
        ql = (question or '').lower()
        if re.search(r'\\b(\\d+)\\s*(v?|vo)\\b', ql) or any(w in ql for w in ['da thê','da the','nhi?u v?','nhieu vo','l?y thêm v?','lay them vo']):
            is_poly = True
        elif ('v?' in ql or 'vo' in ql) and re.search(r'\\b(m?t|mot|hai|ba|b?n|bon|nam|nam|sáu|sau|b?y|bay|tám|tam|chín|chin|mu?i|muoi)\\s+(v?|vo)\\b', ql):
            is_poly = True
    except Exception:
        is_poly = False
    qu_queries: List[str] = []
    qu_must: List[str] = []
    qu_law_codes: List[str] = []
    eff_override = None
    # Add strong expansions and must-phrases when polygamy intent is detected
    if is_poly:
        extra_queries = [
            'ch? d? m?t v?, m?t ch?ng',
            'c?m ngu?i dang có v? ho?c có ch?ng k?t hôn ho?c chung s?ng nhu v? ch?ng v?i ngu?i khác',
            'di?u 5 lu?t hôn nhân và gia dình các hành vi b? c?m',
            'di?u 2 lu?t hôn nhân và gia dình nguyên t?c',
        ]
        try:
            qu_queries = (qu_queries or []) + extra_queries
        except NameError:
            qu_queries = extra_queries
        try:
            if not qu_must:
                qu_must = ['m?t v?, m?t ch?ng','các hành vi b? c?m','dang có v?','dang có ch?ng','chung s?ng nhu v? ch?ng']
        except NameError:
            qu_must = ['m?t v?, m?t ch?ng','các hành vi b? c?m','dang có v?','dang có ch?ng','chung s?ng nhu v? ch?ng']

    eff_override = None
    if qu:
        try:
            qu_queries = list(qu.get("subqueries") or [])
            normalized = qu.get("normalized")
            if isinstance(normalized, str) and normalized.strip():
                qu_queries.append(normalized.strip())
            filters = qu.get("filters") or {}
            qu_must = list(filters.get("must_phrases") or [])
            qu_law_codes = list(filters.get("law_codes") or [])
            eff_override = filters.get("effective_at") or None
        except Exception:
            qu_queries, qu_must, qu_law_codes, eff_override = [], [], [], None

    # Merge LLM QU queries with rule-based expansions
    queries = _expand_queries(question) or [question]
    try:
        qu_queries  # type: ignore[name-defined]
        if qu_queries:
            queries = queries + qu_queries
    except NameError:
        pass
    # Deduplicate and cap
    seenq = set()
    deduped = []
    for q in queries:
        if q and q not in seenq:
            seenq.add(q)
            deduped.append(q)
    queries = deduped[:8]
    qvecs = [emb.encode([q])[0].tolist() for q in queries]

    where = {"doc_type": {"$in": ["LAW", "DECREE"]}}
    try:
        qu_law_codes  # type: ignore[name-defined]
        if qu_law_codes:
            where["law_code"] = {"$in": qu_law_codes}
    except NameError:
        pass

    res = col.query(
        query_embeddings=qvecs,
        n_results=max(k, 8),
        where=where,
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
            sim = _boost_score(text or "", sim)
            # Apply must-phrase boosts from LLM query understanding (if any)
            # Apply must-phrase boosts from LLM query understanding (if any)
            try:
                qu_must  # type: ignore[name-defined]
                if qu_must:
                    sim = _boost_with_must_phrases(text or "", sim, qu_must)
            except NameError:
                pass
            # Demote kinship-degree clauses when question is about polygamy
            if is_poly:
                sim = _penalize_offtopic(text or "", sim)
            if node_id not in merged or sim > merged[node_id]["_sim"]:
                merged[node_id] = {
                    "law_code": m.get("law_code") if m else None,
                    "node_path": (m.get("node_path") if m else "") or "",
                    "node_id": node_id,
                    "content": text,
                    "effective_start": (m.get("effective_start") if m else None),
                    "effective_end": (m.get("effective_end") if m else None),
                    "_sim": sim,
                }

    # Respect LLM-proposed effective_at if present
    try:
        eff_override  # type: ignore[name-defined]
        eff_date = _parse_date(eff_override or effective_at) or date.today()
    except NameError:
        eff_date = _parse_date(effective_at) or date.today()
    candidates = list(merged.values())
    filtered: List[Dict[str, Any]] = []
    for it in candidates:
        s_raw = it.get("effective_start") or "1900-01-01"
        e_raw = it.get("effective_end") or "9999-12-31"
        s = _parse_date(s_raw) or date(1900, 1, 1)
        e = _parse_date(e_raw) or date(9999, 12, 31)
        if s <= eff_date <= e:
            filtered.append(it)
    items = filtered or candidates
    items.sort(key=lambda x: x.get("_sim", 0.0), reverse=True)
    out = [{
        "law_code": it.get("law_code"),
        "node_path": it.get("node_path") or "",
        "node_id": it.get("node_id"),
        "content": it.get("content"),
    } for it in items[:k]]
    RET_DOCS.observe(len(out))
    return out

def synthesize_answer(question: str, effective_at: str, contexts: list):
    if not contexts:
        return "ChÆ°a cÃ³ ngá»¯ cáº£nh phÃ¹ há»£p trong cÆ¡ sá»Ÿ dá»¯ liá»‡u. Vui lÃ²ng chá»‰ rÃµ Ä‘iá»u/khoáº£n cáº§n xem thÃªm."
    bullets = []
    for c in contexts[:3]:
        code = c.get('law_code') or 'N/A'
        path = c.get('node_path') or ''
        content = c.get('content') or ''
        bullets.append(f"- {content} [Luáº­t {code} - {path}]")
    return "Tráº£ lá»i rÃºt gá»n dá»±a trÃªn trÃ­ch dáº«n:\n" + "\n".join(bullets)


def synthesize_answer2(question: str, effective_at: str, contexts: list):
    if not contexts:
        return "ChÆ°a cÃ³ ngá»¯ cáº£nh phÃ¹ há»£p trong cÆ¡ sá»Ÿ dá»¯ liá»‡u. Vui lÃ²ng chá»‰ rÃµ Ä‘iá»u/khoáº£n cáº§n xem thÃªm."

    ql = (question or "").lower()
    ctx_texts = [(c.get('content') or '').lower() for c in contexts]

    poly_q_markers = [
        "hai vá»£", "ba vá»£", "Ä‘a thÃª", "nhiá»u vá»£", "láº¥y 2 vá»£", "láº¥y 3 vá»£",
        "hai vo", "ba vo", "da the", "nhieu vo", "lay 2 vo", "lay 3 vo",
    ]
    is_poly_q = any(m in ql for m in poly_q_markers) or bool(re.search(r"\b(\d+)\s*(v?|vo)\b", ql)) or ("v?" in ql and ql.count("v?") >= 2) or bool(re.search(r"\b(m?t|mot|hai|ba|b?n|bon|nam|nam|sáu|sau|b?y|bay|tám|tam|chín|chin|mu?i|muoi)\s+(v?|vo)\b", ql))
    has_monogamy = any("má»™t vá»£, má»™t chá»“ng" in t or "mot vo, mot chong" in t for t in ctx_texts)
    has_prohibit = any("cáº¥m" in t and ("Ä‘ang cÃ³ vá»£" in t or "dang co vo" in t or "Ä‘ang cÃ³ chá»“ng" in t or "dang co chong" in t) for t in ctx_texts)

    if is_poly_q and (has_monogamy or has_prohibit):
        bullets = []
        for c in contexts[:3]:
            code = c.get('law_code') or 'N/A'
            path = c.get('node_path') or ''
            content = c.get('content') or ''
            bullets.append(f"- {content} [Luáº­t {code} - {path}]")
        return (
            "KhÃ´ng. PhÃ¡p luáº­t Viá»‡t Nam Ã¡p dá»¥ng cháº¿ Ä‘á»™ má»™t vá»£, má»™t chá»“ng; "
            "cáº¥m ngÆ°á»i Ä‘ang cÃ³ vá»£ hoáº·c cÃ³ chá»“ng káº¿t hÃ´n hoáº·c chung sá»‘ng nhÆ° vá»£ chá»“ng vá»›i ngÆ°á»i khÃ¡c.\n"
            "TrÃ­ch dáº«n liÃªn quan:\n" + "\n".join(bullets)
        )

    bullets = []
    for c in contexts[:3]:
        code = c.get('law_code') or 'N/A'
        path = c.get('node_path') or ''
        content = c.get('content') or ''
        bullets.append(f"- {content} [Luáº­t {code} - {path}]")
    return "Tráº£ lá»i rÃºt gá»n dá»±a trÃªn trÃ­ch dáº«n:\n" + "\n".join(bullets)

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    if ensure_inited():
        return {"ready": True}
    return {"ready": False, "error": init_error or "initializing"}, 503


@app.post("/qa")
def qa():
    start = time.time()
    REQ_COUNT.labels(endpoint="qa").inc()
    try:
        body = request.get_json(force=True)
        q = (body.get("question") or "").strip()
        if not q:
            return jsonify({"error": "Thiáº¿u 'question'"}), 400
        t_raw = body.get("effective_at")
        t_date = _parse_date(t_raw) or date.today()
        t = t_date.isoformat()
        k = int(body.get("options", {}).get("k", 8))

        if not ensure_inited():
            return jsonify({"error": f"RAG chÆ°a sáºµn sÃ ng: {init_error}"}), 503

        ctx = retrieve2(q, t, k=k)
        answer = synthesize_answer2(q, t, ctx)
        return jsonify({"answer": answer, "effective_at": t, "context": ctx})
    finally:
        REQ_LAT.labels(endpoint="qa").observe(time.time() - start)


@app.post("/gen")
def gen():
    start = time.time()
    REQ_COUNT.labels(endpoint="gen").inc()
    try:
        body = request.get_json(force=True)
        q = (body.get("question") or "").strip()
        if not q:
            return jsonify({"error": "Thiáº¿u 'question'"}), 400
        t_raw = body.get("effective_at")
        t_date = _parse_date(t_raw) or date.today()
        t = t_date.isoformat()
        k = int(body.get("k") or 8)
        # max_tokens, temperature are accepted but unused in this demo

        if not ensure_inited():
            return jsonify({"error": f"RAG chÆ°a sáºµn sÃ ng: {init_error}"}), 503

        ctx = retrieve2(q, t, k=k)
        answer = synthesize_answer2(q, t, ctx)
        citations = []
        used_nodes = []
        for c in ctx[:5]:
            citations.append({
                "law_code": c.get("law_code"),
                "node_path": c.get("node_path"),
                "node_id": c.get("node_id"),
            })
            if c.get("node_id") is not None:
                used_nodes.append(c.get("node_id"))
        return jsonify({
            "answer": answer,
            "citations": citations,
            "used_nodes": used_nodes,
        })
    finally:
        REQ_LAT.labels(endpoint="gen").observe(time.time() - start)


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)


@app.post("/admin/reindex")
def reindex():
    # Stub endpoint to satisfy law-service AdminController
    # In a real setup, trigger an async job to rebuild embeddings from DB.
    return jsonify({"status": "accepted"}), 202


if __name__ == "__main__":
    host = os.getenv("RAG_HOST", "0.0.0.0")
    port = int(os.getenv("RAG_PORT", "5001"))
    app.run(host=host, port=port)



