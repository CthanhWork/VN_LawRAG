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

        # Allow swagger-ui (usually served from 8080) in addition to configured origins
        raw_origins = (config.CORS_ALLOW_ORIGINS or "").split(",")
        origins = [o.strip() for o in raw_origins if o.strip()]
        swagger_origins = ["http://localhost:8080", "http://127.0.0.1:8080"]
        if "*" in origins or config.CORS_ALLOW_ORIGINS.strip() == "*":
            origins = "*"
        else:
            for o in swagger_origins:
                if o not in origins:
                    origins.append(o)

        CORS(
            app,
            resources={
                r"/*": {
                    "origins": origins or "*",
                    "methods": [m.strip() for m in (config.CORS_ALLOW_METHODS or [])],
                    "allow_headers": [h.strip() for h in (config.CORS_ALLOW_HEADERS or [])],
                    "supports_credentials": config.CORS_ALLOW_CREDENTIALS,
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
