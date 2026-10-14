---
name: video-upscaler
description: Upscale a video to 1080p, 2K or 4K with the VideoUpscaler API (AI video super-resolution). Use when the user wants to upscale, enhance, sharpen or increase the resolution of a video file or video URL.
license: MIT
---

# Video upscaler

Upscales a video to `1080p`, `2k` or `4k` with [VideoUpscaler](https://videoupscaler.co) and returns a download URL. Processing runs in the cloud; no GPU is needed.

## Requirements

- `VIDEOUPSCALER_API_KEY` in the environment. The user creates it at https://videoupscaler.co/sign-in?callbackUrl=%2Fsettings%2Fapikeys (accounts that have bought credits).
- `curl` and `jq`.
- Input: MP4, MOV or WebM. Up to 1200 seconds at 1080p, 600 seconds at 2k/4k. Up to 500MB from a URL, 100MB from a local file.

If the VideoUpscaler MCP server (`https://videoupscaler.co/api/mcp`) is connected, use its tools (`upscale_video`, `get_task`, `create_upload`, `get_account`) instead of the commands below.

## Cost

1 credit per second at 1080p, 2 at 2k, 3 at 4k (length rounded up). Failed jobs are refunded. Tell the user the cost before starting a long video, and check the balance first:

```bash
curl -s https://videoupscaler.co/api/v1/account -H "Authorization: Bearer $VIDEOUPSCALER_API_KEY"
```

## Steps

1. **Local file only:** get an upload URL, then PUT the file (no Authorization header on the PUT):

   ```bash
   SIZE=$(wc -c < "$FILE" | tr -d ' ')
   UPLOAD=$(curl -s https://videoupscaler.co/api/v1/uploads \
     -H "Authorization: Bearer $VIDEOUPSCALER_API_KEY" -H "Content-Type: application/json" \
     -d "{\"content_type\": \"video/mp4\", \"size\": $SIZE}")
   curl -sf -X PUT "$(echo "$UPLOAD" | jq -r .upload_url)" -H "Content-Type: video/mp4" --data-binary @"$FILE"
   VIDEO_URL=$(echo "$UPLOAD" | jq -r .video_url)
   ```

   Use `video/quicktime` for .mov and `video/webm` for .webm, in both requests.

2. **Start the upscale** with a fresh idempotency key. Keep the key: if the request times out, retry with the SAME key so the user is not charged twice.

   ```bash
   KEY=$(uuidgen)
   curl -s https://videoupscaler.co/api/v1/upscale \
     -H "Authorization: Bearer $VIDEOUPSCALER_API_KEY" -H "Content-Type: application/json" \
     -H "Idempotency-Key: $KEY" \
     -d "{\"video_url\": \"$VIDEO_URL\", \"resolution\": \"1080p\"}"
   ```

3. **Poll** `GET https://videoupscaler.co/api/v1/tasks/{id}` every 10 seconds until `status` is `completed` (give the user `output_url`) or `failed` (show `error`; credits were refunded).

## Errors

Errors look like `{"error": {"code": "...", "message": "..."}}`. Common codes: `insufficient_credits` (top up at https://videoupscaler.co/pricing), `paid_plan_required` (buy any credit pack), `video_too_long`, `video_fetch_failed` (the URL must be a direct file link, not a YouTube or Drive page). Full list: https://videoupscaler.co/docs/errors
