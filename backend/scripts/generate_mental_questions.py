"""
Generate HIGH-QUALITY mental algorithmic thinking questions.
These are designed to be solved WITHOUT writing code - pure logical reasoning.

Categories:
1. Time Complexity Analysis
2. Space Complexity Reasoning  
3. Algorithm Selection
4. Edge Case Identification
5. Optimization Trade-offs
6. Data Structure Selection
"""
import os
import json
import asyncio
import re
import sys

# Fix path - add parent of 'backend' to path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
project_dir = os.path.dirname(backend_dir)
sys.path.insert(0, project_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, '.env'))

import google.generativeai as genai
from sqlmodel import Session, select

from backend.core.db import engine, create_db_and_tables
from backend.models.canonical import Question, Option, ThinkingAxis

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# Valid options for uniformity
VALID_LANGUAGES = ["Python", "JavaScript", "Java", "C++", "General"]
VALID_TOPICS = ["Arrays", "Strings", "Sorting", "Searching", "Trees", "Graphs", "Dynamic Programming", "Recursion", "Hashing", "Linked Lists", "Stacks", "Queues", "Heaps", "Bit Manipulation", "Math", "Greedy", "Backtracking", "Two Pointers", "Sliding Window", "General"]
VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"]

MENTAL_QUESTION_PROMPT = """
Generate 25 "Mental Algorithm" multiple-choice questions that can be solved PURELY through logical reasoning.
NO code writing required - these test intuition about algorithms and data structures.

IMPORTANT CONSTRAINTS:
- Questions must be answerable in 30-60 seconds of thinking
- No complex math calculations
- Focus on INTUITION and PATTERN RECOGNITION
- Each question should have ONE clearly correct answer

QUESTION CATEGORIES (generate mix of all):
1. TIME COMPLEXITY - "What's the time complexity of...?"
2. ALGORITHM CHOICE - "Which algorithm is best for...?"
3. DATA STRUCTURE - "Which structure would you use for...?"
4. EDGE CASES - "What edge case would break this approach?"
5. OPTIMIZATION - "How would you optimize this?"
6. CORRECTNESS - "What's wrong with this approach?"

FORMAT - Return valid JSON array:
[
  {
    "content": "## Question Title\\n\\nClear, concise question text.\\n\\n**Given:** Any constraints or context\\n\\n**Ask:** The actual question",
    "question_type": "time_complexity|algorithm_choice|data_structure|edge_case|optimization|correctness",
    "difficulty_tier": 1|2|3,
    "thinking_axis": "asymptotic_intuition|time_space_tradeoff|edge_case_paranoia|constraint_sensitivity|assumption_spotting|implementation_robustness",
    "language": "Python|JavaScript|Java|C++|General",
    "topic": "Arrays|Strings|Sorting|Searching|Trees|Graphs|Dynamic Programming|Recursion|Hashing|Linked Lists|Stacks|Queues|Heaps|Bit Manipulation|Math|Greedy|Backtracking|Two Pointers|Sliding Window|General",
    "difficulty": "Easy|Medium|Hard",
    "tags": ["Arrays", "Sorting", etc],
    "options": [
      {"content": "A. [Option text]", "is_correct": false, "approach_type": "Wrong"},
      {"content": "B. [Option text]", "is_correct": true, "approach_type": "Optimal"},
      {"content": "C. [Option text]", "is_correct": false, "approach_type": "Suboptimal"},
      {"content": "D. [Option text]", "is_correct": false, "approach_type": "Wrong"}
    ]
  }
]

RULES FOR LANGUAGE/TOPIC/DIFFICULTY:
- language: Use "General" for language-agnostic questions, otherwise specify the programming language
- topic: Choose the PRIMARY topic that this question tests
- difficulty: "Easy" for straightforward pattern recognition, "Medium" for multi-step reasoning, "Hard" for complex scenarios

EXAMPLE QUESTIONS:
1. "You need to find the kth largest element in an unsorted array of 1 million integers. Which approach gives the best average-case time complexity?"
2. "A sorted array is rotated at some unknown pivot. What's the minimum number of comparisons needed to find the rotation point?"
3. "You're implementing autocomplete for a search bar with 100,000 words. Which data structure gives optimal prefix search?"

Generate 25 diverse, high-quality questions. Make them INTERESTING and PRACTICAL.
"""

def clean_json_string(s: str) -> str:
    s = re.sub(r'^```json\s*', '', s)
    s = re.sub(r'^```\s*', '', s)
    s = re.sub(r'\s*```$', '', s)
    return s.strip()

def normalize_field(value: str, valid_options: list, default: str) -> str:
    """Normalize a field to match valid options, or return default."""
    if not value:
        return default
    # Try exact match
    if value in valid_options:
        return value
    # Try case-insensitive match
    for opt in valid_options:
        if opt.lower() == value.lower():
            return opt
    # Try partial match
    for opt in valid_options:
        if opt.lower() in value.lower() or value.lower() in opt.lower():
            return opt
    return default

async def generate_mental_questions(batch_num: int = 1):
    print(f"🤖 Generating batch {batch_num}...")
    try:
        response = model.generate_content(MENTAL_QUESTION_PROMPT)
        cleaned_text = clean_json_string(response.text)
        questions_data = json.loads(cleaned_text)
        print(f"✅ Received {len(questions_data)} questions.")
        return questions_data
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        # Try to extract partial JSON
        try:
            # Find JSON array
            match = re.search(r'\[.*\]', response.text, re.DOTALL)
            if match:
                questions_data = json.loads(match.group())
                print(f"✅ Recovered {len(questions_data)} questions from partial response.")
                return questions_data
        except:
            pass
        return []
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def add_questions_to_db(questions_data):
    with Session(engine) as session:
        added = 0
        for q_data in questions_data:
            try:
                # Normalize fields for uniformity
                language = normalize_field(q_data.get("language"), VALID_LANGUAGES, "General")
                topic = normalize_field(q_data.get("topic"), VALID_TOPICS, "General")
                difficulty = normalize_field(q_data.get("difficulty"), VALID_DIFFICULTIES, "Medium")
                
                # Create Question with all fields
                question = Question(
                    content=q_data["content"],
                    question_type=q_data.get("question_type", "general"),
                    difficulty_tier=q_data.get("difficulty_tier", 1),
                    tags=q_data.get("tags", []),
                    thinking_axis=q_data.get("thinking_axis", "implementation_robustness"),
                    language=language,
                    topic=topic,
                    difficulty=difficulty,
                    is_canonical=True  # All new questions are canonical
                )
                session.add(question)
                session.flush()  # Get ID
                
                # Create Options
                for opt_data in q_data["options"]:
                    option = Option(
                        question_id=question.id,
                        content=opt_data["content"],
                        is_correct=opt_data["is_correct"],
                        approach_type=opt_data.get("approach_type", "Standard")
                    )
                    session.add(option)
                added += 1
            except Exception as e:
                print(f"  ⚠️ Skipping question: {e}")
                continue
        
        session.commit()
        print(f"💾 Added {added} questions to database.")
        return added

def normalize_existing_questions():
    """
    Update existing questions that have NULL language/topic/difficulty
    to have uniform default values.
    """
    print("🔧 Normalizing existing questions...")
    with Session(engine) as session:
        # Get all questions with missing fields
        statement = select(Question).where(
            (Question.language == None) | 
            (Question.topic == None) | 
            (Question.difficulty == None)
        )
        questions = session.exec(statement).all()
        
        if not questions:
            print("✅ All questions already have uniform fields.")
            return 0
        
        updated = 0
        for q in questions:
            changed = False
            if q.language is None:
                q.language = "General"
                changed = True
            if q.topic is None:
                # Try to infer from tags
                if q.tags:
                    q.topic = normalize_field(q.tags[0], VALID_TOPICS, "General")
                else:
                    q.topic = "General"
                changed = True
            if q.difficulty is None:
                # Infer from difficulty_tier
                tier_map = {1: "Easy", 2: "Medium", 3: "Hard"}
                q.difficulty = tier_map.get(q.difficulty_tier, "Medium")
                changed = True
            
            if changed:
                session.add(q)
                updated += 1
        
        session.commit()
        print(f"✅ Normalized {updated} questions.")
        return updated

async def main():
    create_db_and_tables()
    
    # First, normalize existing questions
    normalize_existing_questions()
    
    # Get current count
    with Session(engine) as session:
        current_count = session.exec(select(Question)).all()
        print(f"📊 Current questions: {len(current_count)}")
    
    # Generate multiple batches
    total_added = 0
    target = 100  # Target total questions
    batches_needed = max(1, (target - len(current_count)) // 20)
    
    for i in range(batches_needed):
        questions = await generate_mental_questions(i + 1)
        if questions:
            added = add_questions_to_db(questions)
            total_added += added
        
        # Small delay between batches
        if i < batches_needed - 1:
            await asyncio.sleep(2)
    
    # Final count
    with Session(engine) as session:
        final_count = len(session.exec(select(Question)).all())
        print(f"\n🎉 Done! Total questions: {final_count} (+{total_added} new)")

if __name__ == "__main__":
    asyncio.run(main())

