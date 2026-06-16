import os
import logging
import smtplib
from datetime import date
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from db import get_client

logger = logging.getLogger(__name__)


def send_email(subject: str, body: str):
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    from_addr = os.environ.get("ALERT_FROM", smtp_user)
    to_addr = os.environ.get("ALERT_TO")

    if not all([smtp_host, smtp_user, smtp_pass, to_addr]):
        logger.warning("SMTP not configured — skipping email send")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_addr, [to_addr], msg.as_string())
        logger.info(f"Email sent: {subject}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")


def check_expiring_items():
    """Run daily at 07:00 SAST. Create alerts for items whose next_alert_date <= today."""
    logger.info("Running check_expiring_items")
    db = get_client()
    today = date.today().isoformat()

    items_resp = (
        db.table("tracked_items")
        .select("id, name, expiry_date, next_alert_date, type, institution")
        .lte("next_alert_date", today)
        .eq("status", "active")
        .execute()
    )

    for item in items_resp.data or []:
        # Create alert record
        try:
            db.table("alerts").insert({
                "tracked_item_id": item["id"],
                "scheduled_for": today,
                "channel": "email",
                "status": "pending",
            }).execute()
        except Exception:
            pass  # unique constraint may prevent duplicates

        subject = f"ALERT: {item['type'].title()} expiring — {item['name']}"
        body = (
            f"This is an automated alert from Service Management.\n\n"
            f"Item: {item['name']}\n"
            f"Type: {item['type']}\n"
            f"Institution: {item.get('institution') or '—'}\n"
            f"Expiry date: {item['expiry_date']}\n\n"
            f"Please take action before the expiry date."
        )
        send_email(subject, body)

        # Mark alert as sent
        db.table("alerts").update({"status": "sent", "sent_at": today}).eq("tracked_item_id", item["id"]).eq("scheduled_for", today).execute()

    logger.info(f"check_expiring_items: processed {len(items_resp.data or [])} items")


def check_low_stock():
    """Run daily at 07:05 SAST. Auto-create low_stock issues when balance < threshold."""
    logger.info("Running check_low_stock")
    db = get_client()

    contracts_resp = db.table("contracts").select("id").eq("is_active", True).execute()
    consumables_resp = db.table("consumables").select("*").execute()

    for contract in contracts_resp.data or []:
        cid = contract["id"]

        movements_resp = (
            db.table("stock_movements")
            .select("consumable_id, type, quantity")
            .eq("contract_id", cid)
            .execute()
        )
        balances: dict[str, float] = {}
        for mv in movements_resp.data or []:
            key = mv["consumable_id"]
            qty = float(mv["quantity"])
            balances[key] = balances.get(key, 0.0) + (qty if mv["type"] == "delivered" else -qty)

        for consumable in consumables_resp.data or []:
            threshold = float(consumable.get("reorder_threshold") or 0)
            if threshold <= 0:
                continue
            balance = balances.get(consumable["id"], 0.0)
            if balance >= threshold:
                continue

            # Check for existing open low_stock issue
            existing = (
                db.table("issues")
                .select("id")
                .eq("contract_id", cid)
                .eq("type", "low_stock")
                .eq("status", "open")
                .like("subject", f"%{consumable['name']}%")
                .execute()
            )
            if existing.data:
                continue

            db.table("issues").insert({
                "contract_id": cid,
                "type": "low_stock",
                "subject": f"Low stock: {consumable['name']} ({balance:.1f} {consumable['unit']} remaining)",
                "description": f"Balance ({balance:.1f}) is below reorder threshold ({threshold} {consumable['unit']}).",
                "status": "open",
            }).execute()

    logger.info("check_low_stock complete")
