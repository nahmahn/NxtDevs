"""
WebSocket API for real-time 1v1 duels.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Header
from sqlmodel import Session, select
from typing import Dict, List, Optional
from uuid import UUID
from datetime import datetime
import json
import asyncio

from backend.core.db import get_session
from backend.models.duel_models import DuelSession, DuelRound, DuelStatus, MatchmakingQueue
from backend.models.user_state import User, ThinkingProfile, Attempt, RatingHistory
from backend.models.canonical import Question, Option
from backend.services.matchmaking import MatchmakingService
from backend.engine.scoring import ScoringEngine

router = APIRouter(tags=["duels"])


class ConnectionManager:
    """Manages WebSocket connections for duels."""
    
    def __init__(self):
        # duel_id -> {user_id: WebSocket}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # user_id -> duel_id (for quick lookup)
        self.user_duels: Dict[str, str] = {}
    
    async def connect(self, websocket: WebSocket, duel_id: str, user_id: str):
        await websocket.accept()
        if duel_id not in self.active_connections:
            self.active_connections[duel_id] = {}
        self.active_connections[duel_id][user_id] = websocket
        self.user_duels[user_id] = duel_id
    
    def disconnect(self, duel_id: str, user_id: str):
        if duel_id in self.active_connections:
            self.active_connections[duel_id].pop(user_id, None)
            if not self.active_connections[duel_id]:
                del self.active_connections[duel_id]
        self.user_duels.pop(user_id, None)
    
    async def send_to_user(self, duel_id: str, user_id: str, message: dict):
        if duel_id in self.active_connections:
            ws = self.active_connections[duel_id].get(user_id)
            if ws:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    print(f"[WS] Failed to send to user {user_id}: {e}")
                    # Remove dead connection
                    self.disconnect(duel_id, user_id)
    
    async def broadcast_to_duel(self, duel_id: str, message: dict):
        print(f"[WS BROADCAST] Duel {duel_id}: {message.get('type', 'unknown')}")
        if duel_id in self.active_connections:
            # Copy the dict to avoid modification during iteration
            connections = dict(self.active_connections[duel_id])
            print(f"[WS BROADCAST] Found {len(connections)} active connections")
            for user_id, ws in connections.items():
                try:
                    await ws.send_json(message)
                    print(f"[WS BROADCAST] Sent to user {user_id}")
                except Exception as e:
                    print(f"[WS] Failed to broadcast to {user_id}, removing: {e}")
                    # Remove dead connection but continue to others
                    self.disconnect(duel_id, user_id)
        else:
            print(f"[WS BROADCAST] No active connections for duel {duel_id}!")
    
    def get_connected_users(self, duel_id: str) -> List[str]:
        if duel_id in self.active_connections:
            return list(self.active_connections[duel_id].keys())
        return []


# Global connection manager
manager = ConnectionManager()


def get_current_user_and_id(session: Session, x_user_id: Optional[str] = None) -> User:
    """
    Get current user by UUID from X-User-Id header.
    """
    print(f"[AUTH DEBUG] Received X-User-Id: {x_user_id}")
    
    if x_user_id:
        try:
            user_uuid = UUID(x_user_id)
            user = session.get(User, user_uuid)
            if user:
                print(f"[AUTH DEBUG] Found user: {user.username} ({user.id})")
                return user
            else:
                print(f"[AUTH DEBUG] User not found for UUID: {user_uuid}")
        except (ValueError, TypeError) as e:
            print(f"[AUTH DEBUG] Invalid UUID format: {x_user_id} - Error: {e}")
            pass
    
    print("[AUTH DEBUG] Falling back to candidate_1")
    # Fallback to candidate_1 for backwards compatibility
    user = session.exec(select(User).where(User.username == "candidate_1")).first()
        
    if not user:
         raise HTTPException(status_code=401, detail="User not found")
    return user


# === REST Endpoints for Duel Management ===

@router.post("/duel/join-queue")
async def join_matchmaking_queue(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    session: Session = Depends(get_session)
):
    """
    Join the matchmaking queue to find an opponent.
    Returns immediately with queue status or match info.
    """
    user = get_current_user_and_id(session, x_user_id)
    profile = session.exec(
        select(ThinkingProfile).where(ThinkingProfile.user_id == user.id)
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    duel, matched = MatchmakingService.join_queue(session, user, profile)
    
    if matched and duel:
        # Get opponent info
        opponent_id = duel.player2_id if duel.player1_id == user.id else duel.player1_id
        opponent = session.get(User, opponent_id)
        
        return {
            "status": "matched",
            "duel_id": str(duel.id),
            "opponent": {
                "username": opponent.username if opponent else "Unknown",
                "rating": duel.player2_rating_start if duel.player1_id == user.id else duel.player1_rating_start
            },
            "is_player1": duel.player1_id == user.id
        }
    
    queue_status = MatchmakingService.get_queue_status(session, user.id)
    return {
        "status": "queued",
        **queue_status
    }


@router.post("/duel/leave-queue")
async def leave_matchmaking_queue(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    session: Session = Depends(get_session)
):
    """Leave the matchmaking queue."""
    user = get_current_user_and_id(session, x_user_id)
    left = MatchmakingService.leave_queue(session, user.id)
    return {"left": left}


@router.get("/duel/{duel_id}")
async def get_duel_state(
    duel_id: str,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    session: Session = Depends(get_session)
):
    """Get current state of a duel."""
    try:
        duel_uuid = UUID(duel_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid duel ID")
    
    duel = session.get(DuelSession, duel_uuid)
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")
    
    user = get_current_user_and_id(session, x_user_id)
    is_player1 = duel.player1_id == user.id
    
    # Get opponent info
    opponent_id = duel.player2_id if is_player1 else duel.player1_id
    opponent = session.get(User, opponent_id) if opponent_id else None
    
    # Get current round
    rounds = session.exec(
        select(DuelRound).where(DuelRound.duel_id == duel.id).order_by(DuelRound.round_number)
    ).all()
    
    current_round_data = None
    if duel.current_round < len(rounds):
        round_obj = rounds[duel.current_round]
        question = session.get(Question, round_obj.question_id)
        options = session.exec(
            select(Option).where(Option.question_id == round_obj.question_id)
        ).all()
        
        # Check if current user has answered
        my_answered = (round_obj.player1_option_id is not None) if is_player1 else (round_obj.player2_option_id is not None)
        opponent_answered = (round_obj.player2_option_id is not None) if is_player1 else (round_obj.player1_option_id is not None)
        
        current_round_data = {
            "round_number": round_obj.round_number,
            "question": {
                "id": str(question.id),
                "content": question.content,
                "options": [{"id": str(o.id), "content": o.content} for o in options]
            } if question else None,
            "my_answered": my_answered,
            "opponent_answered": opponent_answered,
            "started_at": round_obj.started_at.isoformat() if round_obj.started_at else None
        }
    
    return {
        "id": str(duel.id),
        "status": duel.status,
        "is_player1": is_player1,
        "my_score": duel.player1_score if is_player1 else duel.player2_score,
        "opponent_score": duel.player2_score if is_player1 else duel.player1_score,
        "opponent": {
            "username": opponent.username if opponent else "Unknown",
            "rating": duel.player2_rating_start if is_player1 else duel.player1_rating_start
        } if opponent else None,
        "current_round": duel.current_round,
        "total_rounds": duel.total_rounds,
        "round_data": current_round_data
    }


@router.post("/duel/{duel_id}/answer")
async def submit_duel_answer(
    duel_id: str,
    option_id: str,
    time_ms: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    session: Session = Depends(get_session)
):
    """Submit an answer for the current round."""
    try:
        duel_uuid = UUID(duel_id)
        option_uuid = UUID(option_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    duel = session.get(DuelSession, duel_uuid)
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")
    
    if duel.status != DuelStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Duel not in progress")
    
    user = get_current_user_and_id(session, x_user_id)
    is_player1 = duel.player1_id == user.id
    
    print(f"[Answer] User: {user.username} ({user.id})")
    print(f"[Answer] X-User-Id header: {x_user_id}")
    print(f"[Answer] Duel player1_id: {duel.player1_id}, player2_id: {duel.player2_id}")
    print(f"[Answer] is_player1: {is_player1}")
    
    if not is_player1 and duel.player2_id != user.id:
        raise HTTPException(status_code=403, detail="Not a participant in this duel")
    
    # Get current round
    current_round = session.exec(
        select(DuelRound)
        .where(DuelRound.duel_id == duel.id)
        .where(DuelRound.round_number == duel.current_round)
    ).first()
    
    if not current_round:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Check if already answered
    if is_player1 and current_round.player1_option_id:
        raise HTTPException(status_code=400, detail="Already answered this round")
    if not is_player1 and current_round.player2_option_id:
        raise HTTPException(status_code=400, detail="Already answered this round")
    
    # Get the selected option and check correctness
    option = session.get(Option, option_uuid)
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    
    is_correct = option.is_correct
    
    # Save the answer
    now = datetime.utcnow()
    if is_player1:
        current_round.player1_option_id = option_uuid
        current_round.player1_is_correct = is_correct
        current_round.player1_time_ms = time_ms
        current_round.player1_answered_at = now
        if is_correct:
            duel.player1_score += 1
    else:
        current_round.player2_option_id = option_uuid
        current_round.player2_is_correct = is_correct
        current_round.player2_time_ms = time_ms
        current_round.player2_answered_at = now
        if is_correct:
            duel.player2_score += 1
    
    session.add(current_round)
    session.add(duel)
    session.commit()
    
    # Check if both players answered
    both_answered = (current_round.player1_option_id is not None and 
                     current_round.player2_option_id is not None)
    
    # Broadcast answer submission
    duel_id_str = str(duel.id)
    await manager.broadcast_to_duel(duel_id_str, {
        "type": "ANSWER_SUBMITTED",
        "player": "player1" if is_player1 else "player2",
        "both_answered": both_answered
    })
    
    if both_answered:
        # Reveal answers
        current_round.revealed_at = now
        session.add(current_round)
        session.commit()
        
        await manager.broadcast_to_duel(duel_id_str, {
            "type": "ROUND_END",
            "round": duel.current_round,
            "player1_correct": current_round.player1_is_correct,
            "player2_correct": current_round.player2_is_correct,
            "scores": {
                "player1": duel.player1_score,
                "player2": duel.player2_score
            }
        })
        
        # Move to next round or end duel
        if duel.current_round >= duel.total_rounds - 1:
            # Duel finished
            await _finish_duel(session, duel, duel_id_str)
        else:
            duel.current_round += 1
            session.add(duel)
            session.commit()
            
            # Start next round
            await asyncio.sleep(3)  # Brief pause for reveal
            next_round = session.exec(
                select(DuelRound)
                .where(DuelRound.duel_id == duel.id)
                .where(DuelRound.round_number == duel.current_round)
            ).first()
            if next_round:
                next_round.started_at = datetime.utcnow()
                session.add(next_round)
                session.commit()
            
            await manager.broadcast_to_duel(duel_id_str, {
                "type": "QUESTION_START",
                "round": duel.current_round
            })
    
    return {
        "answered": True,
        "is_correct": is_correct,
        "waiting_for_opponent": not both_answered
    }


async def _finish_duel(session: Session, duel: DuelSession, duel_id_str: str):
    """Complete a duel and calculate final ratings."""
    duel.status = DuelStatus.COMPLETED
    duel.ended_at = datetime.utcnow()
    
    # Determine winner
    if duel.player1_score > duel.player2_score:
        duel.winner_id = duel.player1_id
        p1_result, p2_result = 1.0, 0.0
    elif duel.player2_score > duel.player1_score:
        duel.winner_id = duel.player2_id
        p1_result, p2_result = 0.0, 1.0
    else:
        duel.winner_id = None  # Draw
        p1_result, p2_result = 0.5, 0.5
    
    # Calculate ELO changes
    p1_new = ScoringEngine.calculate_new_elo(
        duel.player1_rating_start,
        duel.player2_rating_start,
        p1_result
    )
    p2_new = ScoringEngine.calculate_new_elo(
        duel.player2_rating_start,
        duel.player1_rating_start,
        p2_result
    )
    
    duel.player1_rating_delta = p1_new - duel.player1_rating_start
    duel.player2_rating_delta = p2_new - duel.player2_rating_start
    
    # Update actual profiles
    p1_profile = session.exec(
        select(ThinkingProfile).where(ThinkingProfile.user_id == duel.player1_id)
    ).first()
    
    if p1_profile:
        p1_profile.elo_rating = p1_new
        session.add(p1_profile)

    p2_profile = session.exec(
        select(ThinkingProfile).where(ThinkingProfile.user_id == duel.player2_id)
    ).first()

    if p2_profile:
        p2_profile.elo_rating = p2_new
        session.add(p2_profile)
    
    # Save Rating History for Graph
    timestamp = datetime.utcnow()
    
    # Player 1 History
    p1_history = RatingHistory(
        user_id=duel.player1_id,
        rating=p1_new,
        delta=p1_new - duel.player1_rating_start,
        timestamp=timestamp
    )
    session.add(p1_history)
    
    # Player 2 History
    p2_history = RatingHistory(
        user_id=duel.player2_id,
        rating=p2_new,
        delta=p2_new - duel.player2_rating_start,
        timestamp=timestamp
    )
    session.add(p2_history)
    
    session.add(duel)
    session.commit()
    
    # Broadcast duel end
    await manager.broadcast_to_duel(duel_id_str, {
        "type": "DUEL_END",
        "winner": "player1" if duel.winner_id == duel.player1_id else (
            "player2" if duel.winner_id == duel.player2_id else "draw"
        ),
        "final_scores": {
            "player1": duel.player1_score,
            "player2": duel.player2_score
        },
        "rating_changes": {
            "player1": round(duel.player1_rating_delta, 1),
            "player2": round(duel.player2_rating_delta, 1)
        },
        "new_ratings": {
            "player1": round(p1_new, 1),
            "player2": round(p2_new, 1)
        }
    })


# === WebSocket Endpoint ===

@router.websocket("/ws/duel/{duel_id}")
async def duel_websocket(websocket: WebSocket, duel_id: str):
    """
    WebSocket connection for real-time duel updates.
    """
    # Get session manually for WebSocket
    from backend.core.db import engine
    from sqlmodel import Session as SqlSession
    
    # Get user from query param
    x_test_user = websocket.query_params.get("user")
    
    # 1. Validation Phase (Short-lived session)
    user = None
    duel_uuid = None
    
    with SqlSession(engine) as session:
        try:
            duel_uuid = UUID(duel_id)
        except ValueError:
            await websocket.close(code=4000)
            return
        
        duel = session.get(DuelSession, duel_uuid)
        if not duel:
            await websocket.close(code=4004)
            return
        
        # Get user by UUID from query param (the user_id is passed as ?user=<uuid>)
        x_user_id = websocket.query_params.get("user")
        user = None
        
        if x_user_id:
            try:
                user_uuid = UUID(x_user_id)
                user = session.get(User, user_uuid)
            except (ValueError, TypeError):
                pass
        
        if not user:
            # Fallback
            user = session.exec(select(User).where(User.username == "candidate_1")).first()
            if not user:
                await websocket.close(code=4001)
                return
        
        user_id_str = str(user.id)
        
        user_id_str = str(user.id)
        
    # Connect
    await manager.connect(websocket, duel_id, user_id_str)
    
    try:
        # Handle reconnection: Send current state if already in progress
        # Use a fresh short-lived session for state checks
        with SqlSession(engine) as session:
             duel = session.get(DuelSession, duel_uuid)
             if duel and duel.status == DuelStatus.IN_PROGRESS:
                print(f"[WS] User {user.username} reconnected to active duel {duel.id}")
                await websocket.send_json({
                    "type": "QUESTION_START",
                    "round": duel.current_round
                })
        
        # Check if both players connected
        # Use a fresh session for match start logic
        with SqlSession(engine) as session:
            duel = session.get(DuelSession, duel_uuid)
            connected = manager.get_connected_users(duel_id)
            
            if duel and len(connected) >= 2 and duel.status == DuelStatus.COUNTDOWN:
                # Start the duel
                duel.status = DuelStatus.IN_PROGRESS
                duel.started_at = datetime.utcnow()
                
                # Start first round
                first_round = session.exec(
                    select(DuelRound)
                    .where(DuelRound.duel_id == duel.id)
                    .where(DuelRound.round_number == 0)
                ).first()
                if first_round:
                    first_round.started_at = datetime.utcnow()
                    session.add(first_round)
                
                session.add(duel)
                session.commit()
                
                await manager.broadcast_to_duel(duel_id, {
                    "type": "MATCH_START",
                    "countdown": 3
                })
                
                await asyncio.sleep(3)
                
                await manager.broadcast_to_duel(duel_id, {
                    "type": "QUESTION_START",
                    "round": 0
                })
            
            # Listen for messages
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle client messages (ping/pong, etc.)
                if message.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                    
    except WebSocketDisconnect:
        print(f"[WS] User {user.username} disconnected from duel {duel_id}")
        manager.disconnect(duel_id, user_id_str)
        
        # Notify opponent of disconnect
        await manager.broadcast_to_duel(duel_id, {
            "type": "OPPONENT_DISCONNECTED"
        })
    except Exception as e:
        print(f"[WS] Error in duel {duel_id}: {e}")
        manager.disconnect(duel_id, user_id_str)
        try:
            await websocket.close(code=1011)  # Internal error
        except:
            pass
