"""
TutorAI Service for Axiom
Integrates LangChain with Redis chat history for conversational AI tutoring.
Ported from NxtDevs tutorAI.py with enhancements.
"""
import os
import yaml
from typing import List, Dict, Optional, Any
from pathlib import Path

# Redis and LangChain imports
try:
    import redis
    from langchain_community.chat_message_histories import RedisChatMessageHistory
    from langchain_community.chat_message_histories import RedisChatMessageHistory
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.messages import SystemMessage
    from langchain_core.runnables.history import RunnableWithMessageHistory
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.output_parsers import StrOutputParser
    LANGCHAIN_AVAILABLE = True
except ImportError as e:
    LANGCHAIN_AVAILABLE = False
    print(f"Warning: LangChain not available ({e}). TutorAI will use fallback mode.")

# Groq import (optional fallback)
try:
    from langchain_groq import ChatGroq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    ChatGroq = None
    print("Note: langchain-groq not installed. Groq fallback unavailable.")

# OpenRouter via OpenAI-compatible endpoint
try:
    from langchain_openai import ChatOpenAI
    OPENROUTER_AVAILABLE = True
except ImportError:
    OPENROUTER_AVAILABLE = False
    ChatOpenAI = None
    print("Note: langchain-openai not installed. OpenRouter fallback unavailable.")

# Load environment
from dotenv import load_dotenv
load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")

# Prioritize HOST construction if exists (for Docker), otherwise check URL
if REDIS_HOST:
    REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
else:
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

print(f"DEBUG: TutorService REDIS_URL={REDIS_URL}")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")


def load_prompts() -> Dict[str, Any]:
    """Load prompts from prompts.yaml file."""
    prompts_path = Path(__file__).parent.parent / "prompts.yaml"
    if prompts_path.exists():
        with open(prompts_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    return {}

# Load prompts on module init
PROMPTS = load_prompts()

# Default system template if not in prompts.yaml
DEFAULT_SYSTEM_TEMPLATE = """You are an expert AI Programming Tutor. Your goal is to be helpful, encouraging, and educational.

ROLE:
- You are a knowledgeable senior developer mentoring a student.
- You explain concepts clearly, starting simple and adding depth as needed.
- You write clean, modern, and well-commented code examples.

CONTEXT:
The user has been taking quizzes. Here is their recent performance summary to help you tailor your answers:
{performance_summary}

GUIDELINES:
1. **Be Interactive**: Ask follow-up questions to check understanding.
2. **Use Markdown**: Format code blocks with language tags (e.g., ```python). Use bold/italics for emphasis.
3. **Be Concise but Complete**: Answer the user's question directly, then provide context.
4. **Fix Mistakes**: If the user provides code, gently point out errors and show the corrected version.
5. **Encourage**: If the user is struggling (indicated by low quiz scores), be extra patient and supportive.
6. **Use Tools**: If you are unsure about a specific library version or recent event, use the "duckduckgo_results_json" tool to find accurate information. This builds credibility.

Current Conversation:
"""


class TutorAIService:
    """
    AI-powered tutoring service with conversation memory.
    Uses LangChain with Redis for chat history persistence.
    """
    
    def __init__(self):
        self.redis_url = REDIS_URL
        self.gemini_api_key = GEMINI_API_KEY
        self.groq_api_key = GROQ_API_KEY
        self.groq_model = GROQ_MODEL
        self.openrouter_api_key = OPENROUTER_API_KEY
        self.openrouter_model = OPENROUTER_MODEL
        self.fallback_level = 0  # 0=Gemini, 1=Groq, 2=OpenRouter
        self.system_template = PROMPTS.get("TUTOR_SYSTEM_PROMPT", DEFAULT_SYSTEM_TEMPLATE)
        
        # Initialize Redis client if available
        if LANGCHAIN_AVAILABLE:
            try:
                self.redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
                self.redis_available = True
            except Exception as e:
                print(f"Redis connection failed: {e}")
                self.redis_available = False
        else:
            self.redis_available = False
    
    def get_student_stats(self, attempts: List[Any]) -> Dict[str, Any]:
        """
        Analyze attempts to generate student statistics.
        
        Returns:
            Dictionary containing:
            - overall_accuracy
            - topic_stats (dict of {topic: {correct, total, status}})
            - recent_mistakes (list of strings)
        """
        if not attempts:
            return {
                "overall_accuracy": 0,
                "total_attempts": 0,
                "topic_stats": {},
                "recent_mistakes": []
            }
        
        # Calculate statistics
        topics: Dict[str, Dict[str, int]] = {}
        recent_mistakes: List[str] = []
        total_correct = 0
        total_attempts = len(attempts)
        
        for attempt in attempts:
            # Get question info if available
            question = getattr(attempt, 'question', None)
            if not question:
                continue
            
            topic = getattr(question, 'topic', None) or getattr(question, 'question_type', 'General')
            
            if topic not in topics:
                topics[topic] = {'correct': 0, 'total': 0}
            
            topics[topic]['total'] += 1
            
            if attempt.is_correct:
                topics[topic]['correct'] += 1
                total_correct += 1
            else:
                # Track recent mistakes (top 5)
                if len(recent_mistakes) < 5:
                    content = getattr(question, 'content', 'Unknown question')
                    recent_mistakes.append(f"- [{topic}] {content[:100]}...")
                    
        # Calculate derived stats for topics
        final_topic_stats = {}
        for topic, stats in topics.items():
            if stats['total'] > 0:
                acc = (stats['correct'] / stats['total']) * 100
                status = "Mastered" if acc > 80 else "Needs Practice" if acc < 50 else "Developing"
                final_topic_stats[topic] = {
                    "correct": stats['correct'],
                    "total": stats['total'],
                    "accuracy": acc,
                    "status": status
                }

        return {
            "overall_accuracy": (total_correct / total_attempts * 100) if total_attempts > 0 else 0,
            "total_correct": total_correct,
            "total_attempts": total_attempts,
            "topic_stats": final_topic_stats,
            "recent_mistakes": recent_mistakes
        }

    def format_performance_summary(self, attempts: List[Any]) -> str:
        """
        Format user attempts into a performance summary for context injection.
        """
        stats = self.get_student_stats(attempts)
        
        if stats["total_attempts"] == 0:
            return "No recent quiz data available. Treat this as a new student."
            
        # Build summary
        summary_parts = ["### Student Capability Profile"]
        summary_parts.append(f"**Overall Accuracy**: {stats['overall_accuracy']:.0f}% ({stats['total_correct']}/{stats['total_attempts']})")
        summary_parts.append("")
        
        # Topic Accuracy
        summary_parts.append("**Topic Performance:**")
        for topic, t_stats in stats['topic_stats'].items():
            summary_parts.append(f"- **{topic}**: {t_stats['accuracy']:.0f}% ({t_stats['status']})")
        
        # Recent struggles
        if stats['recent_mistakes']:
            summary_parts.append("")
            summary_parts.append("### Recent Struggle Areas")
            summary_parts.extend(stats['recent_mistakes'])
        
        return "\n".join(summary_parts)
    
    def _get_chain(self, performance_summary: str, search_context: str = ""):
        """Create the LangChain LCEL chain with dynamic system prompt."""
        if not LANGCHAIN_AVAILABLE:
            return None
        
        # Base system instruction
        base_instruction = self.system_template.format(performance_summary=performance_summary)
        
        # Add search context if provided
        if search_context:
            base_instruction += f"\n\n**Recent Web Search Results (use this to answer the user's question):**\n{search_context}"
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=base_instruction),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])
        
        # Select LLM based on fallback level
        if self.fallback_level >= 2 and self.openrouter_api_key and OPENROUTER_AVAILABLE:
            print("[TUTOR] Using OpenRouter fallback (Gemini & Groq failed)")
            llm = ChatOpenAI(
                model=self.openrouter_model,
                openai_api_key=self.openrouter_api_key,
                openai_api_base="https://openrouter.ai/api/v1",
                temperature=0.7,
                default_headers={
                    "HTTP-Referer": "https://axiom.dev",
                    "X-Title": "Axiom AI Tutor"
                }
            )
        elif self.fallback_level >= 1 and self.groq_api_key and GROQ_AVAILABLE:
            print("[TUTOR] Using Groq fallback (Gemini rate limited)")
            llm = ChatGroq(
                model=self.groq_model,
                api_key=self.groq_api_key,
                temperature=0.7
            )
        else:
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",  # Better rate limits than 2.5
                google_api_key=self.gemini_api_key,
                temperature=0.7
            )
        
        chain = prompt | llm | StrOutputParser()
        return chain
    
    def _needs_search(self, message: str) -> bool:
        """Determine if the message requires a web search."""
        keywords = ["latest", "today", "current", "recent", "new", "release", "version", "news", "update", "announcement", "paper" , "web", "search"]
        return any(keyword in message.lower() for keyword in keywords)
    
    def _do_wikipedia_search(self, query: str) -> str:
        """Search Wikipedia for concepts and definitions."""
        try:
            import wikipediaapi
            # Using a generic user agent as requested by Wikipedia API policy
            wiki = wikipediaapi.Wikipedia(
                user_agent="AxiomTutorAI/1.0 (https://github.com/namja/Axiom)",
                language='en',
                extract_format=wikipediaapi.ExtractFormat.WIKI
            )
            # Try direct page first
            page = wiki.page(query)
            if page.exists():
                return f"Wikipedia Summary for '{query}':\n{page.summary[:1000]}"
            return ""
        except Exception as e:
            print(f"[TUTOR] Wikipedia error: {e}")
            return ""

    def _do_arxiv_search(self, query: str) -> str:
        """Search ArXiv for latest technical papers."""
        try:
            import arxiv
            client = arxiv.Client()
            search = arxiv.Search(
                query=query,
                max_results=3,
                sort_by=arxiv.SortCriterion.Relevance
            )
            results = list(client.results(search))
            if results:
                formatted = [f"Recent ArXiv Research papers for '{query}':"]
                for r in results:
                    formatted.append(f"- {r.title} ({r.published.year}): {r.summary[:300]}...")
                return "\n".join(formatted)
            return ""
        except Exception as e:
            print(f"[TUTOR] ArXiv error: {e}")
            return ""

    def _do_search(self, query: str, actions: list = None) -> str:
        """Perform a multi-source search (Wikipedia -> ArXiv -> DDG)."""
        combined_results = []
        
        # 1. Wikipedia for definitions (High reliability)
        wiki_res = self._do_wikipedia_search(query)
        if wiki_res:
            combined_results.append(wiki_res)
            if actions is not None: actions.append(f"Wikipedia: {query}")
            
        # 2. ArXiv for technical/recent discoveries
        technical_keywords = ["algorithm", "discovery", "research", "paper", "science", "newest", "math", "physics"]
        if any(k in query.lower() for k in technical_keywords):
            arxiv_res = self._do_arxiv_search(query)
            if arxiv_res:
                combined_results.append(arxiv_res)
                if actions is not None: actions.append(f"ArXiv: {query}")
        
        # 3. DuckDuckGo as fallback / extra context (Rate-limited, use sparingly)
        if not combined_results or "latest" in query.lower() or "news" in query.lower():
            import time
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    from duckduckgo_search import DDGS
                    with DDGS() as ddgs:
                        results = list(ddgs.text(query, max_results=3))
                        if results:
                            formatted = [f"Web Search Results for '{query}':"]
                            for r in results:
                                formatted.append(f"- {r.get('title', 'No title')}: {r.get('body', 'No snippet')}")
                            combined_results.append("\n".join(formatted))
                            if actions is not None: actions.append(f"Web Search: {query}")
                            break
                except Exception as e:
                    if attempt < max_retries - 1:
                        time.sleep(0.5)
            
        if combined_results:
            return "\n\n---\n\n".join(combined_results)
        
        print("[TUTOR] All search attempts yielded no results.")
        return ""
    
    def _get_message_history(self, session_id: str) -> "RedisChatMessageHistory":
        """Returns Redis chat history for a session."""
        return RedisChatMessageHistory(
            url=self.redis_url,
            session_id=session_id,
            ttl=86400  # 24 hours
        )
    
    async def chat(
        self,
        user_id: str,
        message: str,
        attempts: Optional[List[Any]] = None
    ) -> str:
        """
        Process a chat message with conversation history.
        
        Args:
            user_id: User identifier for session management
            message: User's message
            attempts: Optional list of user attempts for context
            
        Returns:
            AI tutor response
        """
        session_id = f"tutor_session_{user_id}"
        
        # Format performance summary
        perf_summary = self.format_performance_summary(attempts or [])
        
        if not LANGCHAIN_AVAILABLE or not self.redis_available:
            # Fallback to basic AI service
            from backend.services.ai_service import ai_service
            system_prompt = self.system_template.format(performance_summary=perf_summary)
            return await ai_service.generate_content(message, system_prompt), []
        
        try:
            actions = []
            search_context = ""
            
            # Deterministic search: check if message needs web search
            if self._needs_search(message):
                import asyncio
                print(f"[TUTOR] Search triggered for: {message}")
                # Run blocking search in a separate thread
                search_context = await asyncio.to_thread(self._do_search, message, actions=actions)
                print(f"[TUTOR] Search results acquired ({len(search_context)} chars)")
            
            # Build chain with search context (if any)
            chain = self._get_chain(perf_summary, search_context)
            
            chain_with_history = RunnableWithMessageHistory(
                chain,
                self._get_message_history,
                input_messages_key="input",
                history_messages_key="history",
            )
            
            # Invoke chain
            response = chain_with_history.invoke(
                {"input": message}, 
                config={"configurable": {"session_id": session_id}}
            )
            
            # LCEL chain returns string directly
            reply = response if isinstance(response, str) else str(response)
            
            return reply, actions
            
        except Exception as e:
            err_msg = f"TutorAI Error: {e}"
            print(err_msg)
            try:
                with open("tutor_error.log", "w") as f:
                    f.write(err_msg + "\n")
                    import traceback
                    traceback.print_exc(file=f)
            except:
                pass
            
            # Fallback
            from backend.services.ai_service import ai_service
            reply = await ai_service.generate_content(message, self.system_template.format(performance_summary=perf_summary))
            return reply, []
    async def stream_chat(
        self,
        user_id: str,
        message: str,
        attempts: Optional[List[Any]] = None
    ):
        """
        Stream chat response.
        Yields chunks of text.
        """
        session_id = f"tutor_session_{user_id}"
        perf_summary = self.format_performance_summary(attempts or [])
        
        if not LANGCHAIN_AVAILABLE or not self.redis_available:
            # Fallback (non-streaming for now, or mock stream)
            from backend.services.ai_service import ai_service
            reply = await ai_service.generate_content(message, self.system_template.format(performance_summary=perf_summary))
            yield reply
            return

        try:
            actions = []
            search_context = ""
            if self._needs_search(message):
                import asyncio
                # Emit searching event if we could (not supported in simple text stream yet, maybe send special token)
                search_context = await asyncio.to_thread(self._do_search, message, actions=actions)
                for action in actions:
                     yield f"__ACTION__:{action}\n"
            
            chain = self._get_chain(perf_summary, search_context)
            chain_with_history = RunnableWithMessageHistory(
                chain,
                self._get_message_history,
                input_messages_key="input",
                history_messages_key="history",
            )
            
            async for chunk in chain_with_history.astream(
                {"input": message},
                config={"configurable": {"session_id": session_id}}
            ):
                yield chunk
                
        except Exception as e:
            error_str = str(e)
            # Detect rate limit and auto-fallback through chain
            if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
                self.fallback_level += 1
                print(f"[TUTOR] Provider failed! Escalating to fallback level {self.fallback_level}...")
                
                if self.fallback_level <= 2:  # We have up to OpenRouter (level 2)
                    try:
                        chain = self._get_chain(perf_summary, search_context)
                        chain_with_history = RunnableWithMessageHistory(
                            chain,
                            self._get_message_history,
                            input_messages_key="input",
                            history_messages_key="history",
                        )
                        async for chunk in chain_with_history.astream(
                            {"input": message},
                            config={"configurable": {"session_id": session_id}}
                        ):
                            yield chunk
                        return
                    except Exception as fallback_error:
                        print(f"[TUTOR] Fallback level {self.fallback_level} also failed: {fallback_error}")
                        # Try next level
                        self.fallback_level += 1
                        if self.fallback_level <= 2:
                            async for chunk in self.stream_chat(user_id, message, attempts):
                                yield chunk
                            return
                
                yield "All AI providers are currently unavailable. Please try again later."
                return
            
            import traceback
            traceback.print_exc()
            print(f"Stream Error: {e}")
            print(f"Stream Error: {e} (REDIS_URL={self.redis_url})")
            yield f"I'm having trouble connecting to memory. Error: {error_str}"
    
    def clear_history(self, user_id: str) -> bool:
        """Clear chat history for a user."""
        if not self.redis_available:
            return False
        
        try:
            session_id = f"tutor_session_{user_id}"
            history = self._get_message_history(session_id)
            history.clear()
            return True
        except Exception as e:
            print(f"Failed to clear history: {e}")
            return False


# Singleton instance
tutor_service = TutorAIService()
