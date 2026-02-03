@auth_router.get("/me")
async def get_me(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({
        "session_token": token,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
        
    # Fetch user details using session['user_id']
    user = await db.users.find_one({"id": session["user_id"]})
    return user