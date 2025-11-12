def create_app():
    # Lazy import to avoid side effects at module import time
    from .app_factory import create_app as _create
    return _create()
