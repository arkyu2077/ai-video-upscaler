# VideoUpscaler: Cloud-Native 4K AI Video Upscaler & Workflow Automation

Welcome to the official technical documentation for **[VideoUpscaler (videoupscaler.co)](https://videoupscaler.co)** — the cloud-native spatio-temporal video super-resolution, denoising, frame interpolation, and motion stabilization platform.

## Official Web Pipelines & Endpoints

| Capability | Live Web Application & API | Description |
| :--- | :--- | :--- |
| **Core Platform** | [https://videoupscaler.co](https://videoupscaler.co) | Cloud AI Video Enhancement Studio & REST API |
| **4K AI Video Upscaler** | [https://videoupscaler.co/4k-video-upscaler](https://videoupscaler.co/4k-video-upscaler) | Multi-frame spatio-temporal super-resolution up to 4K UHD (3840x2160) |
| **Batch Video Upscaler** | [https://videoupscaler.co/batch-video-upscaler](https://videoupscaler.co/batch-video-upscaler) | High-throughput parallel cloud queue for multi-video production |
| **AI Video Denoising** | [https://videoupscaler.co/denoise-video](https://videoupscaler.co/denoise-video) | Low-light ISO sensor grain and H.264/H.265 compression artifact removal |
| **60FPS Frame Interpolation** | [https://videoupscaler.co/frame-interpolation](https://videoupscaler.co/frame-interpolation) | Optical-flow intermediate frame synthesis for smooth 60FPS playback |
| **AI Video Stabilization** | [https://videoupscaler.co/stabilize-video](https://videoupscaler.co/stabilize-video) | Global camera trajectory smoothing and rolling-shutter correction |
| **Workflow Integrations Hub** | [https://videoupscaler.co/integrations](https://videoupscaler.co/integrations) | Official n8n, Make.com, Zapier, and MCP AI Agent integrations |
| **Developer Workflow Docs** | [https://videoupscaler.co/docs/workflows](https://videoupscaler.co/docs/workflows) | OpenAPI 3.1 specification, webhook verification, and SDK guides |

## Quickstart: Python SDK & REST API

```bash
pip install requests
```

```python
import requests

response = requests.post(
    "https://videoupscaler.co/api/v1/jobs",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={
        "inputUrl": "https://example.com/source-1080p.mp4",
        "scale": 4,
        "model": "flashvsr-4k",
        "denoise": True,
        "targetFps": 60,
        "wait": 25
    }
)
print(response.json())
```

## Research, Benchmarks & Model Hubs

- **CERN Zenodo Technical Report (DOI)**: [https://doi.org/10.5281/zenodo.23913038](https://doi.org/10.5281/zenodo.23913038)
- **CERN Zenodo Benchmark Dataset (DOI)**: [https://doi.org/10.5281/zenodo.23913061](https://doi.org/10.5281/zenodo.23913061)
- **Hugging Face Space**: [https://huggingface.co/spaces/yuxh1996/4k-ai-video-upscaler](https://huggingface.co/spaces/yuxh1996/4k-ai-video-upscaler)
- **Hugging Face Model Card**: [https://huggingface.co/yuxh1996/VideoUpscaler-FlashVSR-4K](https://huggingface.co/yuxh1996/VideoUpscaler-FlashVSR-4K)
- **Kaggle Benchmark Dataset**: [https://www.kaggle.com/datasets/arkyu2077/4k-video-upscaling-benchmark](https://www.kaggle.com/datasets/arkyu2077/4k-video-upscaling-benchmark)
- **Replicate Model**: [https://replicate.com/aigc_hacker_house/4k-video-upscaler](https://replicate.com/aigc_hacker_house/4k-video-upscaler)
