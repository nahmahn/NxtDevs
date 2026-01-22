"""
Duel Models for 1v1 real-time matches.
"""
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum


class DuelStatus(str, Enum):
    """Status of a duel session."""
    WAITING = "waiting"       # Waiting for opponent
    COUNTDOWN = "countdown"   # Match found, countdown
    IN_PROGRESS = "in_progress"  # Duel active
    COMPLETED = "completed"   # Duel finished
    CANCELLED = "cancelled"   # Player left


class DuelSession(SQLModel, table=True):
    """
    A 1v1 duel between two players.
    Contains 5 rounds (questions).
    """
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    
    # Players
    player1_id: UUID = Field(foreign_key="user.id", index=True)
    player2_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)
    
    # Ratings at start (for fair ELO calc)
    player1_rating_start: float = Field(default=1200.0)
    player2_rating_start: Optional[float] = Field(default=None)
    
    # Scores
    player1_score: int = Field(default=0)  # Correct answers count
    player2_score: int = Field(default=0)
    
    # Timing
    current_round: int = Field(default=0)  # 0-indexed, max 4 (5 rounds)
    total_rounds: int = Field(default=5)
    time_per_question_ms: int = Field(default=60000)  # 60 seconds
    
    # Status
    status: str = Field(default=DuelStatus.WAITING)
    winner_id: Optional[UUID] = Field(default=None)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    ended_at: Optional[datetime] = Field(default=None)
    
    # ELO changes (calculated at end)
    player1_rating_delta: Optional[float] = Field(default=None)
    player2_rating_delta: Optional[float] = Field(default=None)


class DuelRound(SQLModel, table=True):
    """
    A single round/question in a duel.
    Tracks both players' answers for a given question.
    """
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    duel_id: UUID = Field(foreign_key="duelsession.id", index=True)
    round_number: int  # 0-4
    
    question_id: UUID = Field(index=True)  # Link to canonical.Question
    
    # Player 1 answer
    player1_option_id: Optional[UUID] = Field(default=None)
    player1_is_correct: Optional[bool] = Field(default=None)
    player1_time_ms: Optional[int] = Field(default=None)
    player1_answered_at: Optional[datetime] = Field(default=None)
    
    # Player 2 answer
    player2_option_id: Optional[UUID] = Field(default=None)
    player2_is_correct: Optional[bool] = Field(default=None)
    player2_time_ms: Optional[int] = Field(default=None)
    player2_answered_at: Optional[datetime] = Field(default=None)
    
    # Round timing
    started_at: Optional[datetime] = Field(default=None)
    revealed_at: Optional[datetime] = Field(default=None)


class MatchmakingQueue(SQLModel, table=True):
    """
    Queue entry for players waiting to be matched.
    """
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", unique=True, index=True)
    elo_rating: float  # Snapshot at time of joining
    
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    expanded_range: bool = Field(default=False)  # True after 30s timeout
