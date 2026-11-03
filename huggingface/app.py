"""Gradio Space for VideoUpscaler (https://videoupscaler.co) — 1080p, 2K & 4K AI Video Super-Resolution."""
import os
import time
import uuid
import gradio as gr
import requests

API_BASE = "https://videoupscaler.co/api/v1"


def upscale_video(api_key: str, video_url: str, resolution: str = "4k"):
    key = (api_key or os.environ.get("VIDEOUPSCALER_API_KEY") or "").strip()
    if not key:
        raise gr.Error("Please provide a VideoUpscaler API key from https://videoupscaler.co")
    if not video_url or not video_url.startswith(("http://", "https://")):
        raise gr.Error("Please provide a valid public http(s) video URL.")

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Idempotency-Key": str(uuid.uuid4()),
    }
    res = requests.post(
        f"{API_BASE}/upscale",
        headers=headers,
        json={"video_url": video_url.strip(), "resolution": resolution},
        timeout=300,
    )
    if not res.ok:
        raise gr.Error(f"API Error ({res.status_code}): {res.text}")

    task = res.json()
    task_id = task["id"]

    while task.get("status") in ("queued", "processing"):
        poll = requests.get(
            f"{API_BASE}/tasks/{task_id}?wait=45",
            headers={"Authorization": f"Bearer {key}"},
            timeout=60,
        )
        if poll.ok:
            task = poll.json()
        else:
            time.sleep(5)

    if task.get("status") == "failed":
        raise gr.Error(f"Upscale failed: {task.get('error', 'Unknown error')}")

    return task.get("output_url"), task


with gr.Blocks(title="VideoUpscaler — 4K AI Video Upscaler") as demo:
    gr.Markdown(
        "# 🎬 [VideoUpscaler](https://videoupscaler.co) — 4K AI Video Super-Resolution\n"
        "Upscale low-resolution videos to **1080p, 2K, or 4K Ultra HD** using cloud GPUs. "
        "Learn more at [4K Video Upscaler](https://videoupscaler.co/4k-video-upscaler), "
        "[Batch Video Upscaler](https://videoupscaler.co/batch-video-upscaler), and "
        "[Workflow Docs](https://videoupscaler.co/docs/workflows)."
    )
    with gr.Row():
        with gr.Column():
            api_key_input = gr.Textbox(
                label="VideoUpscaler API Key (vu_live_...)",
                type="password",
                placeholder="vu_live_...",
            )
            video_url_input = gr.Textbox(
                label="Public Video URL (.mp4, .mov, .webm)",
                placeholder="https://example.com/sample.mp4",
            )
            resolution_input = gr.Dropdown(
                choices=["1080p", "2k", "4k"],
                value="4k",
                label="Target Resolution",
            )
            submit_btn = gr.Button("🚀 Upscale Video to 4K", variant="primary")
        with gr.Column():
            video_output = gr.Video(label="Upscaled Video Output")
            json_output = gr.JSON(label="Task Metadata")

    submit_btn.click(
        fn=upscale_video,
        inputs=[api_key_input, video_url_input, resolution_input],
        outputs=[video_output, json_output],
    )

if __name__ == "__main__":
    demo.launch()
