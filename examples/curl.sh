#!/usr/bin/env bash
# Upscale a video with the VideoUpscaler API and print the result URL.
# Usage: VIDEOUPSCALER_API_KEY=vu_live_... ./curl.sh https://example.com/clip.mp4 2k
set -euo pipefail

API=https://videoupscaler.co/api/v1
VIDEO_URL=${1:?video URL}
RESOLUTION=${2:-1080p} # 1080p, 2k or 4k
AUTH="Authorization: Bearer $VIDEOUPSCALER_API_KEY"

TASK=$(curl -sf "$API/upscale" -H "$AUTH" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{\"video_url\": \"$VIDEO_URL\", \"resolution\": \"$RESOLUTION\"}")
ID=$(echo "$TASK" | jq -r .id)
echo "task $ID, charged $(echo "$TASK" | jq -r .credits_charged) credits"

while true; do
  TASK=$(curl -sf "$API/tasks/$ID" -H "$AUTH")
  STATUS=$(echo "$TASK" | jq -r .status)
  case "$STATUS" in
    completed) echo "$TASK" | jq -r .output_url; exit 0 ;;
    failed) echo "failed: $(echo "$TASK" | jq -r .error)" >&2; exit 1 ;;
    *) echo "$STATUS..."; sleep 8 ;;
  esac
done
