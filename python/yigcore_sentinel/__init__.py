"""
Yigcore Sentinel - Python SDK

Lightweight governance layer for AI agents.
"""

from .client import SentinelClient
from .decorators import init_sentinel, governed

__all__ = ['SentinelClient', 'init_sentinel', 'governed']
__version__ = '0.2.0'
