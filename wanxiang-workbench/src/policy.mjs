import { randomUUID } from 'node:crypto';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Wanxiang's product policy and browser branding, composed into every session. */
export const name = 'wanxiang-workbench';
export const inject = ['systemPrompt', 'webServer'];

const manifest = JSON.stringify({
  name: '万象',
  short_name: '万象',
  start_url: '/',
  display: 'standalone',
  background_color: '#f3f0e8',
  theme_color: '#2f6656',
  icons: [],
});

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#2f6656"/><path d="M18 19h8v8h12v-8h8v26h-8V35H26v10h-8z" fill="#fffaf0"/><circle cx="32" cy="32" r="4" fill="#d4a964"/></svg>`;
const briefFields = [
  ['goal', '真实任务与目标'],
  ['inputs', '输入与资料来源'],
  ['rules', '判断与优先级规则'],
  ['output', '交付结果'],
  ['boundaries', '排除项与风险边界'],
  ['success', '验收标准'],
];

export function apply(ctx) {
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'wanxiang:builder-policy',
    order: 95,
    text: `You are the Builder Agent inside the Wanxiang workbench.

Treat the confirmed work brief in the current workspace as the product contract. Help a non-technical member turn one real, recurring job into a useful, maintainable Agent.

Work in one continuous build-and-verify loop: inspect the brief and examples, make the smallest useful implementation, run representative and boundary checks immediately, explain failures in plain language, and revise until the evidence is acceptable. Do not present "build" and "verification" as separate handoff stages.

Keep artifacts readable and versionable in the workspace. Never claim a Data Agent or external system is connected when only a sample contract exists. Preview risky writes, messages, deletions, payments, or external side effects and require explicit human approval before execution.

The community drawer is an external support service. It can receive questions and feedback, but it never approves scope, unlocks a stage, or decides whether the work is complete.`,
  }));

  ctx.effect(() => ctx.webServer.tapIndex((html) => html
    .replace(/<title>.*?<\/title>/iu, '<title>万象</title>')
    .replace(/<meta name="theme-color" content="[^"]*"\s*\/?>/iu, '<meta name="theme-color" content="#2f6656">')));

  ctx.effect(() => ctx.on('webserver/index-inject', (table) => {
    table.push({ kind: 'global', name: '__WANXIANG_WORKSPACE__', value: process.cwd() });
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/wanxiang/work-brief',
    handler: async (request, response) => {
      if (request.method !== 'PUT') return respondJson(response, 405, { ok: false, message: '只允许更新工作简报。' });
      if (!sameOrigin(request)) return respondJson(response, 403, { ok: false, message: '请求来源不受信任。' });
      try {
        const payload = validateBrief(await readJson(request));
        const artifactRoot = path.join(process.cwd(), '.wanxiang');
        const destination = path.join(artifactRoot, 'work-brief.md');
        const temporary = path.join(artifactRoot, `.work-brief.${randomUUID()}.tmp`);
        await mkdir(artifactRoot, { recursive: true });
        try {
          await writeFile(temporary, renderBrief(payload), { encoding: 'utf8', flag: 'wx' });
          await rename(temporary, destination);
        } catch (error) {
          await unlink(temporary).catch(() => {});
          throw error;
        }
        return respondJson(response, 200, { ok: true });
      } catch (error) {
        const status = Number(error?.statusCode) || 500;
        const message = status < 500 && error instanceof Error ? error.message : '工作简报暂时无法保存，请稍后重试。';
        return respondJson(response, status, { ok: false, message });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/manifest.webmanifest',
    handler: (_request, response) => {
      response.writeHead(200, { 'content-type': 'application/manifest+json; charset=utf-8' });
      response.end(manifest);
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/favicon.svg',
    handler: (_request, response) => {
      response.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8' });
      response.end(favicon);
    },
  }));
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

async function readJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 128 * 1024) throw httpError(413, '工作简报内容过大。');
  }
  try {
    return JSON.parse(raw || '{}');
  } catch {
    throw httpError(400, '工作简报格式无效。');
  }
}

function validateBrief(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw httpError(400, '工作简报格式无效。');
  const projectName = cleanText(raw.projectName, 'Agent 名称', 200);
  const answers = {};
  for (const [key, label] of briefFields) answers[key] = cleanText(raw.answers?.[key], label, 12_000);
  return { projectName, answers };
}

function cleanText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim()) throw httpError(400, `${label}不能为空。`);
  const text = value.trim();
  if (text.length > maxLength) throw httpError(413, `${label}内容过长。`);
  return text;
}

function renderBrief({ projectName, answers }) {
  const sections = briefFields.map(([key, label]) => `## ${label}\n\n${answers[key]}`).join('\n\n');
  return `# ${projectName} · 已确认工作简报\n\n${sections}\n`;
}

function respondJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}
