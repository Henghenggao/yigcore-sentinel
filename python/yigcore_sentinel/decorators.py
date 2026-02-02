"""
Decorators for easy integration with Python AI agents.
"""

from functools import wraps
from typing import Callable, Optional, Any
from .client import SentinelClient


# Global client instance
_global_client: Optional[SentinelClient] = None


def init_sentinel(base_url: str = "http://localhost:11435", timeout: float = 1.0) -> None:
    """
    Initialize the global Sentinel client.

    Must be called before using @governed decorator.

    Args:
        base_url: URL of Sentinel sidecar (default: http://localhost:11435)
        timeout: Request timeout in seconds (default: 1.0)

    Example:
        from yigcore_sentinel import init_sentinel, governed

        init_sentinel()

        @governed("delete_file")
        def delete_file(path: str):
            os.remove(path)
    """
    global _global_client
    _global_client = SentinelClient(base_url=base_url, timeout=timeout)


def governed(
    action: str,
    user_id: str = "default_agent",
    cost_estimate: Optional[float] = None,
    extract_context: Optional[Callable[..., dict]] = None,
    fail_open: bool = True,
):
    """
    Decorator to add Sentinel governance to a function.

    Args:
        action: Action name (e.g., "delete_file", "execute_shell", "llm_call")
        user_id: User/agent identifier (default: "default_agent")
        cost_estimate: Estimated cost in USD (optional)
        extract_context: Function to extract context from function args
        fail_open: If True, allow action if Sentinel is unreachable (default: True)

    Example:
        @governed("delete_file", cost_estimate=0.0)
        def delete_file(path: str):
            os.remove(path)

        @governed("llm_call", cost_estimate=0.002, extract_context=lambda prompt: {"length": len(prompt)})
        def call_llm(prompt: str):
            return openai.Completion.create(prompt=prompt)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            if _global_client is None:
                raise RuntimeError(
                    "Sentinel not initialized. Call init_sentinel() before using @governed.\n"
                    "Example:\n"
                    "  from yigcore_sentinel import init_sentinel\n"
                    "  init_sentinel()\n"
                )

            # Extract context if provided
            context = {}
            if extract_context:
                try:
                    context = extract_context(*args, **kwargs)
                except Exception as e:
                    print(f"⚠️  Failed to extract context: {e}")

            # Check with Sentinel
            try:
                decision = _global_client.check_action(
                    user_id=user_id,
                    action=action,
                    context=context,
                    cost_estimate=cost_estimate,
                )

                # Check if allowed
                if not decision["allowed"]:
                    reasons = ", ".join(decision["reasons"])
                    raise PermissionError(f"🚫 Sentinel blocked: {reasons}")

                # Print warnings if any
                for warning in decision.get("warnings", []):
                    print(f"⚠️  Sentinel: {warning}")

            except PermissionError:
                # Re-raise PermissionError (action was explicitly blocked)
                raise
            except Exception as e:
                # Other errors (connection issues, etc.)
                if fail_open:
                    print(f"⚠️  Sentinel error (fail-open): {e}")
                else:
                    raise RuntimeError(f"Sentinel error (fail-closed): {e}") from e

            # Execute the original function
            return func(*args, **kwargs)

        return wrapper
    return decorator
