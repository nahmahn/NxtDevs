"""
Redis Cache Service for Brainwave

Provides low-latency caching for:
- LLM-generated explanations
- Leaderboard results
- User profiles (hot cache)
"""
import os
import json
from typing import Optional, Any
from contextlib import asynccontextmanager

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class CacheService:
    """
    Async Redis cache with graceful degradation.
    Falls back to no-op if Redis is unavailable.
    """
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self._connected = False
        
    async def connect(self):
        """Initialize Redis connection."""
        if not REDIS_AVAILABLE:
            print("[Cache] redis package not installed, caching disabled")
            return
            
        REDIS_HOST = os.getenv("REDIS_HOST")
        REDIS_PORT = os.getenv("REDIS_PORT", "6379")
        
        if REDIS_HOST:
             redis_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
        else:
             redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

        try:
            self.redis = redis.from_url(redis_url, decode_responses=True)
            await self.redis.ping()
            self._connected = True
            print(f"[Cache] Connected to Redis: {redis_url}")
        except Exception as e:
            print(f"[Cache] Redis unavailable, caching disabled: {e}")
            self.redis = None
            self._connected = False
    
    async def disconnect(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
            self._connected = False
    
    # --- Explanation Cache ---
    
    async def get_explanation(
        self, 
        question_id: str, 
        option_id: str, 
        is_correct: bool
    ) -> Optional[str]:
        """
        Get cached explanation for a question+answer combo.
        Returns None on cache miss.
        """
        if not self._connected:
            return None
        
        key = f"exp:{question_id}:{option_id}:{int(is_correct)}"
        try:
            return await self.redis.get(key)
        except Exception:
            return None
    
    async def set_explanation(
        self,
        question_id: str,
        option_id: str,
        is_correct: bool,
        explanation: str,
        ttl: int = 86400  # 24 hours
    ):
        """Cache an explanation with TTL."""
        if not self._connected:
            return
        
        key = f"exp:{question_id}:{option_id}:{int(is_correct)}"
        try:
            await self.redis.setex(key, ttl, explanation)
        except Exception as e:
            print(f"[Cache] Failed to cache explanation: {e}")
    
    # --- Leaderboard Cache ---
    
    async def get_leaderboard(self, limit: int = 100) -> Optional[list]:
        """Get cached leaderboard."""
        if not self._connected:
            return None
        
        try:
            data = await self.redis.get(f"leaderboard:top{limit}")
            return json.loads(data) if data else None
        except Exception:
            return None
    
    async def set_leaderboard(self, data: list, limit: int = 100, ttl: int = 30):
        """Cache leaderboard results (30s TTL for freshness)."""
        if not self._connected:
            return
        
        try:
            await self.redis.setex(f"leaderboard:top{limit}", ttl, json.dumps(data))
        except Exception as e:
            print(f"[Cache] Failed to cache leaderboard: {e}")
    
    # --- Profile Cache ---
    
    async def get_profile(self, user_id: str) -> Optional[dict]:
        """Get cached user profile."""
        if not self._connected:
            return None
        
        try:
            data = await self.redis.get(f"profile:{user_id}")
            return json.loads(data) if data else None
        except Exception:
            return None
    
    async def set_profile(self, user_id: str, data: dict, ttl: int = 300):
        """Cache user profile (5min TTL)."""
        if not self._connected:
            return
        
        try:
            await self.redis.setex(f"profile:{user_id}", ttl, json.dumps(data))
        except Exception as e:
            print(f"[Cache] Failed to cache profile: {e}")
    
    async def invalidate_profile(self, user_id: str):
        """Invalidate profile cache after updates."""
        if not self._connected:
            return
        
        try:
            await self.redis.delete(f"profile:{user_id}")
        except Exception:
            pass


# Singleton instance
cache = CacheService()
