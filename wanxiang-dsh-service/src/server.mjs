import http from 'node:http';
import { DshRunner, DshRunError } from './dsh-runner.mjs';
import { DshWebManager } from './dsh-web-manager.mjs';

const port = Number(process.env.PORT || 4317);
const allowedOrigin = process.env.WANXIANG_WEB_ORIGIN || 'http://localhost:3000';
const runner = new DshRunner();
const webManager = new DshWebManager();

const server = http.createServer(async (request, response) => {
  setCors(response, request.headers.origin);
  if (request.method === 'OPTIONS') return respond(response, 204, null);

  try {
    if (request.method === 'GET' && request.url === '/api/dsh/health') {
      return respond(response, 200, { ok: true, ...(await runner.status()) });
    }

    if (request.method === 'POST' && request.url === '/api/dsh/run') {
      const body = await readJson(request);
      const controller = new AbortController();
      response.on('close', () => {
        if (!response.writableEnded) controller.abort();
      });
      const events = [];
      const result = await runner.run({
        projectId: body.projectId,
        projectName: body.projectName,
        task: body.task,
        action: body.action,
        discovery: body.discovery,
        signal: controller.signal,
        onEvent: (event) => events.push({ ...event, at: new Date().toISOString() }),
      });
      return respond(response, 200, { ok: true, ...result, events });
    }

    if (request.method === 'POST' && request.url === '/api/dsh/web/launch') {
      const body = await readJson(request);
      const result = await webManager.launch({
        projectId: body.projectId,
        projectName: body.projectName,
        task: body.task,
        discovery: body.discovery,
      });
      return respond(response, 200, { ok: true, runtime: 'dsh-web', ...result });
    }

    respond(response, 404, { ok: false, code: 'NOT_FOUND', message: '接口不存在' });
  } catch (error) {
    const known = error instanceof DshRunError;
    respond(response, known ? 422 : 500, {
      ok: false,
      code: known ? error.code : 'INTERNAL_ERROR',
      message: known ? error.message : '万象 DSH 服务发生内部错误',
      details: known ? error.details : '',
    });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`wanxiang-dsh-service listening on http://127.0.0.1:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void webManager.stop().finally(() => server.close(() => process.exit(0)));
  });
}

function setCors(response, origin) {
  const accepted = new Set([allowedOrigin, 'http://127.0.0.1:3000', 'http://localhost:3000']);
  if (origin && accepted.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function respond(response, status, body) {
  response.statusCode = status;
  if (body === null) return response.end();
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new DshRunError('BODY_TOO_LARGE', '请求内容过大');
  }
  try {
    return JSON.parse(raw || '{}');
  } catch {
    throw new DshRunError('INVALID_JSON', '请求不是有效 JSON');
  }
}
