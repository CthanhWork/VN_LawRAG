import os
import pymysql
from sentence_transformers import SentenceTransformer
import chromadb

DB_HOST = os.getenv("DB_HOST", "mysql")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "laws")
DB_USER = os.getenv("DB_USER", "app")
DB_PASS = os.getenv("DB_PASS", "app")

EMBED_MODEL = os.getenv("EMBEDDING_MODEL", "keepitreal/vietnamese-sbert")
CHROMA_PATH = os.getenv("CHROMA_PATH", "/data/chroma")

def fetch_chunks():
    conn = pymysql.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS,
                           database=DB_NAME, charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor)
    try:
        with conn.cursor() as cur:
            cur.execute("""
              SELECT ln.id, l.code AS law_code,
                     CONCAT_WS(' → ', NULLIF(ln2.ordinal_label,''), NULLIF(ln.ordinal_label,'')) AS node_path,
                     COALESCE(ln.content_text, ln.content_html) AS text,
                     COALESCE(DATE_FORMAT(ln.effective_start,'%Y-%m-%d'),'1900-01-01') AS effective_start,
                     COALESCE(DATE_FORMAT(ln.effective_end,'%Y-%m-%d'),'9999-12-31') AS effective_end
              FROM law_nodes ln
              JOIN laws l ON l.id = ln.law_id
              LEFT JOIN law_nodes ln2 ON ln2.id = ln.parent_id
              WHERE ln.level IN ('DIEU','KHOAN')
                AND (COALESCE(ln.content_text,'') <> '' OR COALESCE(ln.content_html,'') <> '')
              ORDER BY l.code, ln.sort_key
            """)
            return cur.fetchall()
    finally:
        conn.close()

def main():
    rows = fetch_chunks()
    print(f"Loaded {len(rows)} chunks")
    emb = SentenceTransformer(EMBED_MODEL)
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    col = client.get_or_create_collection(name="law_chunks", metadata={"hnsw:space": "cosine"})
    ids, embs, docs, metas = [], [], [], []
    for r in rows:
        txt = (r["text"] or "").strip()
        if not txt:
            continue
        vec = emb.encode([txt])[0].tolist()
        ids.append(str(r["id"]))
        embs.append(vec)
        docs.append(txt)
        metas.append({
            "node_id": r["id"],
            "law_code": r["law_code"],
            "node_path": r["node_path"] or "",
            "effective_start": r["effective_start"],
            "effective_end": r["effective_end"]
        })
        if len(ids) >= 64:
            col.upsert(ids=ids, embeddings=embs, documents=docs, metadatas=metas)
            ids, embs, docs, metas = [], [], [], []
    if ids:
        col.upsert(ids=ids, embeddings=embs, documents=docs, metadatas=metas)
    print("Upsert to Chroma done.")

if __name__ == "__main__":
    main()
