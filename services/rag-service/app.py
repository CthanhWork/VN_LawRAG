from flask import Flask, request, jsonify
import os
from datetime import date

# Lazy-initialized globals
emb = None
client = None
col = None
init_error = None

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "keepitreal/vietnamese-sbert")
CHROMA_PATH = os.getenv("CHROMA_PATH", "/data/chroma")

app = Flask(__name__)


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


def retrieve(question: str, effective_at: str, k: int = 8):
    # If not initialized, return a placeholder context explaining the issue
    if not ensure_inited():
        return [{
            "law_code": "N/A",
            "node_path": "",
            "node_id": None,
            "content": "Chưa khởi tạo mô hình/Chroma. Kiểm tra logs của container rag-service."
        }]

    # Encode & query
    qv = emb.encode([question])[0].tolist()
    res = col.query(query_embeddings=[qv], n_results=k)
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]

    # Filter by effective_at if metadata present
    out = []
    for text, m in zip(docs, metas):
        s = (m.get("effective_start") or "1900-01-01")
        e = (m.get("effective_end") or "9999-12-31")
        if s <= effective_at <= e:
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
    return out


def synthesize_answer(question: str, effective_at: str, contexts: list):
    if not contexts:
        return "Chưa có ngữ cảnh phù hợp trong cơ sở dữ liệu. Vui lòng chỉ rõ điều/khoản cần xem thêm."
    bullets = []
    for c in contexts[:3]:
        code = c.get('law_code') or 'N/A'
        path = c.get('node_path') or ''
        content = c.get('content') or ''
        bullets.append(f"- {content} [Luật {code} - {path}]")
    return "Trả lời rút gọn dựa trên trích dẫn:\n" + "\n".join(bullets)


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
    body = request.get_json(force=True)
    q = (body.get("question") or "").strip()
    if not q:
        return jsonify({"error": "Thiếu 'question'"}), 400
    t = body.get("effective_at") or date.today().isoformat()
    k = int(body.get("options", {}).get("k", 8))

    if not ensure_inited():
        return jsonify({"error": f"RAG chưa sẵn sàng: {init_error}"}), 503

    ctx = retrieve(q, t, k=k)
    answer = synthesize_answer(q, t, ctx)
    return jsonify({"answer": answer, "effective_at": t, "context": ctx})


@app.post("/gen")
def gen():
    body = request.get_json(force=True)
    q = (body.get("question") or "").strip()
    if not q:
        return jsonify({"error": "Thiếu 'question'"}), 400
    t = body.get("effective_at") or date.today().isoformat()
    k = int(body.get("k") or 8)
    # max_tokens, temperature are accepted but unused in this demo

    if not ensure_inited():
        return jsonify({"error": f"RAG chưa sẵn sàng: {init_error}"}), 503

    ctx = retrieve(q, t, k=k)
    answer = synthesize_answer(q, t, ctx)
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


@app.post("/admin/reindex")
def reindex():
    # Stub endpoint to satisfy law-service AdminController
    # In a real setup, trigger an async job to rebuild embeddings from DB.
    return jsonify({"status": "accepted"}), 202


if __name__ == "__main__":
    host = os.getenv("RAG_HOST", "0.0.0.0")
    port = int(os.getenv("RAG_PORT", "5001"))
    app.run(host=host, port=port)

