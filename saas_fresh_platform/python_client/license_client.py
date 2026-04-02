import hashlib
import json
import os
import platform
import socket
from datetime import datetime, timedelta, timezone

import requests

API_BASE = os.getenv("LICENSE_API_BASE", "http://localhost:4500")
LOCAL_LICENSE_FILE = os.getenv("LOCAL_LICENSE_FILE", "license_state.json")
CHECK_EVERY_DAYS = 4


def utc_now():
    return datetime.now(timezone.utc)


def iso_to_dt(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def get_device_fingerprint():
    raw = "|".join(
        [
            platform.node(),
            platform.system(),
            platform.machine(),
            socket.gethostname(),
        ]
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def load_local_state():
    if not os.path.exists(LOCAL_LICENSE_FILE):
        return None

    with open(LOCAL_LICENSE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_local_state(data):
    with open(LOCAL_LICENSE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def activate(activation_key):
    device_id = get_device_fingerprint()
    response = requests.post(
        f"{API_BASE}/api/licenses/activate",
        json={"activationKey": activation_key.upper(), "deviceId": device_id},
        timeout=15,
    )

    data = response.json()
    if response.status_code != 200:
        raise RuntimeError(data.get("error", "Activation failed"))

    state = {
        "activation_key": activation_key.upper(),
        "device_id": device_id,
        "runtime_token": data["runtimeToken"],
        "expires_at": data["expiresAt"],
        "last_check_at": utc_now().isoformat(),
    }
    save_local_state(state)
    return state


def validate_online(state):
    response = requests.post(
        f"{API_BASE}/api/licenses/validate",
        json={
            "activationKey": state["activation_key"],
            "deviceId": state["device_id"],
        },
        timeout=15,
    )

    data = response.json()
    if response.status_code != 200:
        return {
            "active": False,
            "error": data.get("error", "Validation failed"),
            "should_lock": data.get("shouldLock", True),
            "renew_url": data.get("renewUrl"),
        }

    state["runtime_token"] = data["runtimeToken"]
    state["expires_at"] = data["expiresAt"]
    state["last_check_at"] = utc_now().isoformat()
    save_local_state(state)

    return {"active": True, "should_lock": False}


def needs_online_check(state):
    if not state.get("last_check_at"):
        return True

    last_check = iso_to_dt(state["last_check_at"])
    return utc_now() >= (last_check + timedelta(days=CHECK_EVERY_DAYS))


def is_expired(state):
    return utc_now() > iso_to_dt(state["expires_at"])


def startup_guard():
    state = load_local_state()
    if not state:
        return {
            "allowed": False,
            "reason": "No local activation found. Activate first.",
        }

    if state["device_id"] != get_device_fingerprint():
        return {
            "allowed": False,
            "reason": "License is bound to another PC.",
        }

    if is_expired(state):
        return {
            "allowed": False,
            "reason": "License expired. Renew your subscription.",
        }

    if needs_online_check(state):
        result = validate_online(state)
        if not result["active"] and result.get("should_lock", True):
            return {
                "allowed": False,
                "reason": result.get("error", "License check failed"),
                "renew_url": result.get("renew_url"),
            }

    return {"allowed": True}
