from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from typing import Optional
from pydantic import BaseModel

from backend.core.db import get_session
from backend.core.auth import get_current_user
from backend.models.user_state import User
from backend.models.leetcode import LeetCodeStats
from backend.services.leetcode_service import leetcode_service

router = APIRouter(prefix="/leetcode", tags=["leetcode"])

class LinkRequest(BaseModel):
    username: str

class LeetCodeStatsResponse(BaseModel):
    username: str
    total_solved: int
    easy: int
    medium: int
    hard: int
    ranking: int
    streak: int
    streak_active: bool
    thinking_patterns: dict
    last_synced: Optional[str]

# ...

@router.get("/stats")
async def get_leetcode_stats(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Returns the user's current LeetCode stats.
    """
    if not user.leetcode_username:
        return {"linked": False}
        
    statement = select(LeetCodeStats).where(LeetCodeStats.user_id == user.id)
    stats = session.exec(statement).first()
    
    if not stats:
        # Should not happen if linked, but auto-sync if missing
        stats = await leetcode_service.sync_user_stats(session, user)
        
    return {
        "linked": True,
        "username": user.leetcode_username,
        "total_solved": stats.total_solved,
        "easy": stats.easy_solved,
        "medium": stats.medium_solved,
        "hard": stats.hard_solved,
        "ranking": stats.ranking,
        "streak": stats.streak,
        "streak_active": stats.streak_active,
        "thinking_patterns": stats.thinking_patterns,
        "tag_stats": stats.tag_stats,
        "recent_submissions": stats.recent_submissions,
        "submission_calendar": stats.submission_calendar,
        "history": stats.history,
        "last_synced": stats.last_synced_at.isoformat()
    }

@router.post("/sync")
async def sync_leetcode_stats(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Forces a sync of the user's LeetCode stats.
    """
    if not user.leetcode_username:
        raise HTTPException(status_code=400, detail="LeetCode not linked")

    stats = await leetcode_service.sync_user_stats(session, user)

    return {
        "linked": True,
        "username": user.leetcode_username,
        "total_solved": stats.total_solved,
        "easy": stats.easy_solved,
        "medium": stats.medium_solved,
        "hard": stats.hard_solved,
        "ranking": stats.ranking,
        "streak": stats.streak,
        "streak_active": stats.streak_active,
        "thinking_patterns": stats.thinking_patterns,
        "tag_stats": stats.tag_stats,
        "recent_submissions": stats.recent_submissions,
        "submission_calendar": stats.submission_calendar,
        "history": stats.history,
        "last_synced": stats.last_synced_at.isoformat()
    }
