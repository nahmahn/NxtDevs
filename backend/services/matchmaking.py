"""
Matchmaking service for 1v1 duels.
Pairs players by similar ELO rating.
"""
from typing import Optional, Tuple
from sqlmodel import Session, select
from uuid import UUID
from datetime import datetime, timedelta

from backend.models.duel_models import MatchmakingQueue, DuelSession, DuelRound, DuelStatus
from backend.models.user_state import ThinkingProfile, User
from backend.models.canonical import Question


# ELO range for matchmaking
BASE_ELO_RANGE = 300  # ±200 rating
EXPANDED_ELO_RANGE = 300  # ±300 after timeout
QUEUE_TIMEOUT_SECONDS = 30  # When to expand range


class MatchmakingService:
    """Handles player queue and matchmaking logic."""
    
    @staticmethod
    def join_queue(session: Session, user: User, profile: ThinkingProfile) -> Tuple[Optional[DuelSession], bool]:
        """
        Add player to matchmaking queue.
        Returns (duel_session, matched) - if matched, returns the created duel.
        """
        # Check if already in queue
        existing = session.exec(
            select(MatchmakingQueue).where(MatchmakingQueue.user_id == user.id)
        ).first()
        
        if existing:
            # Already in queue, check for match
            return MatchmakingService._find_match(session, user, profile)
        
        # Check if already in an active duel
        active_duel = session.exec(
            select(DuelSession).where(
                ((DuelSession.player1_id == user.id) | (DuelSession.player2_id == user.id)) &
                (DuelSession.status.in_([DuelStatus.WAITING, DuelStatus.COUNTDOWN, DuelStatus.IN_PROGRESS]))
            )
        ).first()
        
        if active_duel:
            return active_duel, True
        
        # Try to find a match first
        match_result = MatchmakingService._find_match(session, user, profile)
        if match_result[1]:  # Found a match
            return match_result
        
        # No match, add to queue
        queue_entry = MatchmakingQueue(
            user_id=user.id,
            elo_rating=profile.elo_rating
        )
        session.add(queue_entry)
        session.commit()
        
        return None, False
    
    @staticmethod
    def _find_match(session: Session, user: User, profile: ThinkingProfile) -> Tuple[Optional[DuelSession], bool]:
        """
        Try to find a matching opponent in the queue.
        """
        user_elo = profile.elo_rating
        now = datetime.utcnow()
        
        # Find players in range
        candidates = session.exec(
            select(MatchmakingQueue)
            .where(MatchmakingQueue.user_id != user.id)
            .order_by(MatchmakingQueue.joined_at.asc())  # FIFO
        ).all()
        
        print(f"[Matchmaking] User {user.username} ({user.id}) looking for match. detailed candidates count: {len(candidates)}")
        
        for candidate in candidates:
            # Check ELO range
            elo_diff = abs(candidate.elo_rating - user_elo)
            threshold = EXPANDED_ELO_RANGE if candidate.expanded_range else BASE_ELO_RANGE
            
            print(f" - Checking candidate {candidate.user_id}. ELO diff: {elo_diff}. Threshold: {threshold}")
            
            if elo_diff <= threshold:
                # Match found! Create duel
                print("[Matchmaking] Match found!")
                duel = MatchmakingService._create_duel(session, user, profile, candidate)
                return duel, True
        
        # Check if we should expand our own range (if in queue)
        own_entry = session.exec(
            select(MatchmakingQueue).where(MatchmakingQueue.user_id == user.id)
        ).first()
        
        if own_entry and not own_entry.expanded_range:
            if (now - own_entry.joined_at).total_seconds() > QUEUE_TIMEOUT_SECONDS:
                own_entry.expanded_range = True
                session.add(own_entry)
                session.commit()
                print(f"[Matchmaking] Expanded range for {user.username}")
        
        return None, False
    
    @staticmethod
    def _create_duel(
        session: Session,
        player1: User,
        player1_profile: ThinkingProfile,
        player2_queue: MatchmakingQueue
    ) -> DuelSession:
        """
        Create a new duel session between two players.
        """
        print(f"[Matchmaking] Creating duel between {player1.username} and {player2_queue.user_id}")
        
        # Get player2 profile
        player2_profile = session.exec(
            select(ThinkingProfile).where(ThinkingProfile.user_id == player2_queue.user_id)
        ).first()
        
        # Create duel
        duel = DuelSession(
            player1_id=player1.id,
            player2_id=player2_queue.user_id,
            player1_rating_start=player1_profile.elo_rating,
            player2_rating_start=player2_profile.elo_rating if player2_profile else 1200.0,
            status=DuelStatus.COUNTDOWN
        )
        session.add(duel)
        print(f"[Matchmaking] Duel object added to session: {duel}")
        
        # Delete queue entries properly
        session.delete(player2_queue)
        own_entry = session.exec(
            select(MatchmakingQueue).where(MatchmakingQueue.user_id == player1.id)
        ).first()
        if own_entry:
            session.delete(own_entry)
        
        print("[Matchmaking] Queue entries deleted")

        # Select 5 random questions for the duel
        questions = session.exec(
            select(Question).limit(5)
        ).all()
        print(f"[Matchmaking] Selected {len(questions)} questions")
        
        # Create rounds
        for i, question in enumerate(questions):
            duel_round = DuelRound(
                duel_id=duel.id,
                round_number=i,
                question_id=question.id
            )
            session.add(duel_round)
        
        try:
            session.commit()
            session.refresh(duel)
            print(f"[Matchmaking] Duel committed successfully. ID: {duel.id}")
        except Exception as e:
            print(f"[Matchmaking] COMMIT FAILED: {e}")
            raise e
        
        return duel
    
    @staticmethod
    def leave_queue(session: Session, user_id: UUID) -> bool:
        """Remove player from matchmaking queue."""
        entry = session.exec(
            select(MatchmakingQueue).where(MatchmakingQueue.user_id == user_id)
        ).first()
        
        if entry:
            session.delete(entry)
            session.commit()
            return True
        return False
    
    @staticmethod
    def get_queue_status(session: Session, user_id: UUID) -> dict:
        """Get current queue status for a player."""
        entry = session.exec(
            select(MatchmakingQueue).where(MatchmakingQueue.user_id == user_id)
        ).first()
        
        if not entry:
            return {"in_queue": False}
        
        queue_count = session.exec(select(MatchmakingQueue)).all()
        
        return {
            "in_queue": True,
            "joined_at": entry.joined_at.isoformat(),
            "expanded_range": entry.expanded_range,
            "queue_size": len(queue_count)
        }
