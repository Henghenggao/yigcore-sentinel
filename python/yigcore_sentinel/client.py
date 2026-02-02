"""
Sentinel Client - HTTP client for communicating with Sentinel Sidecar.
"""

import requests
from typing import Optional, Dict, Any


class SentinelClient:
    """
    Client for Yigcore Sentinel governance sidecar.

    Usage:
        client = SentinelClient("http://localhost:11435")
        decision = client.check_action(
            user_id="agent_123",
            action="delete_file",
            context={"path": "/tmp/test.txt"},
            cost_estimate=0.01
        )
        if not decision["allowed"]:
            raise PermissionError(decision["reasons"])
    """

    def __init__(self, base_url: str = "http://localhost:11435", timeout: float = 1.0):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self._check_health()

    def _check_health(self) -> None:
        """Check if Sentinel sidecar is running."""
        try:
            resp = requests.get(f"{self.base_url}/health", timeout=2)
            resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            raise ConnectionError(
                f"❌ Sentinel sidecar not running at {self.base_url}. "
                f"Start it with: npm run dev (or yigcore-sentinel start)\n"
                f"Error: {e}"
            ) from e

    def check_action(
        self,
        user_id: str,
        action: str,
        context: Optional[Dict[str, Any]] = None,
        cost_estimate: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Check if an action is allowed by governance policies.

        Args:
            user_id: Identifier for the user/agent
            action: Action to perform (e.g., "delete_file", "execute_shell")
            context: Additional context (e.g., {"path": "/tmp/test.txt"})
            cost_estimate: Estimated cost in USD

        Returns:
            {
                "allowed": bool,
                "reasons": List[str],  # Reasons for denial
                "warnings": List[str]  # Warnings (action allowed but flagged)
            }

        Raises:
            ConnectionError: If sidecar is not reachable
            requests.HTTPError: If request fails
        """
        try:
            resp = requests.post(
                f"{self.base_url}/governance/check",
                json={
                    "userId": user_id,
                    "action": action,
                    "context": context or {},
                    "costEstimate": cost_estimate,
                },
                timeout=self.timeout,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.Timeout:
            # Fail-open: if sidecar is slow, allow the action but log warning
            print(f"⚠️  Sentinel timeout - allowing action by default (fail-open)")
            return {"allowed": True, "reasons": [], "warnings": ["Sentinel timeout"]}
        except requests.exceptions.RequestException as e:
            # Fail-open: if sidecar is down, allow the action but log error
            print(f"❌ Sentinel error - allowing action by default (fail-open): {e}")
            return {"allowed": True, "reasons": [], "warnings": [f"Sentinel error: {e}"]}

    def get_audit_logs(
        self,
        user_id: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Retrieve audit logs.

        Args:
            user_id: Filter logs by user ID (optional)
            limit: Maximum number of logs to return

        Returns:
            {"logs": [...]}
        """
        params = {"limit": str(limit)}
        if user_id:
            params["userId"] = user_id

        resp = requests.get(
            f"{self.base_url}/governance/audit",
            params=params,
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def get_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get governance statistics for a user.

        Args:
            user_id: User identifier

        Returns:
            {
                "userId": str,
                "budget": {"used": float, "limit": float, "remaining": float},
                "rateLimit": {"available": int, "waiting": int}
            }
        """
        resp = requests.get(
            f"{self.base_url}/governance/stats",
            params={"userId": user_id},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def set_budget(self, user_id: str, limit: float) -> Dict[str, Any]:
        """
        Set budget limit for a user.

        Args:
            user_id: User identifier
            limit: Budget limit in USD

        Returns:
            {"success": true, "userId": str, "limit": float}
        """
        resp = requests.post(
            f"{self.base_url}/governance/budget/set",
            json={"userId": user_id, "limit": limit},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def reset_budget(self, user_id: str) -> Dict[str, Any]:
        """
        Reset budget usage for a user.

        Args:
            user_id: User identifier

        Returns:
            {"success": true, "userId": str}
        """
        resp = requests.post(
            f"{self.base_url}/governance/budget/reset",
            json={"userId": user_id},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()
