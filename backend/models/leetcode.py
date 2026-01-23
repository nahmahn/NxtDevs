from typing import Optional, Dict
from sqlmodel import SQLModel, Field, Relationship, JSON
from datetime import datetime
from uuid import UUID, uuid4

from backend.models.user_state import User

class LeetCodeStats(SQLModel, table=True):
    """
    Stores a snapshot of a user's LeetCode performance.
    """
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", unique=True)
    user: User = Relationship(back_populates="leetcode_stats")
    
    # Core Stats
    total_solved: int = Field(default=0)
    easy_solved: int = Field(default=0)
    medium_solved: int = Field(default=0)
    hard_solved: int = Field(default=0)
    ranking: int = Field(default=0)
    
    # Streak Tracking
    streak: int = Field(default=0)
    streak_active: bool = Field(default=False)

    
    # Detailed Tag Stats (from matchedUser.tagProblemCounts)
    # Stored as JSON: {"DP": 15, "Greedy": 8, ...}
    tag_stats: Dict = Field(default={}, sa_type=JSON)
    
    # Analysis Results (Mapped to NxtDevs Axes)
    # Stored as JSON: {"Greedy Bias": "High", "Optimal Substructure": "Strong"}
    thinking_patterns: Dict = Field(default={}, sa_type=JSON)
    
    # Recent Submissions (title, slug, timestamp)
    # Stored as JSON: [{"title": "Two Sum", "slug": "two-sum", "timestamp": ...}]
    recent_submissions: list[dict] = Field(default=[], sa_type=JSON)
    
    # Submission Calendar (heatmap data)
    # Stored as JSON: {"1683400000": 5, "1683500000": 2, ...}
    submission_calendar: Dict = Field(default={}, sa_type=JSON)
    
    # Historical Snapshots (for velocity tracking)
    # Stored as JSON: [{"date": "2023-01-01", "total_solved": 50}, ...]
    history: list[dict] = Field(default=[], sa_type=JSON)
    
    last_synced_at: datetime = Field(default_factory=datetime.utcnow)
