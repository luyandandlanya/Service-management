from fastapi import APIRouter, HTTPException, Depends
from db import get_client
from auth import require_owner

router = APIRouter()


@router.get("/expenses")
def expense_report(contract_id: str, month: str, owner_id: str = Depends(require_owner)):
    """
    Returns total approved salary cost, staff count, and open issue count
    for a contract in a given month (YYYY-MM).
    """
    db = get_client()

    # Staff on this contract
    staff_resp = db.table("staff").select("id").eq("contract_id", contract_id).execute()
    staff_ids = [s["id"] for s in staff_resp.data or []]

    total_salary = 0.0
    if staff_ids:
        sal_resp = (
            db.table("salaries")
            .select("amount")
            .in_("staff_id", staff_ids)
            .eq("month", month)
            .eq("status", "approved")
            .execute()
        )
        total_salary = sum(float(r["amount"]) for r in sal_resp.data or [])

    # Open issues
    issues_resp = (
        db.table("issues")
        .select("id", count="exact")
        .eq("contract_id", contract_id)
        .eq("status", "open")
        .execute()
    )
    issue_count = issues_resp.count or 0

    return {
        "contract_id": contract_id,
        "month": month,
        "total_salary_approved": total_salary,
        "staff_count": len(staff_ids),
        "open_issue_count": issue_count,
    }


@router.get("/stock-balances")
def stock_balances(contract_id: str, owner_id: str = Depends(require_owner)):
    """
    Returns per-consumable ledger balance for a contract.
    Balance = SUM(delivered) - SUM(used). Never stored; always computed.
    """
    db = get_client()

    consumables_resp = db.table("consumables").select("*").execute()
    consumables = {c["id"]: c for c in consumables_resp.data or []}

    movements_resp = (
        db.table("stock_movements")
        .select("consumable_id, type, quantity")
        .eq("contract_id", contract_id)
        .execute()
    )

    balances: dict[str, float] = {}
    for mv in movements_resp.data or []:
        cid = mv["consumable_id"]
        qty = float(mv["quantity"])
        if cid not in balances:
            balances[cid] = 0.0
        balances[cid] += qty if mv["type"] == "delivered" else -qty

    result = []
    for cid, c in consumables.items():
        bal = round(balances.get(cid, 0.0), 3)
        threshold = float(c.get("reorder_threshold") or 0)
        result.append({
            "consumable_id": cid,
            "name": c["name"],
            "unit": c["unit"],
            "total_delivered": round(sum(
                float(mv["quantity"]) for mv in movements_resp.data or []
                if mv["consumable_id"] == cid and mv["type"] == "delivered"
            ), 3),
            "total_used": round(sum(
                float(mv["quantity"]) for mv in movements_resp.data or []
                if mv["consumable_id"] == cid and mv["type"] == "used"
            ), 3),
            "balance": bal,
            "reorder_threshold": threshold,
            "is_low": bal < threshold,
        })

    return {"contract_id": contract_id, "balances": result}
