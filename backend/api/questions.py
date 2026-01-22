from fastapi import APIRouter, HTTPException, Depends, Request
from sqlmodel import Session, select, func
from backend.api.contracts import QuestionPublic, OptionPublic, AnswerSubmission, SubmissionResult, ThinkingUpdate, RatingUpdate
from backend.models.canonical import Question, Option, QuestionBase
from backend.core.db import get_session
from backend.services.gemini_service import generate_explanation

router = APIRouter()

@router.get("/questions/next", response_model=QuestionPublic)
async def get_next_question(
    request: Request,
    mode: str = "practice",
    language: str = None,
    topic: str = None,
    difficulty: str = None,
    session: Session = Depends(get_session)
):
    """
    Fetches the next question intelligently using the ThinkingOrchestrator.
    
    Mode Logic:
    - 'rating': Only canonical (is_canonical=True) questions for fair scoring
    - 'practice': Any question, adapts to the user's cognitive profile
    
    Filtering (NxtDevs integration):
    - language: Filter by programming language (Python, JavaScript, Java, etc.)
    - topic: Filter by topic area (Loops, OOP, Data Types, etc.)
    - difficulty: Filter by difficulty level (Easy, Medium, Hard)
    """
    from backend.engine.orchestrator import orchestrator
    
    # Get Current User (to access profile)
    user_id = get_current_user_id_from_request(request)
    user = get_current_user(session, user_id)
    
    # Build filter criteria for NxtDevs-style filtering
    filters = {}
    if language:
        filters['language'] = language
    if topic:
        filters['topic'] = topic
    if difficulty:
        filters['difficulty'] = difficulty
    
    # Intelligent fetch with mode awareness and optional filters
    question = await orchestrator.get_next_question(user, session, mode=mode, filters=filters if filters else None)
    
    if not question:
        if mode == "rating":
            raise HTTPException(status_code=404, detail="No canonical questions available for rating mode. Please try practice mode.")
        filter_msg = f" matching filters: {filters}" if filters else ""
        raise HTTPException(status_code=404, detail=f"No questions found{filter_msg}")

    # Refresh to load options relation if needed (default lazy)
    options = session.exec(select(Option).where(Option.question_id == question.id)).all()
    
    return QuestionPublic(
        id=question.id,
        content=question.content,
        difficulty_tier=question.difficulty_tier,
        tags=question.tags,
        thinking_axis=question.thinking_axis, # New Field
        options=[
            OptionPublic(
                id=opt.id,
                content=opt.content,
                approach_type=opt.approach_type
            ) for opt in options
        ],
        active_constraints={} # Legacy data doesn't have explicit constraints map yet
    )


@router.get("/questions/filters")
async def get_available_filters(session: Session = Depends(get_session)):
    """
    Returns available filter options for questions.
    Used by frontend to populate filter dropdowns.
    """
    # Get unique languages
    languages_result = session.exec(
        select(Question.language).where(Question.language != None).distinct()
    ).all()
    languages = [l for l in languages_result if l]
    
    # Get unique topics
    topics_result = session.exec(
        select(Question.topic).where(Question.topic != None).distinct()
    ).all()
    topics = [t for t in topics_result if t]
    
    # Get unique difficulties
    difficulties_result = session.exec(
        select(Question.difficulty).where(Question.difficulty != None).distinct()
    ).all()
    difficulties = [d for d in difficulties_result if d]
    
    # Get unique tags (tags is a JSON array, so we need to flatten and dedupe)
    all_questions = session.exec(select(Question.tags)).all()
    tags_set = set()
    for tags_list in all_questions:
        if tags_list:
            for tag in tags_list:
                if tag:
                    tags_set.add(tag)
    tags = sorted(list(tags_set))
    
    # Default difficulties if none in DB
    if not difficulties:
        difficulties = ["Easy", "Medium", "Hard"]
    
    return {
        "languages": sorted(languages) if languages else ["Python", "JavaScript", "Java"],
        "topics": sorted(topics) if topics else ["Loops", "OOP", "Data Types", "Functions"],
        "difficulties": difficulties,
        "tags": tags if tags else [],
        "question_types": ["MCQ", "True/False", "Subjective"]
    }

from datetime import datetime
from backend.engine.scoring import ScoringEngine
from backend.models.user_state import User, Attempt, ThinkingProfile
from backend.api.contracts import RatingUpdate, ThinkingUpdate

# ... imports ...


# Helper to get current user from request headers
def get_current_user_id_from_request(request: Request) -> str | None:
    """Extract user ID from X-User-Id header (returns UUID string)"""
    user_id_header = request.headers.get("X-User-Id")
    if user_id_header and user_id_header.strip():
        return user_id_header.strip()
    return None

def get_current_user(session: Session, user_id: str = None) -> User:
    """
    Get user by ID, or create a default user if none specified.
    user_id should come from request headers (X-User-Id) as UUID string.
    """
    from uuid import UUID
    
    # If user_id provided, find that specific user
    if user_id:
        try:
            uuid_obj = UUID(user_id)
            user = session.get(User, uuid_obj)
            if user:
                # Ensure profile exists
                profile = session.exec(select(ThinkingProfile).where(ThinkingProfile.user_id == user.id)).first()
                if not profile:
                    profile = ThinkingProfile(user_id=user.id)
                    session.add(profile)
                    session.commit()
                return user
        except (ValueError, TypeError):
            # Invalid UUID format, fall through to default
            pass
    
    # Fallback: Find or create a default user (for backwards compatibility)
    user = session.exec(select(User).where(User.username == "candidate_1")).first()
    if not user:
        user = User(username="candidate_1")
        session.add(user)
        session.flush()
        profile = ThinkingProfile(user_id=user.id)
        session.add(profile)
        session.commit()
    
    # Ensure profile exists for the found user
    profile = session.exec(select(ThinkingProfile).where(ThinkingProfile.user_id == user.id)).first()
    if not profile:
        profile = ThinkingProfile(user_id=user.id)
        session.add(profile)
        session.commit()
        session.refresh(user)
    
    return user

@router.get("/ping")
async def ping():
    return {"message": "pong"}

@router.get("/user/profile")
async def get_user_profile(request: Request, session: Session = Depends(get_session)):
    """
    Fetches the current user's profile and stats.
    """
    from backend.models.duel_models import DuelSession, DuelStatus
    
    user_id = get_current_user_id_from_request(request)
    user = get_current_user(session, user_id)
    # Ensure profile exists
    profile = session.exec(select(ThinkingProfile).where(ThinkingProfile.user_id == user.id)).first()
    
    # Count attempts
    attempts_count = session.exec(select(func.count(Attempt.id)).where(Attempt.user_id == user.id)).one()
    
    # Count correct attempts
    correct_count = session.exec(
        select(func.count(Attempt.id))
        .where(Attempt.user_id == user.id)
        .where(Attempt.is_correct == True)
    ).one()
    
    # --- DUEL STATS ---
    # Total duels played (both as player1 or player2, completed only)
    duels_as_p1 = session.exec(
        select(func.count(DuelSession.id))
        .where(DuelSession.player1_id == user.id)
        .where(DuelSession.status == DuelStatus.COMPLETED)
    ).one()
    duels_as_p2 = session.exec(
        select(func.count(DuelSession.id))
        .where(DuelSession.player2_id == user.id)
        .where(DuelSession.status == DuelStatus.COMPLETED)
    ).one()
    duels_played = duels_as_p1 + duels_as_p2
    
    # Duels won
    duels_won = session.exec(
        select(func.count(DuelSession.id))
        .where(DuelSession.winner_id == user.id)
        .where(DuelSession.status == DuelStatus.COMPLETED)
    ).one()
    
    # Duels lost (where there IS a winner but it's not us)
    duels_lost_p1 = session.exec(
        select(func.count(DuelSession.id))
        .where(DuelSession.player1_id == user.id)
        .where(DuelSession.winner_id != user.id)
        .where(DuelSession.winner_id != None)
        .where(DuelSession.status == DuelStatus.COMPLETED)
    ).one()
    duels_lost_p2 = session.exec(
        select(func.count(DuelSession.id))
        .where(DuelSession.player2_id == user.id)
        .where(DuelSession.winner_id != user.id)
        .where(DuelSession.winner_id != None)
        .where(DuelSession.status == DuelStatus.COMPLETED)
    ).one()
    duels_lost = duels_lost_p1 + duels_lost_p2
    
    # Duels drawn (winner_id is None in completed duels)
    duels_drawn_p1 = session.exec(
        select(func.count(DuelSession.id))
        .where(DuelSession.player1_id == user.id)
        .where(DuelSession.winner_id == None)
        .where(DuelSession.status == DuelStatus.COMPLETED)
    ).one()
    duels_drawn_p2 = session.exec(
        select(func.count(DuelSession.id))
        .where(DuelSession.player2_id == user.id)
        .where(DuelSession.winner_id == None)
        .where(DuelSession.status == DuelStatus.COMPLETED)
    ).one()
    duels_drawn = duels_drawn_p1 + duels_drawn_p2
    
    # Win rate
    win_rate = round((duels_won / duels_played * 100) if duels_played > 0 else 0, 1)
    
    # Total correct answers in duels (sum of player scores)
    duel_correct_p1 = session.exec(
        select(func.coalesce(func.sum(DuelSession.player1_score), 0))
        .where(DuelSession.player1_id == user.id)
        .where(DuelSession.status == DuelStatus.COMPLETED)
    ).one()
    duel_correct_p2 = session.exec(
        select(func.coalesce(func.sum(DuelSession.player2_score), 0))
        .where(DuelSession.player2_id == user.id)
        .where(DuelSession.status == DuelStatus.COMPLETED)
    ).one()
    duel_questions_solved = duel_correct_p1 + duel_correct_p2
    
    return {
        "username": user.username,
        "elo_rating": round(profile.elo_rating, 1),
        "biases": {
            "Greedy": profile.greedy_bias,
            "Blindness": profile.constraint_blindness,
            "Premature": profile.premature_optimization
        },
        "total_attempts": attempts_count,
        "correct_attempts": correct_count,
        "accuracy": round((correct_count / attempts_count * 100) if attempts_count > 0 else 0, 1),
        # Duel stats
        "duels_played": duels_played,
        "duels_won": duels_won,
        "duels_lost": duels_lost,
        "duels_drawn": duels_drawn,
        "win_rate": win_rate,
        "duel_questions_solved": duel_questions_solved
    }

from pydantic import BaseModel

class ProfileUpdate(BaseModel):
    username: str = None
    email: str = None

@router.put("/user/profile")
async def update_user_profile(request: Request, update: ProfileUpdate, session: Session = Depends(get_session)):
    """
    Updates the current user's profile (username, email).
    """
    user_id = get_current_user_id_from_request(request)
    user = get_current_user(session, user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if username is being changed and if it's already taken
    if update.username is not None and update.username != user.username:
        existing_user = session.exec(
            select(User).where(User.username == update.username)
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = update.username
    
    if update.email is not None:
        user.email = update.email
    
    try:
        session.add(user)
        session.commit()
        session.refresh(user)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Failed to update profile. Username may already be in use.")
    
    return {"success": True, "username": user.username, "email": user.email}


@router.get("/leaderboard")
async def get_leaderboard(
    request: Request,
    limit: int = 20,
    offset: int = 0,
    session: Session = Depends(get_session)
):
    """
    Fetches the global leaderboard ranked by ELO rating.
    Returns users with their rankings, ratings, and attempt counts.
    Uses Redis caching for fast responses (30s TTL).
    """
    from backend.core.cache import cache
    
    user_id = get_current_user_id_from_request(request)
    
    # Try cache first (only for first page)
    if offset == 0 and limit <= 100:
        cached = await cache.get_leaderboard(limit)
        if cached:
            # Get current user for highlighting
            current_user = get_current_user(session, user_id)
            # Update is_current_user flag
            for entry in cached["leaderboard"]:
                entry["is_current_user"] = False
            for entry in cached["leaderboard"]:
                if entry["username"] == current_user.username:
                    entry["is_current_user"] = True
                    cached["current_user"] = entry
                    cached["current_user_rank"] = entry["rank"]
                    break
            return cached
    
    # Get current user for highlighting
    current_user = get_current_user(session, user_id)
    
    # Get all profiles ordered by ELO rating (descending)
    # Join with User to get username
    statement = (
        select(ThinkingProfile, User)
        .join(User, ThinkingProfile.user_id == User.id)
        .order_by(ThinkingProfile.elo_rating.desc())
    )
    
    results = session.exec(statement).all()
    
    leaderboard = []
    for rank, (profile, user) in enumerate(results, start=1):
        # Count attempts for this user
        total_attempts = session.exec(
            select(func.count(Attempt.id))
            .where(Attempt.user_id == user.id)
        ).one()
        
        correct_attempts = session.exec(
            select(func.count(Attempt.id))
            .where(Attempt.user_id == user.id)
            .where(Attempt.is_correct == True)
        ).one()
        
        leaderboard.append({
            "rank": rank,
            "username": user.username,
            "elo_rating": round(profile.elo_rating, 1),
            "total_attempts": total_attempts,
            "correct_attempts": correct_attempts,
            "accuracy": round((correct_attempts / total_attempts * 100) if total_attempts > 0 else 0, 1),
            "is_current_user": user.id == current_user.id
        })
    
    # Apply pagination
    paginated = leaderboard[offset:offset + limit]
    
    # Find current user's rank if not in paginated results
    current_user_rank = None
    current_user_data = None
    for entry in leaderboard:
        if entry["is_current_user"]:
            current_user_rank = entry["rank"]
            current_user_data = entry
            break
    
    result = {
        "leaderboard": paginated,
        "total_users": len(leaderboard),
        "current_user_rank": current_user_rank,
        "current_user": current_user_data
    }
    
    # Cache the result (first page only)
    if offset == 0 and limit <= 100:
        await cache.set_leaderboard(result, limit, ttl=30)
    
    return result

@router.post("/questions/{question_id}/submit", response_model=SubmissionResult)
async def submit_answer(request: Request, question_id: str, submission: AnswerSubmission, session: Session = Depends(get_session)):
    """
    Submits an answer, persists the attempt, and updates the Thinking Profile.
    
    Rating Mode Logic:
    - 'rating' mode: Updates ELO rating
    - 'practice' mode: No ELO changes (consequence-free practice)
    """
    from backend.core.cache import cache
    from backend.services.ai_service import ai_service
    
    # 1. Get User Context
    user_id = get_current_user_id_from_request(request)
    user = get_current_user(session, user_id)
    profile = session.exec(select(ThinkingProfile).where(ThinkingProfile.user_id == user.id)).first()
    
    # 2. Verify Question & Option
    from uuid import UUID as PyUUID
    
    # Handle both string and UUID inputs
    def to_uuid(val):
        if isinstance(val, PyUUID):
            return val
        return PyUUID(str(val))
    
    try:
        q_uuid = to_uuid(question_id)
        s_uuid = to_uuid(submission.selected_option_id)
    except (ValueError, AttributeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid ID format: {e}")

    question = session.get(Question, q_uuid)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    selected_option = session.get(Option, s_uuid)
    if not selected_option:
        raise HTTPException(status_code=404, detail="Option not found")
        
    correct_option = session.exec(
        select(Option)
        .where(Option.question_id == q_uuid)
        .where(Option.is_correct == True)
    ).first()
    
    if not correct_option:
        raise HTTPException(status_code=500, detail="Corrupted Question: No correct answer found.")
    
    is_correct = selected_option.is_correct
    old_rating = profile.elo_rating
    
    # 3. Calculate Scoring Updates (ONLY in Rating Mode)
    if submission.mode == "rating":
        # Difficulty Mapping: 1=800, 2=1200, 3=1600 (Simple heuristic)
        difficulty_rating = 800 + (question.difficulty_tier * 400)
        actual_score = 1.0 if is_correct else 0.0
        
        new_rating = ScoringEngine.calculate_new_elo(old_rating, difficulty_rating, actual_score)
        rating_delta = new_rating - old_rating
        
        # Update Profile Rating
        profile.elo_rating = new_rating
        profile = ScoringEngine.update_profile_biases(profile, selected_option.approach_type or "Standard", is_correct)
        session.add(profile)
        
        # Invalidate profile cache
        await cache.invalidate_profile(str(user.id))
    else:
        # Practice Mode: No ELO changes
        new_rating = old_rating
        rating_delta = 0.0
        
        # Still track biases for learning insights (optional)
        profile = ScoringEngine.update_profile_biases(profile, selected_option.approach_type or "Standard", is_correct)
        session.add(profile)
    
    # 4. Record Attempt with rating snapshot
    from backend.models.user_state import RatingHistory
    
    attempt = Attempt(
        user_id=user.id,
        question_id=question.id,
        selected_option_id=selected_option.id,
        is_correct=is_correct,
        time_taken_ms=submission.time_taken_ms,
        mode=submission.mode,
        mutation_applied=None,
        rating_before=old_rating,
        rating_after=new_rating,
        timestamp=datetime.utcnow()
    )
    session.add(attempt)
    session.flush()  # Get attempt ID
    
    # 5. Record Rating History for graphing (only if rating changed)
    if rating_delta != 0:
        rating_history = RatingHistory(
            user_id=user.id,
            rating=new_rating,
            delta=rating_delta,
            attempt_id=attempt.id,
            timestamp=datetime.utcnow()
        )
        session.add(rating_history)
    
    session.commit()
    
    # 6. Generate AI Explanation (with caching for low latency)
    cache_key_q = str(question.id)
    cache_key_opt = str(selected_option.id)
    
    # Try cache first
    explanation = await cache.get_explanation(cache_key_q, cache_key_opt, is_correct)
    
    if not explanation:
        # Cache miss - generate personalized explanation
        user_profile_context = {
            "greedy_bias": profile.greedy_bias,
            "constraint_blindness": profile.constraint_blindness,
            "premature_optimization": profile.premature_optimization,
            "axis_performances": profile.axis_performances or {}
        }
        
        explanation = await ai_service.generate_personalized_explanation(
            user_profile=user_profile_context,
            question_content=question.content,
            selected_answer=selected_option.content,
            is_correct=is_correct
        )
        
        # Cache the result for future requests
        await cache.set_explanation(cache_key_q, cache_key_opt, is_correct, explanation)
    
    # 7. Build Response
    return SubmissionResult(
        is_correct=is_correct,
        explanation=explanation,
        correct_option_id=correct_option.id,
        thinking_profile_update=ThinkingUpdate(
            bias_detected="Greedy" if not is_correct else None,
            score_delta=rating_delta
        ),
        rating_update=RatingUpdate(
            old_rating=old_rating,
            new_rating=new_rating,
            delta=rating_delta
        )
    )


@router.get("/user/rating-history")
async def get_rating_history(
    request: Request,
    limit: int = 50,
    session: Session = Depends(get_session)
):
    """
    Fetches the current user's rating history for graphing.
    Returns chronological list of rating changes.
    """
    from backend.models.user_state import RatingHistory
    
    user_id = get_current_user_id_from_request(request)
    user = get_current_user(session, user_id)
    
    # Get rating history ordered by timestamp
    statement = (
        select(RatingHistory)
        .where(RatingHistory.user_id == user.id)
        .order_by(RatingHistory.timestamp.asc())
        .limit(limit)
    )
    
    history = session.exec(statement).all()
    
    # If no history, return initial rating point
    if not history:
        profile = session.exec(
            select(ThinkingProfile).where(ThinkingProfile.user_id == user.id)
        ).first()
        return {
            "history": [{
                "rating": profile.elo_rating if profile else 1200.0,
                "delta": 0,
                "timestamp": datetime.utcnow().isoformat(),
                "index": 0
            }],
            "current_rating": profile.elo_rating if profile else 1200.0,
            "total_changes": 0
        }
    
    # Build response
    history_data = []
    for idx, entry in enumerate(history):
        history_data.append({
            "rating": round(entry.rating, 1),
            "delta": round(entry.delta, 1),
            "timestamp": entry.timestamp.isoformat(),
            "index": idx + 1
        })
    
    return {
        "history": history_data,
        "current_rating": round(history[-1].rating, 1) if history else 1200.0,
        "total_changes": len(history),
        "highest_rating": round(max(e.rating for e in history), 1),
        "lowest_rating": round(min(e.rating for e in history), 1)
    }
