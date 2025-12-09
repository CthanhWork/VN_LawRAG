import os


def env_flag(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


# Embedding / Vector DB
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "keepitreal/vietnamese-sbert")
CHROMA_PATH = os.getenv("CHROMA_PATH", "/data/chroma")

# LLM settings
USE_LLM_QU = env_flag("USE_LLM_QU", True)
QU_MODEL = os.getenv("QU_MODEL", os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
LLM_DEBUG = env_flag("LLM_DEBUG", False)
LLM_LOG_SLICE = int(os.getenv("LLM_LOG_SLICE", "2000"))

# Services
LAW_SERVICE_URL = os.getenv("LAW_SERVICE_URL", "http://law-service:8080")

# CORS
CORS_ALLOW_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS", "*")
CORS_ALLOW_METHODS = os.getenv("CORS_ALLOW_METHODS", "GET,POST,PUT,DELETE,OPTIONS,PATCH").split(',')
CORS_ALLOW_HEADERS = os.getenv("CORS_ALLOW_HEADERS", "Content-Type,Authorization,X-Requested-With").split(',')
CORS_ALLOW_CREDENTIALS = env_flag("CORS_ALLOW_CREDENTIALS", False)
