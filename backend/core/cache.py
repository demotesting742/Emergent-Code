from cachetools import TTLCache
from typing import Optional, Any, Callable
import asyncio
from functools import wraps
from .config import get_settings

settings = get_settings()

# Global caches for reference data
task_types_cache = TTLCache(maxsize=settings.cache_max_size, ttl=settings.cache_ttl)
user_types_cache = TTLCache(maxsize=settings.cache_max_size, ttl=settings.cache_ttl)
eligibility_cache = TTLCache(maxsize=settings.cache_max_size, ttl=settings.cache_ttl)
workflow_templates_cache = TTLCache(maxsize=settings.cache_max_size, ttl=settings.cache_ttl)


def cache_key(*args, **kwargs) -> str:
    """Generate cache key from arguments."""
    key_parts = [str(arg) for arg in args]
    key_parts.extend([f"{k}={v}" for k, v in sorted(kwargs.items())])
    return ":".join(key_parts)


def cached(cache: TTLCache, key_func: Optional[Callable] = None):
    """Decorator for caching async function results."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                key = key_func(*args, **kwargs)
            else:
                key = cache_key(*args, **kwargs)
            
            # Check cache
            if key in cache:
                return cache[key]
            
            # Call function and cache result
            result = await func(*args, **kwargs)
            cache[key] = result
            return result
        
        return wrapper
    return decorator


def invalidate_cache(cache: TTLCache, key: Optional[str] = None):
    """Invalidate cache entry or entire cache."""
    if key:
        cache.pop(key, None)
    else:
        cache.clear()


def invalidate_all_caches():
    """Clear all global caches."""
    task_types_cache.clear()
    user_types_cache.clear()
    eligibility_cache.clear()
    workflow_templates_cache.clear()