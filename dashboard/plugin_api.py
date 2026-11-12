"""OpenRouter Balance — dashboard API half.

Reads the profile's own OPENROUTER_API_KEY from .env (never sent to the
renderer) and proxies the free /api/v1/credits endpoint. Mounted by the web
server at /api/plugins/openrouter-balance/* behind the dashboard auth gate.
"""
from __future__ import annotations

import asyncio

from fastapi import APIRouter

BASE = "https://openrouter.ai/api/v1/credits"
router = APIRouter()


def _api_key() -> str | None:
    """Resolve the profile's OpenRouter key through Hermes's secret scope only.

    No ``.env`` / ``os.environ`` fallback: under profile multiplexing
    ``get_secret`` deliberately returns nothing outside the profile's scope so
    one profile cannot see another's key, and a direct fallback would undo
    that. The plugin host installs this profile's scope
    (``set_secret_scope(build_profile_secret_scope(home))``), so the lookup is
    well-defined here.
    """
    try:
        from agent.secret_scope import UnscopedSecretError, get_secret
    except ImportError:  # older Hermes without the secret-scope route
        return None
    try:
        return get_secret("OPENROUTER_API_KEY") or None
    except UnscopedSecretError:  # multiplexing, no scope bound: fail closed
        return None


@router.get("/credits")
async def credits() -> dict:
    """Return {ok, remaining, used, total} for the profile's OpenRouter key."""
    key = _api_key()
    if not key:
        return {"ok": False, "error": "no-key",
                "detail": "No OPENROUTER_API_KEY in this profile's .env"}

    def _call() -> dict:
        import httpx

        with httpx.Client(timeout=15.0) as client:
            resp = client.get(BASE, headers={"Authorization": f"Bearer {key}"})
        if resp.status_code in (401, 403):
            return {"ok": False, "error": "bad-key"}
        if resp.status_code != 200:
            return {"ok": False, "error": f"http-{resp.status_code}"}
        d = (resp.json() or {}).get("data") or {}
        total = d.get("total_credits")
        if not isinstance(total, (int, float)):
            return {"ok": False, "error": "no-data",
                    "detail": "unexpected response shape"}
        used = d.get("total_usage") or 0
        return {"ok": True, "remaining": total - used, "used": used, "total": total}

    return await asyncio.get_running_loop().run_in_executor(None, _call)
