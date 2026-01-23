from typing import Optional, List, Dict
from sqlmodel import SQLModel, Field, Relationship, JSON
from datetime import datetime
from uuid import UUID, uuid4

class UserBase(SQLModel):
    username: str = Field(index=True, unique=True)
    email: Optional[str] = Field(default=None, index=True)
    password_hash: Optional[str] = Field(default=None)  # For auth

class User(UserBase, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    profile: Optional["ThinkingProfile"] = Relationship(back_populates="user")
    attempts: List["Attempt"] = Relationship(back_populates="user")
    reports: List["UserReport"] = Relationship(back_populates="user")
    
    # External integrations
    leetcode_username: Optional[str] = Field(default=None)
    leetcode_stats: Optional["LeetCodeStats"] = Relationship(back_populates="user")

class ThinkingProfile(SQLModel, table=True):
    """
    The 'Soul' of the user in the system.
    Tracks biases and ratings.
    """
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", unique=True)
    user: User = Relationship(back_populates="profile")
    
    # Ratings
    elo_rating: float = Field(default=1200.0)
    volatility: float = Field(default=350.0) # Glicko-style param
    
    # Cognitive Biases (0.0 to 1.0)
    greedy_bias: float = Field(default=0.5)
    constraint_blindness: float = Field(default=0.5)
    premature_optimization: float = Field(default=0.5)

    # Axis Specific Mastery (JSON Map: {ThinkingAxis: {"elo": 1200, "confidence": 0.5}})
    axis_performances: Dict = Field(default={}, sa_type=JSON)
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)

from backend.models.canonical import Question

class Attempt(SQLModel, table=True):
    """
    A single answer submission.
    """
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="attempts")
    
    question_id: UUID = Field(index=True, foreign_key="question.id") # Linked to canonical.Question
    question: Optional["Question"] = Relationship()
    
    selected_option_id: UUID
    is_correct: bool
    
    # Metadata
    time_taken_ms: int
    mode: str = Field(default="practice") # 'practice' or 'rating'
    mutation_applied: Optional[str] = Field(default=None) # mutation_id used
    
    # Rating snapshot at time of attempt
    rating_before: Optional[float] = Field(default=None)
    rating_after: Optional[float] = Field(default=None)
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class RatingHistory(SQLModel, table=True):
    """
    Tracks rating changes over time for graphing.
    One entry per rating change event.
    """
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    
    rating: float
    delta: float = Field(default=0.0)  # Change from previous rating
    attempt_id: Optional[UUID] = Field(default=None)  # Link to the attempt that caused this
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)

