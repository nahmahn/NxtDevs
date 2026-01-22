"""
AI Service for Axiom
Provides LLM capabilities with multi-provider fallback: Gemini -> Groq -> OpenRouter
"""
import os
import httpx
import google.generativeai as genai
from groq import Groq
from typing import Optional, List, Dict, Any, AsyncGenerator
from backend.models.canonical import ThinkingAxis
import json


class AIService:
    def __init__(self):
        # Setup Gemini
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        if self.gemini_key:
            genai.configure(api_key=self.gemini_key)
            self.gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
            self.gemini_model = genai.GenerativeModel(self.gemini_model_name)
        else:
            self.gemini_model = None

        # Setup Groq
        self.groq_key = os.getenv("GROQ_API_KEY")
        if self.groq_key:
            self.groq_client = Groq(api_key=self.groq_key)
            self.groq_model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        else:
            self.groq_client = None
        
        # Setup OpenRouter (Free Tier Fallback)
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY")
        self.openrouter_model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
        self.openrouter_fallback_model = os.getenv("OPENROUTER_FALLBACK_MODEL", "google/gemma-3-27b-it:free")
        self.openrouter_base_url = "https://openrouter.ai/api/v1"

    async def _call_openrouter(
        self, 
        prompt: str, 
        system_instruction: Optional[str] = None,
        model: Optional[str] = None
    ) -> str:
        """Make a request to OpenRouter API."""
        if not self.openrouter_key:
            return ""
        
        model = model or self.openrouter_model
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.openrouter_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://axiom.dev",
                    "X-Title": "Axiom AI Tutor"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": 2000
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                print(f"OpenRouter Error ({response.status_code}): {response.text[:200]}")
                return ""

    async def _stream_openrouter(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream response from OpenRouter API."""
        if not self.openrouter_key:
            yield "Error: OpenRouter not configured."
            return
        
        model = model or self.openrouter_model
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.openrouter_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://axiom.dev",
                    "X-Title": "Axiom AI Tutor"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": 2000,
                    "stream": True
                }
            ) as response:
                if response.status_code != 200:
                    yield f"Error: OpenRouter returned {response.status_code}"
                    return
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue

    async def generate_content(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """
        Attempts to generate content with fallback chain: Gemini -> Groq -> OpenRouter
        """
        # 1. Try Gemini
        if self.gemini_model:
            try:
                full_prompt = f"System: {system_instruction}\nUser: {prompt}" if system_instruction else prompt
                response = self.gemini_model.generate_content(full_prompt)
                if response.text:
                    return response.text
            except Exception as e:
                print(f"Gemini Error: {e}")

        # 2. Try Groq
        if self.groq_client:
            try:
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                chat_completion = self.groq_client.chat.completions.create(
                    messages=messages,
                    model=self.groq_model_name,
                )
                return chat_completion.choices[0].message.content
            except Exception as e:
                print(f"Groq Error: {e}")

        # 3. Try OpenRouter (Free Tier)
        if self.openrouter_key:
            try:
                result = await self._call_openrouter(prompt, system_instruction, self.openrouter_model)
                if result:
                    return result
                
                # Try fallback model
                result = await self._call_openrouter(prompt, system_instruction, self.openrouter_fallback_model)
                if result:
                    return result
            except Exception as e:
                print(f"OpenRouter Error: {e}")

        return "Error: All AI services unavailable."

    async def stream_content(
        self, 
        prompt: str, 
        system_instruction: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream content with fallback chain: Gemini -> Groq -> OpenRouter
        All providers support streaming.
        """
        # 1. Try Gemini Streaming
        if self.gemini_model:
            try:
                full_prompt = f"System: {system_instruction}\nUser: {prompt}" if system_instruction else prompt
                response = self.gemini_model.generate_content(full_prompt, stream=True)
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
                return
            except Exception as e:
                print(f"Gemini Streaming Error: {e}")

        # 2. Try Groq Streaming
        if self.groq_client:
            try:
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                stream = self.groq_client.chat.completions.create(
                    messages=messages,
                    model=self.groq_model_name,
                    stream=True
                )
                for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
                return
            except Exception as e:
                print(f"Groq Streaming Error: {e}")

        # 3. Try OpenRouter Streaming
        if self.openrouter_key:
            try:
                async for chunk in self._stream_openrouter(prompt, system_instruction):
                    yield chunk
                return
            except Exception as e:
                print(f"OpenRouter Streaming Error: {e}")

        yield "Error: All AI streaming services unavailable."

    async def classify_question_axis(self, question_text: str) -> Optional[ThinkingAxis]:
        """
        Auto-classifies a question into a ThinkingAxis using LLM.
        """
        system_prompt = """
        You are an expert programming pedagogue. Classify the following coding MCQ into one of these cognitive axes:
        - constraint_sensitivity (Focuses on N, Q, time limits)
        - assumption_spotting (Focuses on unstated or flawed assumptions)
        - asymptotic_intuition (Focuses on Big O complexity analysis)
        - edge_case_paranoia (Focuses on empty, max, or invalid inputs)
        - time_space_tradeoff (Focuses on memory vs speed decisions)
        - implementation_robustness (Focuses on practical code stability)

        Return ONLY the enum value (e.g., 'constraint_sensitivity'). If unsure, default to 'implementation_robustness'.
        """
        
        response = await self.generate_content(question_text, system_prompt)
        cleaned_response = response.strip().lower()
        
        for axis in ThinkingAxis:
            if axis.value == cleaned_response:
                return axis
        
        return ThinkingAxis.IMPLEMENTATION_ROBUSTNESS

    async def generate_personalized_explanation(
        self, 
        user_profile: Dict, 
        question_content: str, 
        selected_answer: str, 
        is_correct: bool
    ) -> str:
        """
        Generates a sharp, personalized explanation.
        """
        bias_context = ""
        if user_profile.get('greedy_bias', 0) > 0.7:
            bias_context = "User tends to choose greedy approaches too often."
        elif user_profile.get('constraint_blindness', 0) > 0.7:
             bias_context = "User often misses numeric constraints."

        system_prompt = f"""
        You are a senior engineer mentoring a junior. 
        Context: {bias_context}
        The user just answered a question {'Correctly' if is_correct else 'Incorrectly'}.
        selected: {selected_answer}

        Provide a 2-sentence explanation. 
        If correct, reinforce the key insight. 
        If wrong, point out the specific flaw in thinking, referencing the bias if relevant.
        Tone: Professional, sharp, no fluff.
        """
        
        return await self.generate_content(question_content, system_prompt)

    async def generate_report_insights(
        self, 
        topic_stats: Dict, 
        difficulty_stats: Dict, 
        recent_mistakes: List[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a comprehensive, structured performance report using the LLM.
        """
        summary_text = "Topic Performance:\n"
        for topic, data in topic_stats.items():
            summary_text += f"- {topic}: {data['accuracy']}% accuracy ({data['correct_answers']}/{data['total_questions']})\n"
        
        summary_text += "\nDifficulty Mastery:\n"
        for diff, data in difficulty_stats.items():
             summary_text += f"- {diff}: {data['accuracy']}% accuracy\n"

        if recent_mistakes:
            summary_text += "\nRecent Mistakes:\n" + "\n".join(recent_mistakes[:5])

        system_prompt = """
        You are an expert personalized learning coach. Analyze the student's performance data and generate a detailed report.
        
        RETURN JSON ONLY with this exact structure:
        {
            "overall_assessment": "A comprehensive paragraph analyzing their coding intuition, patterns, and current level.",
            "overall_accuracy": <number>,
            "strengths": ["Detailed point 1", "Detailed point 2"],
            "weaknesses": ["Detailed point 1", "Detailed point 2"],
            "recommendations": [
                "Actionable advice 1 (e.g. 'Practice dynamic programming edge cases')",
                "Actionable advice 2",
                "Actionable advice 3"
            ]
        }
        
        Guidelines:
        - Be encouraging but honest.
        - Look for patterns (e.g., good at logic but bad at syntax, or good at easy but fails hard questions).
        - If data is sparse, give general advice on building consistency.
        - "strengths" and "weaknesses" should be specific (e.g., "Strong grasp of array manipulation" instead of "Good at arrays").
        - "recommendations" must be concrete actions.
        """
        
        try:
            response_text = await self.generate_content(summary_text, system_prompt)
            cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned_text)
        except Exception as e:
            print(f"Report Generation Error: {e}")
            return {
                "overall_assessment": "AI generation failed. Please try again later.",
                "overall_accuracy": 0,
                "strengths": [],
                "weaknesses": [],
                "recommendations": ["Practice more problems to generate data."]
            }


# Singleton instance
ai_service = AIService()
