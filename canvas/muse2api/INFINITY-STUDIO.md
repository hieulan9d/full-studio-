# Vendored copy

Source: https://github.com/www222fff/muse2api (MIT, see LICENSE).

Local change for Infinity Studio: `src/muse2api/api/routes/videos.py` accepts multipart form requests
(what the canvas sends) as well as JSON, and returns `url` / `video_url` at the top level of the task.

Not included on purpose: `data/` (account cookies, API key) and `.env`. On a new machine create
`muse2api/.env` (see `.env.example`; on Windows also set `MUSE2API_CHROMIUM_PATH`,
`MUSE2API_BROWSER_PROFILE_DIR` as an absolute path and a free `MUSE2API_CDP_PORT`), run
`pip install -e muse2api`, then import your own muse.ai cookies from the dashboard (`/dashboard`).
