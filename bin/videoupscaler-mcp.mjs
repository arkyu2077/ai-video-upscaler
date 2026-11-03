#!/usr/bin/env node
/**
 * videoupscaler-mcp — Official Model Context Protocol (MCP) stdio server for VideoUpscaler (https://videoupscaler.co)
 *
 * Zero-dependency JSON-RPC 2.0 MCP server over stdio.
 * Environment variables:
 *   VIDEOUPSCALER_API_KEY   - Required for API calls. Create one at https://videoupscaler.co/settings/apikeys
 *   VIDEOUPSCALER_BASE_URL  - Optional API base URL (default: https://videoupscaler.co/api/v1)
 */

import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';

const SERVER_NAME = 'videoupscaler-mcp';
const SERVER_VERSION = '0.1.0';
const DEFAULT_BASE_URL = 'https://videoupscaler.co/api/v1';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(
    [
      `${SERVER_NAME} v${SERVER_VERSION} — Official MCP stdio server for VideoUpscaler (https://videoupscaler.co)`,
      '',
      'Usage:',
      '  VIDEOUPSCALER_API_KEY=vu_live_... npx -y videoupscaler-mcp',
      '',
      'Environment variables:',
      '  VIDEOUPSCALER_API_KEY   Your VideoUpscaler API key from https://videoupscaler.co/settings/apikeys',
      `  VIDEOUPSCALER_BASE_URL  API base URL (default: ${DEFAULT_BASE_URL})`,
      '',
      'Exposed MCP tools:',
      '  - upscale_video        Submit a 1080p/2k/4k AI video upscale task (POST /upscale)',
      '  - get_upscale_task     Get task status/output URL with optional wait (GET /tasks/{id})',
      '  - list_upscale_tasks   List recent video upscale tasks (GET /tasks)',
      '  - get_account_balance  Get credit balance and per-second rates (GET /account)',
      '  - create_upload        Get a signed PUT upload URL for local video files (POST /uploads)',
      '',
    ].join('\n')
  );
  process.exit(0);
}

if (argv.includes('--version') || argv.includes('-v')) {
  process.stdout.write(`${SERVER_VERSION}\n`);
  process.exit(0);
}

const TOOLS = [
  {
    name: 'upscale_video',
    description:
      'Submit an AI video upscale task to enhance a video to 1080p, 2k, or 4k via POST https://videoupscaler.co/api/v1/upscale (powered by FlashVSR diffusion video super-resolution). Charges credits per second of video (1080p: 1/s, 2k: 2/s, 4k: 3/s) and refunds automatically if a task fails.',
    inputSchema: {
      type: 'object',
      required: ['video_url', 'resolution'],
      properties: {
        video_url: {
          type: 'string',
          description:
            'Public http(s) URL of an MP4, MOV, or WebM video (up to 500MB; up to 1200s at 1080p, 600s at 2k/4k), or the video_url returned by create_upload.',
        },
        resolution: {
          type: 'string',
          enum: ['1080p', '2k', '4k'],
          description: 'Target output resolution: "1080p" (1 credit/s), "2k" (2 credits/s), or "4k" (3 credits/s).',
        },
        idempotency_key: {
          type: 'string',
          description:
            'Optional unique string (1-255 printable ASCII characters, e.g. a UUID) so retrying the same request never charges twice. Auto-generated if omitted.',
        },
        ops: {
          type: 'object',
          description:
            'Optional restoration & enhancement flags: deinterlace (boolean), stabilize (boolean), denoise (0-3), deflicker (boolean), fpsMultiplier (1|2|4|8), slowMotion (boolean), faceRestore (boolean), hdr ("none"|"hdr10"|"hlg"), engine ("general"|"anime").',
          properties: {
            deinterlace: { type: 'boolean' },
            stabilize: { type: 'boolean' },
            denoise: { type: 'integer', enum: [0, 1, 2, 3] },
            deflicker: { type: 'boolean' },
            fpsMultiplier: { type: 'integer', enum: [1, 2, 4, 8] },
            slowMotion: { type: 'boolean' },
            faceRestore: { type: 'boolean' },
            hdr: { type: 'string', enum: ['none', 'hdr10', 'hlg'] },
            engine: { type: 'string', enum: ['general', 'anime'] },
          },
        },
        webhook_url: {
          type: 'string',
          description: 'Optional public https:// URL to receive a signed POST webhook when the task completes or fails.',
        },
      },
    },
  },
  {
    name: 'get_upscale_task',
    description:
      'Get the status and output download URL of a video upscale task via GET https://videoupscaler.co/api/v1/tasks/{id}. Status is queued, processing, completed (output_url holds the MP4 download link), or failed (credits refunded). Set wait (up to 45 seconds) to long-poll until the task finishes.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: {
          type: 'string',
          description: 'The task ID returned by upscale_video.',
        },
        wait: {
          type: 'integer',
          minimum: 0,
          maximum: 45,
          description: 'Optional seconds (0-45) to wait on the server for the task to complete before returning.',
        },
      },
    },
  },
  {
    name: 'list_upscale_tasks',
    description:
      'List your recent video upscale tasks (newest first, including tasks created on the website, REST API, or MCP) via GET https://videoupscaler.co/api/v1/tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          description: 'Maximum number of tasks to return (1-100, default 20).',
        },
        page: {
          type: 'integer',
          minimum: 1,
          description: 'Page number (minimum 1, default 1).',
        },
      },
    },
  },
  {
    name: 'get_account_balance',
    description:
      'Get your VideoUpscaler credit balance and per-second credit cost for 1080p, 2k, and 4k via GET https://videoupscaler.co/api/v1/account.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_upload',
    description:
      'Get a signed PUT upload URL to upload a local video file (up to 100MB) via POST https://videoupscaler.co/api/v1/uploads when it does not have a public URL, then pass the returned video_url to upscale_video.',
    inputSchema: {
      type: 'object',
      required: ['content_type', 'size'],
      properties: {
        content_type: {
          type: 'string',
          enum: ['video/mp4', 'video/quicktime', 'video/webm'],
          description: 'MIME type of the local video file.',
        },
        size: {
          type: 'integer',
          minimum: 1,
          maximum: 104857600,
          description: 'File size in bytes (up to 104,857,600 bytes / 100MB).',
        },
      },
    },
  },
];

function getBaseUrl() {
  return (process.env.VIDEOUPSCALER_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function getApiKey() {
  return (process.env.VIDEOUPSCALER_API_KEY || '').trim();
}

function formatToolResult(data, isError = false) {
  return {
    isError,
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function callApi(path, { method = 'GET', headers = {}, body } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return formatToolResult(
      {
        error: {
          code: 'missing_api_key',
          message:
            'VIDEOUPSCALER_API_KEY environment variable is not set. Create an API key at https://videoupscaler.co/settings/apikeys and set VIDEOUPSCALER_API_KEY.',
        },
      },
      true
    );
  }

  const url = `${getBaseUrl()}${path}`;
  const reqHeaders = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'User-Agent': `${SERVER_NAME}/${SERVER_VERSION}`,
    ...headers,
  };

  if (body !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }
    if (!response.ok) {
      return formatToolResult(parsed, true);
    }
    return formatToolResult(parsed, false);
  } catch (err) {
    return formatToolResult(
      {
        error: {
          code: 'network_error',
          message: err instanceof Error ? err.message : String(err),
        },
      },
      true
    );
  }
}

async function handleToolCall(name, args = {}) {
  switch (name) {
    case 'upscale_video': {
      if (!args.video_url || !args.resolution) {
        return formatToolResult(
          {
            error: {
              code: 'invalid_arguments',
              message: 'Both "video_url" and "resolution" ("1080p", "2k", or "4k") are required.',
            },
          },
          true
        );
      }
      const idempotencyKey = args.idempotency_key || randomUUID();
      const payload = {
        video_url: args.video_url,
        resolution: args.resolution,
        ...(args.ops !== undefined ? { ops: args.ops } : {}),
        ...(args.webhook_url !== undefined ? { webhook_url: args.webhook_url } : {}),
      };
      return callApi('/upscale', {
        method: 'POST',
        headers: { 'Idempotency-Key': String(idempotencyKey) },
        body: payload,
      });
    }

    case 'get_upscale_task':
    case 'get_task': {
      const taskId = args.id || args.task_id;
      if (!taskId) {
        return formatToolResult(
          {
            error: {
              code: 'invalid_arguments',
              message: 'Task "id" is required.',
            },
          },
          true
        );
      }
      const waitVal = args.wait ?? args.wait_seconds;
      const query =
        waitVal !== undefined && waitVal !== null && Number(waitVal) > 0
          ? `?wait=${encodeURIComponent(String(waitVal))}`
          : '';
      return callApi(`/tasks/${encodeURIComponent(String(taskId))}${query}`, {
        method: 'GET',
      });
    }

    case 'list_upscale_tasks':
    case 'list_tasks': {
      const params = new URLSearchParams();
      if (args.limit !== undefined && args.limit !== null) {
        params.set('limit', String(args.limit));
      }
      if (args.page !== undefined && args.page !== null) {
        params.set('page', String(args.page));
      }
      const qs = params.toString();
      return callApi(`/tasks${qs ? `?${qs}` : ''}`, { method: 'GET' });
    }

    case 'get_account_balance':
    case 'get_account': {
      return callApi('/account', { method: 'GET' });
    }

    case 'create_upload': {
      if (!args.content_type || !args.size) {
        return formatToolResult(
          {
            error: {
              code: 'invalid_arguments',
              message: 'Both "content_type" and "size" are required.',
            },
          },
          true
        );
      }
      return callApi('/uploads', {
        method: 'POST',
        body: {
          content_type: args.content_type,
          size: Number(args.size),
        },
      });
    }

    default:
      return formatToolResult(
        {
          error: {
            code: 'unknown_tool',
            message: `Unknown tool: ${name}`,
          },
        },
        true
      );
  }
}

function sendJsonRpc(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handleJsonRpcMessage(msg) {
  if (!msg || typeof msg !== 'object') return;

  const { id, method, params } = msg;

  // Notifications have no id and expect no response
  if (id === undefined || id === null) {
    return;
  }

  try {
    switch (method) {
      case 'initialize': {
        const clientProtocol = params?.protocolVersion || '2024-11-05';
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: clientProtocol,
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION,
            },
            capabilities: {
              tools: {},
            },
            instructions:
              'VideoUpscaler upscales videos to 1080p, 2k, or 4k with FlashVSR AI video super-resolution. Typical flow: call get_account_balance to check credits, upscale_video with a public video_url and resolution (1080p, 2k, or 4k), then get_upscale_task with wait=45 until status is completed and return output_url.',
          },
        });
        return;
      }

      case 'ping': {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {},
        });
        return;
      }

      case 'tools/list': {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOLS,
          },
        });
        return;
      }

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        const result = await handleToolCall(toolName, toolArgs);
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result,
        });
        return;
      }

      case 'resources/list': {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: { resources: [] },
        });
        return;
      }

      case 'resources/templates/list': {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: { resourceTemplates: [] },
        });
        return;
      }

      case 'prompts/list': {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: { prompts: [] },
        });
        return;
      }

      default: {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        });
      }
    }
  } catch (err) {
    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : 'Internal error',
      },
    });
  }
}

const rl = createInterface({
  input: process.stdin,
  terminal: false,
});

let queue = Promise.resolve();

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('Content-Length:')) return;
  try {
    const parsed = JSON.parse(trimmed);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      queue = queue.then(() => handleJsonRpcMessage(item)).catch(() => {});
    }
  } catch {
    // Ignore malformed non-JSON lines
  }
});
