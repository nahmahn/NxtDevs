from datetime import datetime
from backend.models.user_state import ThinkingProfile

class ScoringEngine:
    """
    Handles Elo rating updates and Thinking Profile bias adjustments.
    """
    
    # K-Factor for Elo (Volatile for MVP)
    K_FACTOR = 32.0
    
    @staticmethod
    def expected_score(rating_a: float, rating_b: float) -> float:
        """
        Returns the expected score for player A against player B.
        """
        return 1.0 / (1 + 10 ** ((rating_b - rating_a) / 400.0))
    
    @classmethod
    def calculate_new_elo(cls, user_rating: float, question_difficulty: float, actual_score: float) -> float:
        """
        Updates the user's Elo rating.
        actual_score: 1.0 for Correct, 0.0 for Incorrect.
        """
        expected = cls.expected_score(user_rating, question_difficulty)
        new_rating = user_rating + cls.K_FACTOR * (actual_score - expected)
        return round(new_rating, 1)

    @staticmethod
    def update_profile_biases(profile: ThinkingProfile, option_approach: str, is_correct: bool) -> ThinkingProfile:
        """
        Updates the cognitive biases in the profile based on the selected option's approach.
        
        Bias Logic (MVP):
        - If User picks "Greedy" and is WRONG -> Greedy Bias INCREASES.
        - If User picks "Constraint" and is WRONG -> Constraint Blindness INCREASES.
        - If User is CORRECT -> Biases DECREASE slightly (Healing).
        """
        
        # Learning Rate
        ALPHA = 0.05
        HEAL_RATE = 0.01
        
        if is_correct:
            # Healing: Slowly reduce all biases when correct
            profile.greedy_bias = max(0.0, profile.greedy_bias - HEAL_RATE)
            profile.constraint_blindness = max(0.0, profile.constraint_blindness - HEAL_RATE)
            profile.premature_optimization = max(0.0, profile.premature_optimization - HEAL_RATE)
        else:
            # Reinforce Bias if trap was fallen into
            if option_approach == "Greedy":
                profile.greedy_bias = min(1.0, profile.greedy_bias + ALPHA)
            elif option_approach == "ConstraintBlindness":
                profile.constraint_blindness = min(1.0, profile.constraint_blindness + ALPHA)
            elif option_approach == "PrematureOptimization":
                profile.premature_optimization = min(1.0, profile.premature_optimization + ALPHA)
                
        profile.updated_at = datetime.utcnow()
        return profile
