# muntazimalam.sbs — Portfolio

Personal portfolio of **Muntazim Alam** — cloud computing, IoT, and AI projects.
Pure HTML/CSS/JavaScript frontend (no build step) + a small FastAPI backend for the contact form.

## Structure

```
index.html          Site (single page, full redesign 2026)
css/styles.css      All styling & animations
js/main.js          Animations, filters, GitHub badges, contact logic
backend/            FastAPI contact API (plain-text storage + Gmail SMTP)
images/             Project visuals (3 hand-crafted SVG dashboard mockups)
Resume.pdf          404.html · robots.txt · sitemap.xml · favicon.svg
```

## Run locally

Frontend (any static server):

```bash
python -m http.server 8899
```

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # then fill in real secrets
uvicorn main:app --reload --port 8000
```

The site auto-detects `localhost` and posts to `http://localhost:8000`.
For a deployed site, open `js/main.js` and replace the `REPLACE-WITH-YOUR-RENDER-URL.onrender.com`
placeholder with the real API URL, and allow that origin in the backend `.env`.

## Deploy the backend on Render (free)

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo, set env vars
   (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ADMIN_TOKEN`, `NOTIFY_TO`) — they are marked `sync: false` in `render.yaml` so they never get committed.
3. Open `js/main.js` and set `API_BASE` to your `https://<app>.onrender.com` URL.

### Gmail setup (2 minutes)

1. Use your own Gmail (`Muntazimalam123456@gmail.com`) as the sender — set it as `GMAIL_USER`.
2. Google Account → Security → turn on **2-Step Verification**.
3. Search "App passwords" → create one for **Mail** → paste the 16-char code as `GMAIL_APP_PASSWORD`.

### Where do submissions go?

Every submission is appended to `submissions.jsonl` (plain text, on the server — **never in this
GitHub repo**) and simultaneously emailed with a styled HTML digest.

View/download records:

```
GET https://<your-api>/api/admin?token=<ADMIN_TOKEN>
GET https://<your-api>/api/admin/count?token=<ADMIN_TOKEN>
```

> Free-tier Render restarts wipe the file. For durable storage later,
> switch `_record()` to a free MongoDB Atlas cluster — one small change.

## Notes

- `robots.txt` disallows crawling of `backend/` and `images/`.
- `roboticcar.png` is ~3.3 MB — resize it before shipping for mobile performance.
- All animations respect `prefers-reduced-motion` (scrollbars/cursor/particles disabled, reveals instant).