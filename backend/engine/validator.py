from typing import List, Dict, Any
from backend.models.canonical import Question, Option

class QuestionValidationError(Exception):
    pass

class RuntimeValidator:
    """
    The Gatekeeper.
    Ensures that a Question object (potentially mutated) is safe to serve.
    """
    
    @staticmethod
    def validate_question(question: Question, active_options: List[Option]) -> bool:
        """
        Runs critical safety checks before serving a question.
        Returns True if safe, raises QuestionValidationError if unsafe.
        """
        
        # Check 1: Exactly one correct answer
        correct_count = sum(1 for opt in active_options if opt.is_correct)
        if correct_count != 1:
            raise QuestionValidationError(
                f"Question {question.id} has {correct_count} correct options. Must be exactly 1."
            )
            
        # Check 2: At least 2 options (standard MCQ)
        if len(active_options) < 2:
            raise QuestionValidationError(f"Question {question.id} has fewer than 2 options.")
            
        # Check 3: Constraints sanity (Placeholder for logic)
        # In a real system, we would parse constraints and check bounds.
        # e.g. if n > 10^9 and time_limit < 1s => Impossible
        
        return True

validator = RuntimeValidator()
