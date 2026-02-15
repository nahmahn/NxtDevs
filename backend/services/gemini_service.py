"""
Gemini AI Service for generating explanations
"""
import google.generativeai as genai
import os
from typing import Optional

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Use Gemini 1.5 Flash for speed
model = genai.GenerativeModel('gemini-2.5-flash')

async def generate_explanation(
    question_content: str,
    correct_option: str,
    selected_option: str,
    is_correct: bool
) -> str:
    # ... (docstring) ...
    
    if is_correct:
         prompt = f"""You are an algorithmic thinking coach. ... (same prompt) ...
Question: {question_content}
Their answer: {selected_option}
..."""
    else:
        prompt = f"""You are an algorithmic thinking coach. ... (same prompt) ...
Question: {question_content}
Correct answer: {correct_option}
Their answer: {selected_option}
..."""

    try:
        response = await model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API error: {e}")
        # Fallback explanation
        if is_correct:
            return "Correct! You identified the optimal approach for this scenario."
        else:
            return f"The correct answer is: {correct_option}. Consider how constraints affect approach selection."
