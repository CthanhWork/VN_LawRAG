from flask import Blueprint, jsonify, request, Response
import time
from datetime import date

from .metrics import REQ_COUNT, REQ_LAT, generate_latest, CONTENT_TYPE_LATEST
from . import state
from .utils import parse_date
from .retrieval import retrieve2, _enrich_contexts, expand_references
from .answer import synthesize_answer2, violation_judgment_heuristic, _select_relevant_citations
from .analysis_llm import violation_judgment_llm


bp = Blueprint("rag", __name__)


@bp.get("/health")
def health():
    return {"status": "ok"}


@bp.get("/ready")
def ready():
    llm_info = state.llm_status(run_live=False)
    if state.ensure_inited():
        return {"ready": True, "llm": llm_info}
    return {"ready": False, "error": state.init_error or "initializing", "llm": llm_info}, 503


@bp.get("/llm/status")
def llm_status():
    live = request.args.get("live", "").strip().lower()
    run_live = live in ("1", "true", "yes", "on")
    info = state.llm_status(run_live=run_live)
    code = 200 if info.get("ready") else 503
    return jsonify(info), code


@bp.post("/qa")
def qa():
    start = time.time()
    REQ_COUNT.labels(endpoint="qa").inc()
    try:
        body = request.get_json(force=True)
        q = (body.get("question") or "").strip()
        if not q:
            return jsonify({"error": "Thiếu 'question'"}), 400
        t_raw = body.get("effective_at")
        t_date = parse_date(t_raw) or date.today()
        t = t_date.isoformat()
        k = int(body.get("options", {}).get("k", 8))

        if not state.ensure_inited():
            return jsonify({"error": f"RAG chưa sẵn sàng: {state.init_error}"}), 503

        ctx = retrieve2(q, t, k=k)
        # Expand references and enrich for fuller text before synthesizing
        ctx_expanded = expand_references(ctx, effective_at=t, max_extra=max(4, 12 - len(ctx)), question=q)
        rich_ctx = _enrich_contexts(ctx_expanded, limit=8)
        answer = synthesize_answer2(q, t, rich_ctx)
        return jsonify({"answer": answer, "effective_at": t, "context": rich_ctx})
    finally:
        REQ_LAT.labels(endpoint="qa").observe(time.time() - start)


@bp.post("/gen")
def gen():
    start = time.time()
    REQ_COUNT.labels(endpoint="gen").inc()
    try:
        body = request.get_json(force=True)
        q = (body.get("question") or "").strip()
        if not q:
            return jsonify({"error": "Thiếu 'question'"}), 400
        t_raw = body.get("effective_at")
        t_date = parse_date(t_raw) or date.today()
        t = t_date.isoformat()
        k = int(body.get("k") or 8)

        if not state.ensure_inited():
            return jsonify({"error": f"RAG chưa sẵn sàng: {state.init_error}"}), 503

        ctx = retrieve2(q, t, k=k)
        ctx_expanded = expand_references(ctx, effective_at=t, max_extra=max(4, 12 - len(ctx)), question=q)
        rich_ctx = _enrich_contexts(ctx_expanded, limit=8)
        answer = synthesize_answer2(q, t, rich_ctx)
        citations = []
        used_nodes = []
        for c in rich_ctx[:5]:
            citations.append({"law_code": c.get("law_code"), "node_path": c.get("node_path"), "node_id": c.get("node_id")})
            if c.get("node_id") is not None:
                used_nodes.append(c.get("node_id"))
        return jsonify({"answer": answer, "citations": citations, "used_nodes": used_nodes})
    finally:
        REQ_LAT.labels(endpoint="gen").observe(time.time() - start)


@bp.get("/metrics")
def metrics():
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)


@bp.post("/admin/reindex")
def reindex():
    return jsonify({"status": "accepted"}), 202


@bp.post("/admin/reload_patterns")
def reload_patterns():
    state.load_domain_patterns()
    return jsonify({"reloaded": state.domain_patterns is not None})


@bp.post("/analyze")
def analyze():
    start = time.time()
    REQ_COUNT.labels(endpoint="analyze").inc()
    try:
        body = request.get_json(force=True)
        q = (body.get("question") or "").strip()
        if not q:
            return jsonify({"error": "Thiếu 'question'"}), 400
        t_raw = body.get("effective_at")
        t_date = parse_date(t_raw) or date.today()
        t = t_date.isoformat()
        k = int(body.get("options", {}).get("k", 10))

        if not state.ensure_inited():
            return jsonify({"error": f"RAG chưa sẵn sàng: {state.init_error}"}), 503

        ctx = retrieve2(q, t, k=k)
        # Expand contexts by following in-text references (e.g., "Điều 8") and related decrees to include full articles
        ctx_expanded = expand_references(ctx, effective_at=t, max_extra=max(4, 12 - len(ctx)), question=q)
        rel_ctx = _select_relevant_citations(ctx_expanded, limit=8) or ctx_expanded[:8]
        rich_ctx = _enrich_contexts(rel_ctx, limit=8)

        verdict = violation_judgment_llm(q, t, rich_ctx)
        if not verdict:
            verdict = violation_judgment_heuristic(q, rich_ctx)

        try:
            allowed = {(c.get("law_code") or "", c.get("node_path") or "", c.get("node_id")) for c in rich_ctx}
            matched = []
            for m in (verdict.get("matched") or []):
                key = (m.get("law_code") or "", m.get("node_path") or "", m.get("node_id"))
                if key in allowed:
                    matched.append(m)
            if verdict.get("decision") == "VIOLATION" and not matched:
                verdict["decision"] = "UNCERTAIN"
                verdict["explanation"] = "Thieu trich dan hop le trong ngu canh de ket luan vi pham."
            verdict["matched"] = matched
        except Exception:
            pass

        used_nodes = [
            m.get("node_id")
            for m in (verdict.get("matched") or [])
            if m.get("node_id") is not None
        ]

        return jsonify(
            {
                "answer": verdict.get("answer"),
                "decision": verdict.get("decision"),
                "explanation": verdict.get("explanation"),
                "citations": verdict.get("matched"),
                "effective_at": t,
                "context": rich_ctx,
                "used_nodes": used_nodes,
            }
        )
    finally:
        REQ_LAT.labels(endpoint="analyze").observe(time.time() - start)
