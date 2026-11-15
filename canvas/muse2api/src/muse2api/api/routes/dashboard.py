"""Admin dashboard: a single self-contained HTML page.

The page itself is public; it asks for the admin key in the browser and calls
``/admin/*`` with it, so serving the HTML reveals nothing.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

from ..deps import get_services

router = APIRouter(tags=["dashboard"])

_PAGE = Path(__file__).resolve().parents[2] / "web" / "dashboard.html"


@lru_cache(maxsize=1)
def _html() -> str:
    return _PAGE.read_text(encoding="utf-8")


@router.get("/dashboard", response_class=HTMLResponse, include_in_schema=False)
async def dashboard() -> HTMLResponse:
    return HTMLResponse(_html(), headers={"Cache-Control": "no-cache",
                                          "X-Frame-Options": "DENY",
                                          "Referrer-Policy": "no-referrer"})


# Infinity Studio: internal use only. Lets the canvas show the keys; loopback clients only.
@router.get("/local/keys", include_in_schema=False)
async def local_keys(request: Request) -> dict:
    host = request.client.host if request.client else ""
    if host not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=403, detail="loopback only")
    st = get_services(request).settings
    return {"api_key": st.api_key, "admin_key": st.effective_admin_key}
