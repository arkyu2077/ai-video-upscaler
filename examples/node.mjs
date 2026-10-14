// Upload a local video, upscale it and print the result URL.
// Usage: VIDEOUPSCALER_API_KEY=vu_live_... node node.mjs ./clip.mp4 2k   (Node.js 18+)
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const API = 'https://videoupscaler.co/api/v1';
const auth = { Authorization: `Bearer ${process.env.VIDEOUPSCALER_API_KEY}` };
const [path, resolution = '1080p'] = process.argv.slice(2);

async function call(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...auth, ...init.headers } });
  const body = await res.json();
  if (!res.ok) throw new Error(`${body.error.code}: ${body.error.message}`);
  return body;
}

const contentType = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' }[
  path.split('.').pop().toLowerCase()
];
const file = await readFile(path);

// 1. Get a signed upload URL and PUT the file to it (no Authorization header there)
const upload = await call(`${API}/uploads`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content_type: contentType, size: file.length }),
});
const put = await fetch(upload.upload_url, { method: 'PUT', headers: upload.headers, body: file });
if (!put.ok) throw new Error(`upload failed: ${put.status}`);

// 2. Start the upscale. Reuse the same Idempotency-Key if you retry, so you are never charged twice
let task = await call(`${API}/upscale`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
  body: JSON.stringify({ video_url: upload.video_url, resolution }),
});
console.log(`task ${task.id}, charged ${task.credits_charged} credits`);

// 3. Poll until it finishes
while (task.status === 'queued' || task.status === 'processing') {
  await new Promise((r) => setTimeout(r, 8000));
  task = await call(`${API}/tasks/${task.id}`);
  console.log(task.status);
}
if (task.status === 'failed') throw new Error(task.error);
console.log(task.output_url);
