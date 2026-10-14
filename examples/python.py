"""Upscale a video by URL and print the result URL.

Usage: VIDEOUPSCALER_API_KEY=vu_live_... python python.py https://example.com/clip.mp4 2k
Requires: pip install requests
"""
import os
import sys
import time
import uuid

import requests

API = "https://videoupscaler.co/api/v1"
AUTH = {"Authorization": f"Bearer {os.environ['VIDEOUPSCALER_API_KEY']}"}

video_url = sys.argv[1]
resolution = sys.argv[2] if len(sys.argv) > 2 else "1080p"  # 1080p, 2k or 4k

# Reuse the same Idempotency-Key if you retry, so you are never charged twice.
res = requests.post(
    f"{API}/upscale",
    headers={**AUTH, "Idempotency-Key": str(uuid.uuid4())},
    json={"video_url": video_url, "resolution": resolution},
    timeout=300,  # the request downloads the video before it answers
)
if not res.ok:
    sys.exit(f"{res.status_code}: {res.json()['error']}")
task = res.json()
print(f"task {task['id']}, charged {task['credits_charged']} credits")

while task["status"] in ("queued", "processing"):
    time.sleep(8)
    task = requests.get(f"{API}/tasks/{task['id']}", headers=AUTH, timeout=30).json()
    print(task["status"])

if task["status"] == "failed":
    sys.exit(task["error"])
print(task["output_url"])
