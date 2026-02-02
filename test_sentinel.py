import time
from yigcore_sentinel import init_sentinel, governed
import sys
import os

# Ensure stdout encodes correctly
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add python directory to path
sys.path.insert(0, os.path.join(os.getcwd(), 'python'))

# 1. Connect to Sentinel
init_sentinel("http://localhost:11435")

# 2. Governed function with a FRESH user_id
@governed(action="llm_call", user_id="demo_user_new", cost_estimate=0.5) 
def my_ai_action(text):
    print(f"Action: {text}")

# 3. Running
print("--- Starting Test ---")
try:
    for i in range(25):
        my_ai_action(f"Task {i}")
        time.sleep(0.05)
except PermissionError as e:
    print(f"\n[STOP] Sentinel blocked request: {e}")
except Exception as e:
    print(f"\nError: {e}")
