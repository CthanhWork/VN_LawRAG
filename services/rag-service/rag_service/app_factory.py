import logging
from flask import Flask

from . import config


def create_app() -> Flask:
    app = Flask(__name__)
    # Ensure JSON responses keep Unicode characters (no ASCII escaping)
    app.config["JSON_AS_ASCII"] = False

    # CORS (optional)
    try:
        from flask_cors import CORS

        CORS(
            app,
            resources={
                r"/*": {
                    "origins": [o.strip() for o in (config.CORS_ALLOW_ORIGINS or "").split(",")]
                    if config.CORS_ALLOW_ORIGINS
                    else "*",
                    "methods": [m.strip() for m in (config.CORS_ALLOW_METHODS or [])],
                    "allow_headers": [h.strip() for h in (config.CORS_ALLOW_HEADERS or [])],
                    "supports_credentials": False,
                    "max_age": 3600,
                }
            },
        )
    except Exception:
        pass

    if config.LLM_DEBUG:
        try:
            app.logger.setLevel(logging.INFO)
        except Exception:
            pass

    # Register routes
    from .routes import bp as routes_bp

    app.register_blueprint(routes_bp)
    return app

