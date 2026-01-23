import httpx
import json
from datetime import datetime
from sqlmodel import Session, select
from fastapi import HTTPException

from backend.models.user_state import User
from backend.models.leetcode import LeetCodeStats
from backend.core.db import engine
from backend.services.ai_service import ai_service

LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql"

class LeetCodeService:
    async def fetch_user_data(self, username: str) -> dict:
        """
        Fetches public profile data from LeetCode GraphQL API.
        """
        query = """
        query userPublicProfile($username: String!, $year: Int) {
            matchedUser(username: $username) {
                username
                profile {
                    realName
                    ranking
                }
                submitStats {
                    acSubmissionNum {
                        difficulty
                        count
                    }
                }
                tagProblemCounts {
                    advanced {
                        tagName
                        problemsSolved
                    }
                    intermediate {
                        tagName
                        problemsSolved
                    }
                    fundamental {
                        tagName
                        problemsSolved
                    }
                }
            }
            recentAcSubmissionList(username: $username, limit: 15) {
                title
                titleSlug
                timestamp
            }
            matchedUser(username: $username) {
                userCalendar(year: $year) {
                    submissionCalendar
                }
            }
        }
        """
        
        current_year = datetime.now().year
        
        async with httpx.AsyncClient() as client:
            headers = {
                "Content-Type": "application/json",
                "Referer": "https://leetcode.com",
                "User-Agent": "Mozilla/5.0 (NxtDevs/1.0)"
            }
            try:
                response = await client.post(
                    LEETCODE_GRAPHQL_URL, 
                    json={'query': query, 'variables': {'username': username, 'year': current_year}},
                    headers=headers,
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                
                if "errors" in data:
                    print("LeetCode API Partial Error: " + str(data['errors']))
                    
                return data.get("data", {})
            except Exception as e:
                print(f"Error fetching LeetCode data: {e}")
                raise HTTPException(status_code=400, detail=str(e))

    def _generate_insight(self, stats: dict, recent_subs: list) -> str:
        """
        Generates a natural-language insight about the user's performance.
        Simulates an 'AI' analysis.
        """
        total = stats.get('total', 0)
        hard = stats.get('hard', 0)
        recent_count = len(recent_subs)
        
        if total == 0:
            return "No data available yet. Start solving problems to generate insights!"
            
        insight = f"You have solved {total} problems. "
        
        # Difficulty Analysis
        hard_ratio = hard / total if total > 0 else 0
        if hard_ratio > 0.3:
            insight += "Your focus on Hard problems is excellent for competitive programming. "
        elif hard_ratio < 0.1:
            insight += "You are building a strong foundation, but try pushing into Hard territory to improve pattern recognition. "
            
        # Recent Activity
        if recent_count > 5:
             insight += "Your recent activity is consistent. "
        else:
             insight += "Consistency is key; try to solve at least one problem a day. "
             
        # Topic Analysis (simplified)
        return insight

    def _analyze_patterns(self, tags: dict) -> dict:
        """
        Maps LeetCode tags to NxtDevs Thinking Patterns.
        """
        patterns = {}
        
        # Helper to get count
        def get_count(tag_name):
            return tags.get(tag_name, 0)
        
        dp_count = get_count("Dynamic Programming")
        greedy_count = get_count("Greedy")
        graph_count = get_count("Breadth-First Search") + get_count("Depth-First Search") + get_count("Graph")
        
        total = sum(tags.values()) if tags else 0
        if total == 0:
            return {"Status": "Insufficient Data"}

        # Heuristic 1: Optimization Bias
        if dp_count > 0 and greedy_count > 0:
            ratio = greedy_count / (dp_count + 1)
            if ratio > 1.5:
                patterns["Optimization"] = "Greedy Bias Detected"
            elif ratio < 0.5:
                patterns["Optimization"] = "Over-complicates (DP Heavy)"
            else:
                patterns["Optimization"] = "Balanced"
        
        # Heuristic 2: Structural Thinking
        if graph_count > (total * 0.2):
            patterns["Structure"] = "Strong Graph Intuition"
            
        return patterns

    def _calculate_streak(self, submission_calendar: dict) -> tuple[int, bool]:
        """
        Calculates streak from submission calendar (timestamp -> count).
        Returns (streak_count, is_active).
        """
        if not submission_calendar:
            return 0, False
            
        # Convert timestamps to date objects
        dates = set()
        for ts in submission_calendar.keys():
            try:
                date = datetime.fromtimestamp(int(ts)).date()
                dates.add(date)
            except ValueError:
                continue
                
        if not dates:
            return 0, False
            
        today = datetime.now().date()
        sorted_dates = sorted(list(dates), reverse=True)
        
        current_streak = 0
        is_active = False
        
        # Check if active (submitted today)
        if today in dates:
            is_active = True
            
        # Helper to check if dates are consecutive
        from datetime import timedelta
        
        # Determine start point: Today or Yesterday
        start_date = today
        if today not in dates:
            # If not submitted today, check if submitted yesterday to keep streak "alive" conceptually?
            # Usually streak breaks if not done today. But typical logic:
            # If done yesterday, streak is X. If done today, streak is X+1.
            # Here we just count consecutive days backwards from the latest submission
            if not sorted_dates: 
                return 0, False
            start_date = sorted_dates[0]
            
            # If latest submission was before yesterday, streak is broken/0?
            # Use strict logic: If latest is not today or yesterday, streak is definitely 0.
            if start_date < today - timedelta(days=1):
                return 0, False
        
        # Calculate streak
        check_date = start_date
        while check_date in dates:
            current_streak += 1
            check_date -= timedelta(days=1)
            
        return current_streak, is_active

    async def sync_user_stats(self, session: Session, user: User, username: str = None):
        """
        Fetches data and updates the DB.
        """
        target_username = username or user.leetcode_username
        if not target_username:
            raise HTTPException(status_code=400, detail="No LeetCode username provided.")
            
        print(f"Syncing LeetCode stats for {target_username}...")
        gql_data = await self.fetch_user_data(target_username)
        
        raw_user = gql_data.get('matchedUser')
        if not raw_user:
             raise ValueError(f"User '{target_username}' not found on LeetCode.")

        # Parse Stats
        submit_stats = raw_user['submitStats']['acSubmissionNum']
        total = next((x['count'] for x in submit_stats if x['difficulty'] == 'All'), 0)
        easy = next((x['count'] for x in submit_stats if x['difficulty'] == 'Easy'), 0)
        medium = next((x['count'] for x in submit_stats if x['difficulty'] == 'Medium'), 0)
        hard = next((x['count'] for x in submit_stats if x['difficulty'] == 'Hard'), 0)
        ranking = raw_user['profile']['ranking']
        
        # Parse Tags
        tag_counts = {}
        for category in ['advanced', 'intermediate', 'fundamental']:
            for tag in raw_user['tagProblemCounts'][category]:
                tag_counts[tag['tagName']] = tag['problemsSolved']
        
        # Parse Recent Submissions
        recent_submissions = gql_data.get('recentAcSubmissionList', [])
        
        # Parse Calendar (Heatmap)
        submission_calendar = {}
        try:
             cal_str = raw_user.get('userCalendar', {}).get('submissionCalendar', '{}')
             submission_calendar = json.loads(cal_str)
        except Exception as e:
            print(f"Error parsing submission calendar: {e}")

        # --- AI Insight Generation ---
        # Format data for the AI
        topic_stats_ai = {tag: {"accuracy": "N/A", "correct_answers": count, "total_questions": "Unknown"} for tag, count in tag_counts.items()}
        difficulty_stats_ai = {
            "Easy": {"accuracy": "100", "correct_answers": easy, "total_questions": easy}, # Assumption for now
            "Medium": {"accuracy": "100", "correct_answers": medium, "total_questions": medium},
            "Hard": {"accuracy": "100", "correct_answers": hard, "total_questions": hard}
        }
        
        # Extract titles from recent submissions for "mistakes" context (using all as context for now)
        recent_titles = [sub['title'] for sub in recent_submissions]

        print("Generating AI Report via OpenRouter...")
        try:
            ai_report = await ai_service.generate_report_insights(
                topic_stats=topic_stats_ai,
                difficulty_stats=difficulty_stats_ai,
                recent_mistakes=recent_titles # Passing recent solves as context
            )
        except Exception as e:
            print(f"AI Generation Failed: {e}")
            ai_report = {"overall_assessment": "AI Service Unavailable.", "recommendations": []}

        # Update or Create
        statement = select(LeetCodeStats).where(LeetCodeStats.user_id == user.id)
        stats = session.exec(statement).first()
        
        if not stats:
            stats = LeetCodeStats(user_id=user.id)
            
        stats.total_solved = total
        stats.easy_solved = easy
        stats.medium_solved = medium
        stats.hard_solved = hard
        stats.ranking = ranking
        stats.tag_stats = tag_counts
        
        # Store the FULL AI Report in thinking_patterns
        stats.thinking_patterns = ai_report 
        
        # Calculate Streak
        streak, streak_active = self._calculate_streak(submission_calendar)
        stats.streak = streak
        stats.streak_active = streak_active
        
        stats.recent_submissions = recent_submissions
        stats.submission_calendar = submission_calendar
        
        # Update History (Velocity)
        today_str = datetime.utcnow().strftime('%Y-%m-%d')
        if stats.history is None:
            stats.history = []
            
        if not any(h.get('date') == today_str for h in stats.history):
            stats.history.append({
                "date": today_str,
                "total": total,
                "ranking": ranking
            })
            if len(stats.history) > 30:
                stats.history = stats.history[-30:]
        
        stats.last_synced_at = datetime.utcnow()
        
        if username and user.leetcode_username != username:
            user.leetcode_username = username
            session.add(user)
            
        session.add(stats)
        session.commit()
        session.refresh(stats)
        return stats

leetcode_service = LeetCodeService()
