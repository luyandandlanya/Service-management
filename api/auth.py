import os
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


def require_owner(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            os.environ["SUPABASE_JWT_SECRET"],
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    role = payload.get("user_metadata", {}).get("role") or payload.get("app_metadata", {}).get("role")
    user_id = payload.get("sub")

    # Verify role in profiles table via service client
    from db import get_client
    resp = get_client().table("profiles").select("role").eq("id", user_id).single().execute()
    if not resp.data or resp.data.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")

    return user_id
