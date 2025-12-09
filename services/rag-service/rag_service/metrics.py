from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# Prometheus metrics
REQ_COUNT = Counter("rag_requests_total", "Total RAG requests", ["endpoint"])
REQ_LAT = Histogram("rag_request_latency_seconds", "Request latency in seconds", ["endpoint"])
RET_DOCS = Histogram(
    "rag_retrieve_results", "Number of retrieved documents", buckets=[0, 1, 3, 5, 8, 13, 21]
)

__all__ = [
    "REQ_COUNT",
    "REQ_LAT",
    "RET_DOCS",
    "generate_latest",
    "CONTENT_TYPE_LATEST",
]

