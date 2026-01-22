from typing import List, Optional, Dict
from sqlmodel import SQLModel, Field, Relationship, JSON
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum

class ThinkingAxis(str, Enum):
    CONSTRAINT_SENSITIVITY = "constraint_sensitivity"
    ASSUMPTION_SPOTTING = "assumption_spotting"
    ASYMPTOTIC_INTUITION = "asymptotic_intuition"
    EDGE_CASE_PARANOIA = "edge_case_paranoia"
    TIME_SPACE_TRADEOFF = "time_space_tradeoff"
    IMPLEMENTATION_ROBUSTNESS = "implementation_robustness"

class QuestionBase(SQLModel):
    content: str = Field(description="The canonical question text")
    question_type: str = Field(index=True, description="E.g., constraint_selection, assumption_break")
    difficulty_tier: int = Field(default=1, index=True)
    tags: List[str] = Field(default=[], sa_type=JSON)
    thinking_axis: Optional[str] = Field(default=None, description="The cognitive axis this question targets (ThinkingAxis enum)")
    variant_group_id: Optional[UUID] = Field(default=None, index=True, description="Links variants of the same core problem")
    allowed_mutation_ids: List[str] = Field(default=[], sa_type=JSON)
    explanation: Optional[str] = Field(default=None, description="Static/Legacy explanation if available")
    # Rating Mode Control
    is_canonical: bool = Field(default=False, index=True, description="If True, used in Rating mode for official scoring")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # NxtDevs Integration Fields
    language: Optional[str] = Field(default=None, index=True, description="Programming language: Python, JavaScript, Java, etc.")
    topic: Optional[str] = Field(default=None, index=True, description="Topic area: Loops, OOP, Data Types, etc.")
    difficulty: Optional[str] = Field(default=None, index=True, description="Easy, Medium, Hard")
    question_type_mcq: bool = Field(default=True, description="Is this a multiple choice question?")
    question_type_tf: bool = Field(default=False, description="Is this a true/false question?")
    question_type_sub: bool = Field(default=False, description="Is this a subjective question?")
    correct_answer: Optional[str] = Field(default=None, description="For NxtDevs-style: the correct answer text")

class Question(QuestionBase, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    
    options: List["Option"] = Relationship(back_populates="question")
    # In Postgres, we might want to version questions, but for MVP we stick to one active version.

class OptionBase(SQLModel):
    content: str
    is_correct: bool = Field(default=False)
    approach_type: str = Field(description="The underlying thinking pattern (e.g., 'Brute Force', 'Optimal')")
    assumptions_broken: List[str] = Field(default=[], sa_type=JSON, description="If this is a trap, what assumption did it break?")

class Option(OptionBase, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    question_id: UUID = Field(foreign_key="question.id")
    question: Question = Relationship(back_populates="options")

class MutationRule(SQLModel, table=True):
    """
    Store for allowed mutations.
    This replaces hardcoded dicts to allow dynamic loading of approved mutations.
    """
    id: str = Field(primary_key=True, description="e.g., 'scale_n_10x'")
    description: str
    allowed_range_min: float
    allowed_range_max: float
    target_variables: List[str] = Field(sa_type=JSON)
