from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db import get_client
from auth import require_owner

router = APIRouter()


class GenerateRequest(BaseModel):
    contract_id: str
    month: str  # YYYY-MM


def parse_working_days(working_days: str) -> set[int]:
    """Map day abbreviations to Python weekday integers (0=Mon)."""
    day_map = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}
    parts = [p.strip() for p in working_days.lower().split("-")]
    if len(parts) == 2:
        start = day_map.get(parts[0])
        end = day_map.get(parts[1])
        if start is not None and end is not None:
            return set(range(start, end + 1))
    # fallback: try comma-separated list
    result = set()
    for p in working_days.lower().split(","):
        p = p.strip()
        if p in day_map:
            result.add(day_map[p])
    return result or {0, 1, 2, 3, 4}  # default mon-fri


def count_working_days(year: int, month: int, working_day_nums: set[int], holiday_dates: set[date]) -> int:
    count = 0
    d = date(year, month, 1)
    while d.month == month:
        if d.weekday() in working_day_nums and d not in holiday_dates:
            count += 1
        d += timedelta(days=1)
    return count


def count_month_days(year: int, month: int, working_day_nums: set[int]) -> list[date]:
    """Return all working-day dates in the month (before holiday exclusion)."""
    days = []
    d = date(year, month, 1)
    while d.month == month:
        if d.weekday() in working_day_nums:
            days.append(d)
        d += timedelta(days=1)
    return days


@router.post("/generate")
def generate_salaries(body: GenerateRequest, owner_id: str = Depends(require_owner)):
    db = get_client()

    # Fetch contract
    c = db.table("contracts").select("*").eq("id", body.contract_id).single().execute()
    if not c.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract = c.data

    # Parse month
    try:
        year, month = int(body.month[:4]), int(body.month[5:7])
    except Exception:
        raise HTTPException(status_code=400, detail="month must be YYYY-MM")

    working_day_nums = parse_working_days(contract["working_days"] or "mon-fri")

    # Public holidays if contract doesn't pay them
    holiday_dates: set[date] = set()
    if not contract.get("pays_public_holidays"):
        ph = db.table("public_holidays").select("date").execute()
        for row in ph.data or []:
            holiday_dates.add(date.fromisoformat(row["date"]))

    working_days_count = count_working_days(year, month, working_day_nums, holiday_dates)

    # Active staff on this contract
    staff_resp = db.table("staff").select("*").eq("contract_id", body.contract_id).eq("active", True).execute()
    staff_list = staff_resp.data or []

    if not staff_list:
        raise HTTPException(status_code=400, detail="No active staff on this contract")

    staff_ids = [s["id"] for s in staff_list]

    # Unpaid absences for this month
    month_start = f"{year}-{month:02d}-01"
    month_end = f"{year}-{month:02d}-31"
    att_resp = (
        db.table("attendance")
        .select("staff_id, absence_type")
        .in_("staff_id", staff_ids)
        .eq("absence_type", "unpaid")
        .gte("day", month_start)
        .lte("day", month_end)
        .execute()
    )
    unpaid_counts: dict[str, int] = {}
    for row in att_resp.data or []:
        sid = row["staff_id"]
        unpaid_counts[sid] = unpaid_counts.get(sid, 0) + 1

    # Upsert salary records
    records = []
    for s in staff_list:
        unpaid = unpaid_counts.get(s["id"], 0)
        days_worked = max(working_days_count - unpaid, 0)
        amount = round(days_worked * float(s["daily_rate"]), 2)
        records.append({
            "staff_id": s["id"],
            "month": body.month,
            "working_days_in_month": working_days_count,
            "days_absent_unpaid": unpaid,
            "days_worked": days_worked,
            "amount": amount,
            "status": "draft",
        })

    db.table("salaries").upsert(records, on_conflict="staff_id,month").execute()

    return {"count": len(records), "working_days": working_days_count, "drafts": records}


@router.post("/{salary_id}/approve")
def approve_salary(salary_id: str, owner_id: str = Depends(require_owner)):
    db = get_client()
    sal = db.table("salaries").select("status").eq("id", salary_id).single().execute()
    if not sal.data:
        raise HTTPException(status_code=404, detail="Salary record not found")
    if sal.data["status"] != "draft":
        raise HTTPException(status_code=400, detail="Only draft salaries can be approved")

    from datetime import datetime, timezone
    db.table("salaries").update({
        "status": "approved",
        "approved_by": owner_id,
        "approved_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", salary_id).execute()

    return {"status": "approved"}
