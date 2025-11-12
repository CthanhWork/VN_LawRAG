from rag_service.app_factory import create_app as _create_app
from rag_service.retrieval import retrieve, retrieve2


# Create the Flask app via factory
app = _create_app()


if __name__ == "__main__":
    import os

    host = os.getenv("RAG_HOST", "0.0.0.0")
    port = int(os.getenv("RAG_PORT", "5001"))
    app.run(host=host, port=port)


def create_app():
    """Return the configured Flask app instance.

    This shim enables a factory pattern without changing current behavior.
    External servers (gunicorn/uwsgi) can import `app:create_app`.
    """
    return app

