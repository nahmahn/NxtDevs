from uuid import UUID
from typing import List, Optional, Dict
from pydantic import BaseModel

class OptionPublic(BaseModel):
    id: UUID
    content: str
    approach_type: Optional[str] = None # Visible in practice?

class QuestionPublic(BaseModel):
    id: UUID
    content: str
    options: List[OptionPublic]
    difficulty_tier: int
    tags: List[str]
    # Allowed constraints for display
    active_constraints: Dict[str, str] = {}
    thinking_axis: Optional[str] = None

class AnswerSubmission(BaseModel):
    selected_option_id: UUID
    mode: str # 'practice' or 'rating'
    time_taken_ms: int

class ThinkingUpdate(BaseModel):
    bias_detected: Optional[str]
    score_delta: float

class RatingUpdate(BaseModel):
    old_rating: float
    new_rating: float
    delta: float

class SubmissionResult(BaseModel):
    is_correct: bool
    correct_option_id: UUID
    explanation: str
    thinking_profile_update: Optional[ThinkingUpdate] = None
    rating_update: Optional[RatingUpdate] = None
