from typing import Optional, List, Dict
from sqlmodel import Session, select, func
from backend.models.canonical import Question, ThinkingAxis, Option
from backend.models.user_state import User, ThinkingProfile
from backend.services.ai_service import ai_service
import random
from uuid import UUID

class ThinkingOrchestrator:
    """
    "The Brain" of the system.
    Decides WHICH cognitive muscle to train next based on user's profile.
    """
    
    @staticmethod
    async def select_next_axis(profile: ThinkingProfile) -> ThinkingAxis:
        """
        Decides the next ThinkingAxis to target.
        """
        # 1. Get current performance map
        axis_perfs = profile.axis_performances or {}
        
        # 2. Identify Weaknesses (ELO < 1000 or Confidence < 0.4)
        weak_axes = []
        for axis_name, data in axis_perfs.items():
            if data.get("elo", 1200) < 1100:
                # Validate enum
                try:
                    weak_axes.append(ThinkingAxis(axis_name))
                except ValueError:
                    pass
        
        # 3. Strategy: 40% Bias correction, 40% Random Rotation, 20% Double-down strength
        roll = random.random()
        
        if roll < 0.4 and weak_axes:
            return random.choice(weak_axes)
        
        # Default: Random rotation among all axes
        return random.choice(list(ThinkingAxis))

    @staticmethod
    def _apply_filters(statement, filters: Optional[Dict] = None):
        """
        Apply NxtDevs-style filters to a query statement.
        
        Args:
            statement: The SQLModel select statement
            filters: Dict with optional keys: language, topic, difficulty
            
        Returns:
            Modified statement with filters applied
        """
        if not filters:
            return statement
        
        if filters.get('language'):
            statement = statement.where(Question.language == filters['language'])
        if filters.get('topic'):
            statement = statement.where(Question.topic == filters['topic'])
        if filters.get('difficulty'):
            statement = statement.where(Question.difficulty == filters['difficulty'])
        
        return statement

    @staticmethod
    async def get_next_question(
        user: User, 
        session: Session, 
        mode: str = "practice",
        filters: Optional[Dict] = None
    ) -> Question:
        """
        Intelligently fetches the next question.
        
        Mode Logic:
        - 'rating': Only canonical (is_canonical=True) questions for fair scoring
        - 'practice': Any question, adapts to cognitive profile
        
        Filters (NxtDevs integration):
        - language: Programming language (Python, JavaScript, Java, etc.)
        - topic: Topic area (Loops, OOP, Data Types, etc.)
        - difficulty: Difficulty level (Easy, Medium, Hard)
        """
        # 1. Access User Profile
        if not user.profile:
            # Safety net for users without profile
            base_query = select(Question)
            if mode == "rating":
                base_query = base_query.where(Question.is_canonical == True)
            # Apply filters
            base_query = ThinkingOrchestrator._apply_filters(base_query, filters)
            return session.exec(base_query.order_by(func.random()).limit(1)).first()
            
        profile = user.profile
        
        # 2. Determine Target Axis (only if no filters specified)
        if not filters:
            target_axis = await ThinkingOrchestrator.select_next_axis(profile)
            
            # 3. Build query based on mode with axis targeting
            statement = select(Question).where(Question.thinking_axis == target_axis)
        else:
            # With filters, skip axis-based selection
            statement = select(Question)
        
        # Rating mode: Only canonical questions
        if mode == "rating":
            statement = statement.where(Question.is_canonical == True)
        
        # Apply NxtDevs-style filters
        statement = ThinkingOrchestrator._apply_filters(statement, filters)
        
        statement = statement.order_by(func.random()).limit(1)
        candidate = session.exec(statement).first()
        
        # 4. Fallback if no questions for this criteria
        if not candidate:
            # Fallback to ANY question (respecting mode and filters)
            fallback_query = select(Question)
            if mode == "rating":
                fallback_query = fallback_query.where(Question.is_canonical == True)
            
            # Still apply filters in fallback
            fallback_query = ThinkingOrchestrator._apply_filters(fallback_query, filters)
            
            candidate = session.exec(fallback_query.order_by(func.random()).limit(1)).first()
            
            # If still no candidate with filters, try without filters
            if not candidate and filters:
                no_filter_query = select(Question)
                if mode == "rating":
                    no_filter_query = no_filter_query.where(Question.is_canonical == True)
                candidate = session.exec(no_filter_query.order_by(func.random()).limit(1)).first()
             
            # Auto-Classify this fallback question if it lacks an axis (Self-Healing Data)
            # Only in practice mode to avoid modifying canonical questions
            if candidate and not candidate.thinking_axis and mode == "practice":
                predicted_axis = await ai_service.classify_question_axis(candidate.content)
                if predicted_axis:
                    candidate.thinking_axis = predicted_axis.value
                    session.add(candidate)
                    session.commit()
                    session.refresh(candidate)

        return candidate

orchestrator = ThinkingOrchestrator()


