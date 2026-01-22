"""
TutorAI Chat API Endpoint for Axiom
Provides conversational AI tutoring with context awareness.
Ported from NxtDevs tutorAI.py endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from sqlmodel import Session, select
from backend.core.db import get_session
from backend.core.auth import get_current_user
from backend.models.user_state import User, Attempt
from backend.services.tutor_service import tutor_service

from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/tutor", tags=["TutorAI"])


class ChatRequest(BaseModel):
    """Request schema for chat endpoint."""
    message: str
    include_context: bool = True  # Whether to include performance context


class ChatResponse(BaseModel):
    """Response schema for chat endpoint."""
    reply: str
    session_id: Optional[str] = None
    actions: Optional[List[str]] = None  # Log of agent actions (e.g., "Searched for X")


class ClearHistoryResponse(BaseModel):
    """Response schema for clearing chat history."""
    success: bool
    message: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_tutor(
    request: ChatRequest,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    """
    Chat with the AI tutor.
    
    The tutor uses your quiz performance history to provide personalized
    guidance and explanations.
    
    Args:
        request: Chat message and options
        db: Database session
        user: Current authenticated user
        
    Returns:
        AI tutor response with optional session info
    """
    try:
        user_id = str(user.id)
        user_message = request.message.strip()
        
        if not user_message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        # Fetch user attempts for context if requested
        attempts = []
        if request.include_context:
            statement = select(Attempt).where(
                Attempt.user_id == user.id
            ).options(selectinload(Attempt.question)).order_by(Attempt.timestamp.desc()).limit(100)
            attempts = db.exec(statement).all()
        
        # Get AI response
        response_data = await tutor_service.chat(
            user_id=user_id,
            message=user_message,
            attempts=attempts
        )
        
        # Handle tuple return (reply, actions) or string (processed inside service to always be tuple for safety?)
        # Let's ensure service always returns tuple or we check type.
        if isinstance(response_data, tuple):
            reply, actions = response_data
        else:
            reply = response_data
            actions = []
        
        return ChatResponse(
            reply=reply,
            session_id=f"tutor_session_{user_id}",
            actions=actions
        )
        
    except Exception as e:
        print(f"TutorAI Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="AI Tutor is having trouble thinking right now. Please try again."
        )


@router.post("/clear-history", response_model=ClearHistoryResponse)
async def clear_chat_history(
    user: User = Depends(get_current_user)
):
    """
    Clear the chat history for the current user.
    
    This starts a fresh conversation with the tutor.
    
    Returns:
        Success status and message
    """
    try:
        user_id = str(user.id)
        success = tutor_service.clear_history(user_id)
        
        if success:
            return ClearHistoryResponse(
                success=True,
                message="Chat history cleared successfully"
            )
        else:
            return ClearHistoryResponse(
                success=False,
                message="Unable to clear history. Redis may not be available."
            )
            
    except Exception as e:
        print(f"Clear history error: {e}")
        return ClearHistoryResponse(
            success=False,
            message=f"Error clearing history: {str(e)}"
        )


@router.get("/state")
async def get_tutor_state(
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    """
    Get the current "Tutor State" (student stats and context).
    Used for the Tutor Dashboard sidebar.
    """
    try:
        # Eager load questions for accurate stats
        statement = select(Attempt).where(
            Attempt.user_id == user.id
        ).options(selectinload(Attempt.question)).order_by(Attempt.timestamp.desc()).limit(100)
        
        attempts = db.exec(statement).all()
        stats = tutor_service.get_student_stats(attempts)
        
        return {
            "stats": stats,
            "session_id": f"tutor_session_{user.id}"
        }
    except Exception as e:
        print(f"Error fetching tutor state: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch tutor state")


@router.get("/suggestions")
async def get_chat_suggestions(
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    """
    Get suggested prompts based on user's recent activity.
    
    Returns contextual suggestions for what to ask the tutor.
    """
    # Fetch recent attempts to identify weak areas
    statement = select(Attempt).where(
        Attempt.user_id == user.id,
        Attempt.is_correct == False
    ).order_by(Attempt.timestamp.desc()).limit(10)
    recent_mistakes = db.exec(statement).all()
    
    # Generate suggestions based on mistakes
    suggestions = [
        "Explain the difference between arrays and linked lists",
        "Help me understand Big O notation",
        "What's the best way to approach coding problems?",
    ]
    
    # Add topic-specific suggestions based on mistakes
    topics_struggled = set()
    for attempt in recent_mistakes:
        if hasattr(attempt, 'question') and attempt.question:
            topic = getattr(attempt.question, 'topic', None)
            if topic and topic not in topics_struggled:
                topics_struggled.add(topic)
                suggestions.insert(0, f"Help me understand {topic} better")
    
    return {
        "suggestions": suggestions[:6],  # Limit to 6 suggestions
        "context": f"Based on {len(recent_mistakes)} recent mistakes" if recent_mistakes else "General suggestions"
    }


from fastapi.responses import StreamingResponse

@router.post("/chat/stream")
async def stream_chat_with_tutor(
    request: ChatRequest,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    """
    Stream chat with the AI tutor.
    """
    user_id = str(user.id)
    user_message = request.message.strip()
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    attempts = []
    if request.include_context:
        statement = select(Attempt).where(
            Attempt.user_id == user.id
        ).options(selectinload(Attempt.question)).order_by(Attempt.timestamp.desc()).limit(100)
        attempts = db.exec(statement).all()
    
    return StreamingResponse(
        tutor_service.stream_chat(user_id, user_message, attempts),
        media_type="text/plain"
    )
