"""Fixed-window rate limiter shared across workers through Redis."""
import redis

r = redis.Redis(host="localhost", port=6379)


def allow(api_key: str, limit: int = 10, window_s: int = 1) -> bool:
    """Count this request against the key's current window; True if under the limit."""
    key = f"rl:{api_key}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window_s, nx=True)
    count, _ = pipe.execute()
    return count <= limit
