import importlib
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PYTHON_CLIENT_DIR = PROJECT_ROOT / 'python_client'

try:
    import license_client as embedded_license_client
except Exception:
    embedded_license_client = None


def _load_license_client():
    if embedded_license_client is not None:
        return embedded_license_client

    if str(PYTHON_CLIENT_DIR) not in sys.path:
        sys.path.insert(0, str(PYTHON_CLIENT_DIR))

    try:
        return importlib.import_module('license_client')
    except Exception:
        return None


def activate_license_key(activation_key):
    module = _load_license_client()
    if module is None or not hasattr(module, 'activate'):
        raise RuntimeError('License manager module is not available')
    return module.activate(activation_key)


def run_startup_guard():
    module = _load_license_client()
    if module is None or not hasattr(module, 'startup_guard'):
        return {
            'allowed': False,
            'reason': 'License manager module is not available'
        }
    return module.startup_guard()
