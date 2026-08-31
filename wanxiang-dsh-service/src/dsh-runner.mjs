import { spawn } from 'node:child_process';
import { access, mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { buildDiscoveryPrompt, nextDiscoverySlot, parseDiscoveryOutput, settleDiscovery } from './discovery.mjs';

const require = createRequire(import.meta.url);
const defaultWorkspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'wanxiang-workspaces');
const maxCapturedBytes = 512 * 1024;
const rateLimitPattern = /(429|rate.?limit|quota|insufficient|额度|限流|余额不足)/i;

export class DshRunError extends Error {
  constructor(code, message, details = '') {
    super(message);
    this.name = 'DshRunError';
    this.code = code;
    this.details = details;
  }
}

export class DshRunner {
  constructor(options = {}) {
    this.cliPath = options.cliPath || process.env.DSH_CLI_PATH || resolveInstalledCli();
    this.workspaceRoot = path.resolve(options.workspaceRoot || process.env.WANXIANG_WORKSPACE_ROOT || defaultWorkspaceRoot);
    this.profile = options.profile || 'headless';
    this.timeoutMs = Number(options.timeoutMs || process.env.WANXIANG_DSH_TIMEOUT_MS || 900_000);
    this.retrySeconds = Number(options.retrySeconds || process.env.WANXIANG_DSH_RETRY_SECONDS || 60);
    this.waitOnRateLimit = options.waitOnRateLimit ?? process.env.WANXIANG_DSH_WAIT_ON_RATE_LIMIT !== 'false';
    this.environment = options.environment || process.env;
  }

  async status() {
    await mkdir(this.workspaceRoot, { recursive: true });
    const result = await runProcess(process.execPath, [this.cliPath, '--version'], {
      cwd: this.workspaceRoot,
      environment: this.environment,
      timeoutMs: 10_000,
    });
    if (result.exitCode !== 0) throw new DshRunError('DSH_UNAVAILABLE', 'DSH CLI 无法启动', cleanError(result.stderr));
    return { runtime: 'dsh', version: result.stdout.trim(), profile: this.profile };
  }

  async run({ projectId, projectName, task, action, discovery, signal, onEvent = () => {} }) {
    validateProjectId(projectId);
    if (typeof task !== 'string' || !task.trim()) throw new DshRunError('INVALID_TASK', '真实任务不能为空');
    if (!['discover', 'build', 'evaluate', 'run'].includes(action)) throw new DshRunError('INVALID_ACTION', '不支持的 DSH 动作');

    const workspace = path.resolve(this.workspaceRoot, projectId);
    if (!workspace.startsWith(`${this.workspaceRoot}${path.sep}`)) throw new DshRunError('INVALID_PROJECT', '项目工作区越界');
    await mkdir(workspace, { recursive: true });

    const runId = randomUUID();
    const settledDiscovery = action === 'discover' ? settleDiscovery(discovery?.draft, discovery?.answered) : null;
    const discoverySlot = settledDiscovery ? nextDiscoverySlot(settledDiscovery) : null;
    const prompt = action === 'discover'
      ? buildDiscoveryPrompt({ projectName, messages: discovery?.messages, draft: settledDiscovery, nextSlot: discoverySlot })
      : buildPrompt({ action, projectName, task, runId });
    let attempt = 0;

    while (true) {
      attempt += 1;
      onEvent({ type: 'started', runId, action, attempt });
      const startedAt = Date.now();
      const result = await runProcess(process.execPath, [this.cliPath, '--profile', this.profile, prompt], {
        cwd: workspace,
        environment: this.environment,
        timeoutMs: this.timeoutMs,
        signal,
      });

      if (result.exitCode === 0 && result.stdout.trim()) {
        const evidence = action === 'discover'
          ? { files: [], discovery: parseDiscoveryOutput(result.stdout, settledDiscovery, discoverySlot) }
          : await inspectArtifacts(workspace, action, runId);
        onEvent({ type: 'completed', runId, action, attempt });
        return {
          runId,
          action,
          output: action === 'discover' ? evidence.discovery.reply : result.stdout.trim(),
          durationMs: Date.now() - startedAt,
          workspace,
          runtime: 'dsh',
          evidence,
        };
      }

      const details = cleanError(result.stderr || result.stdout);
      if (this.waitOnRateLimit && rateLimitPattern.test(details) && !signal?.aborted) {
        onEvent({ type: 'rate-limited', runId, action, attempt, retryInSeconds: this.retrySeconds });
        await wait(this.retrySeconds * 1000, signal);
        continue;
      }

      if (result.timedOut) throw new DshRunError('DSH_TIMEOUT', 'DSH 运行超时', details);
      if (signal?.aborted) throw new DshRunError('DSH_ABORTED', 'DSH 运行已取消');
      throw new DshRunError('DSH_RUN_FAILED', 'DSH 运行失败', details || '进程未返回结果');
    }
  }
}

function resolveInstalledCli() {
  const packageJson = require.resolve('@deepseek-ai/dsh/package.json');
  return path.join(path.dirname(packageJson), 'lib', 'bin.js');
}

async function inspectArtifacts(workspace, action, runId) {
  const artifactRoot = path.join(workspace, '.wanxiang');
  if (action === 'build') {
    const files = ['work-brief.md', 'data-contract.json', 'workflow.json', 'evals.json'];
    try {
      await Promise.all(files.map((file) => access(path.join(artifactRoot, file))));
    } catch {
      throw new DshRunError('DSH_ARTIFACTS_MISSING', 'DSH 已结束，但没有生成完整的 Builder 产物');
    }
    return { files: files.map((file) => `.wanxiang/${file}`) };
  }

  if (action === 'evaluate') {
    try {
      const evaluation = JSON.parse(await readFile(path.join(artifactRoot, 'evaluation.json'), 'utf8'));
      return { files: ['.wanxiang/evaluation.json'], evaluationPassed: evaluation.passed === true };
    } catch {
      throw new DshRunError('DSH_EVALUATION_MISSING', 'DSH 已结束，但没有生成有效的 evaluation.json');
    }
  }

  const runFile = `.wanxiang/runs/${runId}.md`;
  try {
    await access(path.join(workspace, runFile));
  } catch {
    throw new DshRunError('DSH_RUN_ARTIFACT_MISSING', 'DSH 已结束，但没有生成影子运行产物');
  }
  return { files: [runFile] };
}

function validateProjectId(projectId) {
  if (typeof projectId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(projectId)) {
    throw new DshRunError('INVALID_PROJECT', '项目 ID 只能包含字母、数字、下划线和连字符');
  }
}

function buildPrompt({ action, projectName, task, runId }) {
  const context = `你是万象 Builder Agent，运行在 DeepSeek Harness 中。\n项目：${projectName || '未命名项目'}\n真实任务：${task}\n运行编号：${runId}\n只允许在当前工作目录内工作；不要访问或修改其他目录。`;

  if (action === 'build') return `${context}\n\n请创建 .wanxiang 目录，并基于真实任务生成以下可审查文件：\n1. work-brief.md：目标、输入、输出、使用者、完成标准和边界；\n2. data-contract.json：只读数据需求、字段、来源占位和权限边界；\n3. workflow.json：3-6 个可观察步骤、每步输入输出和人工批准点；\n4. evals.json：至少 5 个验收案例，其中至少 2 个边界案例。\n必须实际写入文件。完成后用中文简要说明生成了什么，不要声称已经连接真实数据。`;

  if (action === 'evaluate') return `${context}\n\n读取 .wanxiang 中的工作简报、数据契约、工作流和验收案例。检查文件是否存在、结构是否自洽、是否包含至少 5 个案例和 2 个边界案例。将评测结果写入 .wanxiang/evaluation.json，字段包括 passed、checks、risks、evaluatedAt。不要伪造真实业务运行。最后用中文总结评测结论。`;

  return `${context}\n\n读取 .wanxiang 中已经构建并通过评测的文件。执行一次安全的影子运行：不得访问真实外部数据、不得发送消息、不得修改外部系统。基于工作简报生成一份示例结果，并写入 .wanxiang/runs/${runId}.md，明确标注使用的是原型示例数据以及需要成员批准的事项。最后返回这次影子运行的摘要。`;
}

function runProcess(command, args, { cwd, environment, timeoutMs, signal }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: environment, signal, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdout = appendBounded(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = appendBounded(stderr, chunk); });
    child.on('error', (error) => {
      clearTimeout(timer);
      if (error.name === 'AbortError') resolve({ exitCode: 1, stdout, stderr, timedOut });
      else reject(error);
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode: exitCode ?? 1, stdout, stderr, timedOut });
    });
  });
}

function appendBounded(current, chunk) {
  const next = current + chunk.toString('utf8');
  return next.length > maxCapturedBytes ? next.slice(-maxCapturedBytes) : next;
}

function cleanError(value) {
  const lines = String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const dshError = [...lines].reverse().find((line) => /^dsh:\s*(?!reasoning:)/i.test(line));
  return (dshError || 'DSH 进程未返回可公开的错误信息').slice(-4000);
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DshRunError('DSH_ABORTED', 'DSH 运行已取消'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DshRunError('DSH_ABORTED', 'DSH 运行已取消'));
    }, { once: true });
  });
}
