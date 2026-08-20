"""Portfolio contact API.

Stores every submission as a plain-text JSONL record on the server
filesystem (NEVER committed to GitHub) and forwards it to the site
owner's inbox via Gmail SMTP.

Endpoints
    POST /api/contact   -> receive + store + email a submission
    GET  /api/admin     -> view / download stored submissions (token-protected)
    GET  /health        -> liveness check
    GET  /              -> friendly landing page

Environment (see .env.example):
    GMAIL_USER          Gmail address used as the email sender
    GMAIL_APP_PASSWORD  Gmail App Password (needs 2FA enabled on that mailbox)
    ADMIN_TOKEN         secret token guarding /api/admin
    DATA_FILE           path to the submissions file (default: submissions.jsonl)
    ALLOWED_ORIGINS     comma-separated list of CORS origins
"""

import json
import logging
import os
import smtplib
import ssl
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, EmailStr, Field

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")   # backend/.env (local secrets, gitignored)
load_dotenv()                    # .env in cwd (optional, e.g. repo root)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("portfolio-contact")

DATA_FILE = Path(os.getenv("DATA_FILE", BASE_DIR / "data" / "submissions.jsonl"))
GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
NOTIFY_TO = os.getenv("NOTIFY_TO", GMAIL_USER)
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "https://muntazimalam.github.io,"
    "http://localhost:5500,http://127.0.0.1:5500,"
    "http://localhost:8899,http://127.0.0.1:8899,"
    "http://localhost:8000,http://127.0.0.1:8000"
).split(",") if o.strip()]

app = FastAPI(title="Muntazim Alam Portfolio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class ContactSubmission(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr = Field(max_length=254)
    contact: Optional[str] = Field(default=None, max_length=30)
    reason: str = Field(min_length=1, max_length=80)
    message: Optional[str] = Field(default=None, max_length=4000)
    website: Optional[str] = Field(default=None, max_length=254)  # honeypot


def _record(submission: dict) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(submission, ensure_ascii=False) + "\n")
    logger.info("Stored submission from %s (%s)", submission["email"], submission["reason"])


def send_email(submission: dict) -> bool:
    """Send the submission via Gmail SMTP. Returns True on success."""
    if not (GMAIL_USER and GMAIL_APP_PASSWORD and NOTIFY_TO):
        logger.warning("Gmail SMTP not configured - skipping email send.")
        return False

    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;
                border:1px solid #e5e0d8;border-radius:14px;overflow:hidden">
      <div style="background:#15110d;color:#c6a972;padding:18px 24px">
        <strong>New portfolio inquiry</strong> &mdash; muntazimalam
      </div>
      <div style="padding:24px;background:#fff;color:#26221e">
        <p style="margin:0 0 6px"><strong>Name:</strong> {submission['name']}</p>
        <p style="margin:0 0 6px"><strong>Email:</strong> {submission['email']}</p>
        <p style="margin:0 0 6px"><strong>Phone:</strong> {submission.get('contact') or '&mdash;'}</p>
        <p style="margin:0 0 6px"><strong>Reason:</strong> {submission['reason']}</p>
        <p style="margin:14px 0 0;padding:14px;background:#faf7f2;border-radius:10px;white-space:pre-wrap">{submission.get('message') or 'No message provided.'}</p>
        <p style="margin:18px 0 0;font-size:12px;color:#8a837c">Received {submission['timestamp']} &middot; Source IP: {submission['ip']}</p>
      </div>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Portfolio inquiry - {submission['name']} ({submission['reason']})"
    msg["From"] = f"Muntazim Alam Portfolio <{GMAIL_USER}>"
    msg["To"] = NOTIFY_TO
    msg.attach(MIMEText(
        f"New portfolio inquiry\n\nName: {submission['name']}\nEmail: {submission['email']}\n"
        f"Phone: {submission.get('contact') or '-'}\nReason: {submission['reason']}\n\n"
        f"{submission.get('message') or 'No message provided.'}\n\n"
        f"Received {submission['timestamp']} (IP {submission['ip']})",
        "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30, context=context) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, [NOTIFY_TO], msg.as_string())
        logger.info("Email delivered to %s", NOTIFY_TO)
        return True
    except Exception as exc:  # pragma: no cover - depends on network
        logger.error("SMTP send failed: %s", exc)
        return False


@app.post("/api/contact")
async def contact(payload: ContactSubmission, request: Request) -> JSONResponse:
    data = payload.model_dump()

    if data.pop("website"):  # honeypot tripped - pretend success, store nothing
        return JSONResponse({"ok": True, "stored": False, "emailed": False})

    data["timestamp"] = datetime.now(timezone.utc).isoformat()
    data["ip"] = request.client.host if request.client else "unknown"

    try:
        _record(data)
    except OSError as exc:
        logger.error("Failed to write record file: %s", exc)
        raise HTTPException(status_code=500, detail="Could not persist the submission.")

    emailed = send_email(data)

    return JSONResponse({"ok": True, "stored": True, "emailed": emailed})


@app.get("/api/admin")
def admin(token: str = Query(...)) -> PlainTextResponse:
    if not ADMIN_TOKEN or token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token.")
    if not DATA_FILE.exists():
        return PlainTextResponse("No submissions yet.\n", media_type="text/plain")
    return PlainTextResponse(DATA_FILE.read_text(encoding="utf-8"), media_type="text/plain")


@app.get("/api/admin/count")
def admin_count(token: str = Query(...)) -> JSONResponse:
    if not ADMIN_TOKEN or token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token.")
    if not DATA_FILE.exists():
        return JSONResponse({"count": 0})
    lines = [ln for ln in DATA_FILE.read_text(encoding="utf-8").splitlines() if ln.strip()]
    return JSONResponse({"count": len(lines), "reasons": {
        r: sum(1 for ln in lines if json.loads(ln).get("reason") == r)
        for r in sorted({json.loads(ln).get("reason", "") for ln in lines})
    }})


@app.get("/health")
def health() -> JSONResponse:
    stored = DATA_FILE.exists() and len([ln for ln in DATA_FILE.read_text(encoding="utf-8").splitlines() if ln.strip()]) or 0
    return JSONResponse({
        "status": "ok",
        "email_configured": bool(GMAIL_USER and GMAIL_APP_PASSWORD),
        "submissions_stored": stored,
    })


@app.get("/")
def root() -> PlainTextResponse:
    return PlainTextResponse(
        "Muntazim Alam portfolio API. POST /api/contact | GET /api/admin?token=<ADMIN_TOKEN>",
        media_type="text/plain")