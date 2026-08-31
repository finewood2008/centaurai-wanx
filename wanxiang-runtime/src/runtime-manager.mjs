import { spawn } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { WanxiangRuntimeError } from './runtime-error.mjs';

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = path.resolve(serviceRoot, '..');
const defaultDataRoot = path.join(projectRoot, '.wanxiang-runtime');
const require = createRequire(import.meta.url);
const runtimePackageRoot = path.dirname(require.resolve('@deepseek-ai/dsh/package.json'));
const maxOutputBytes = 256 * 1024;

export class WanxiangRuntimeManager {
  constructor(options = {}) {
    this.dataRoot = path.resolve(options.dataRoot || process.env.WANXIANG_DATA_ROOT || defaultDataRoot);
    this.cliPath = path.resolve(options.cliPath || process.env.WANXIANG_RUNTIME_CLI || path.join(runtimePackageRoot, 'lib', 'bin.js'));
    this.workspaceRoot = path.resolve(options.workspaceRoot || process.env.WANXIANG_WORKSPACE_ROOT || path.join(this.dataRoot, 'workspaces'));
    this.runtimeHome = path.resolve(options.runtimeHome || process.env.WANXIANG_RUNTIME_HOME || path.join(this.dataRoot, 'engine'));
    this.bundlePatch = path.resolve(options.bundlePatch || process.env.WANXIANG_WORKBENCH_PATCH || path.join(projectRoot, 'wanxiang-workbench', 'cordis.patch.yml'));
    this.bundleEntry = path.resolve(options.bundleEntry || process.env.WANXIANG_WORKBENCH_ENTRY || path.join(projectRoot, 'wanxiang-workbench', 'src', 'policy.mjs'));
    this.runtimePatch = path.join(this.dataRoot, 'wanxiang.patch.yml');
    this.port = Number(options.port || process.env.WANXIANG_PORT || 3000);
    this.environment = {
      ...(options.environment || process.env),
      DSH_HOME: this.runtimeHome,
      DSH_CLIENT_TITLE: '万象',
      DSH_TELEMETRY_DISABLED: '1',
    };
    this.startTimeoutMs = Number(options.startTimeoutMs || process.env.WANXIANG_START_TIMEOUT_MS || 90_000);
    this.running = null;
    this.starting = null;
  }

  async launch({ projectId, projectName, task, discovery }) {
    validateProjectId(projectId);
    await this.prepareWorkspace({ projectId, projectName, task, discovery });

    if (this.running?.child.exitCode === null) {
      if (this.running.projectId === projectId) {
        return { url: this.running.url, port: this.port, reused: true };
      }
      await this.stop();
    }
    if (this.starting) return this.starting;

    this.starting = this.start(projectId).finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  async prepareWorkspace({ projectId, projectName, task, discovery }) {
    validateProjectId(projectId);
    const workspace = workspaceFor(this.workspaceRoot, projectId);
    const artifactRoot = path.join(workspace, '.wanxiang');
    await mkdir(artifactRoot, { recursive: true });

    const draft = discovery && typeof discovery === 'object' ? discovery : {};
    const brief = renderBrief(projectName, task, draft);
    const dataContract = {
      status: 'sample-contract-only',
      connected: false,
      sources: [
        { id: 'customers', mode: 'read', fields: ['status', 'owner', 'lastFollowUpAt'] },
        { id: 'communications', mode: 'read', windowDays: 180, fields: ['summary', 'purchaseIntent'] },
      ],
      restrictions: ['no external writes', 'no messages', 'no credential access'],
    };

    await Promise.all([
      writeIfMissing(path.join(artifactRoot, 'work-brief.md'), brief),
      writeIfMissing(path.join(artifactRoot, 'data-contract.json'), `${JSON.stringify(dataContract, null, 2)}\n`),
      writeIfMissing(path.join(workspace, 'AGENTS.md'), renderWorkspaceInstructions()),
    ]);
    return workspace;
  }

  async start(projectId) {
    await Promise.all([access(this.cliPath), access(this.bundlePatch), access(this.bundleEntry)]).catch((error) => {
      throw new WanxiangRuntimeError('WANXIANG_RUNTIME_MISSING', '找不到万象运行时或工作台 Bundle', String(error));
    });
    await this.prepareRuntimePatch();

    const workspace = workspaceFor(this.workspaceRoot, projectId);
    const args = [
      this.cliPath,
      '--profile', 'web',
      '--patch', this.runtimePatch,
      '--no-open',
      '--port', String(this.port),
      '--trusted-host', `localhost:${String(this.port)}`,
    ];
    const child = spawn(process.execPath, args, {
      cwd: workspace,
      env: this.environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    const append = (chunk) => {
      output = `${output}${String(chunk)}`;
      if (output.length > maxOutputBytes) output = output.slice(-maxOutputBytes);
    };

    try {
      const url = await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          callback(value);
        };
        const inspect = (chunk) => {
          append(chunk);
          const match = /dsh web: (http:\/\/[^\s]+)/u.exec(output);
          if (match?.[1]) finish(resolve, match[1]);
        };
        const timer = setTimeout(() => {
          finish(reject, new WanxiangRuntimeError('WANXIANG_RUNTIME_TIMEOUT', '万象工作台启动超时', redact(output)));
        }, this.startTimeoutMs);
        child.stdout.on('data', inspect);
        child.stderr.on('data', inspect);
        child.once('error', (error) => {
          finish(reject, new WanxiangRuntimeError('WANXIANG_RUNTIME_FAILED', '万象工作台无法启动', String(error)));
        });
        child.once('exit', (code) => {
          finish(reject, new WanxiangRuntimeError('WANXIANG_RUNTIME_FAILED', `万象工作台启动失败（${String(code)}）`, redact(output)));
        });
      });

      const browserUrl = new URL(url);
      browserUrl.hostname = 'localhost';
      this.running = { child, url: browserUrl.href, output: () => output, projectId };
      child.once('exit', () => {
        if (this.running?.child === child) this.running = null;
      });
      return { url: browserUrl.href, port: this.port, reused: false };
    } catch (error) {
      if (child.exitCode === null) child.kill('SIGTERM');
      throw error;
    }
  }

  async stop() {
    const running = this.running;
    this.running = null;
    if (!running || running.child.exitCode !== null) return;
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (running.child.exitCode === null) running.child.kill('SIGKILL');
      }, 5_000);
      running.child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      running.child.kill('SIGTERM');
    });
  }

  async prepareRuntimePatch() {
    await mkdir(this.dataRoot, { recursive: true });
    const template = await readFile(this.bundlePatch, 'utf8');
    const rendered = template.replace('__WANXIANG_POLICY_PATH__', quoteYaml(this.bundleEntry));
    if (rendered === template) {
      throw new WanxiangRuntimeError('WANXIANG_PATCH_INVALID', '万象工作台配置缺少运行时入口占位符');
    }
    await writeFile(this.runtimePatch, rendered, 'utf8');
  }
}

function workspaceFor(root, projectId) {
  const workspace = path.resolve(root, projectId);
  if (!workspace.startsWith(`${root}${path.sep}`)) throw new WanxiangRuntimeError('INVALID_PROJECT', '项目工作区越界');
  return workspace;
}

function validateProjectId(projectId) {
  if (typeof projectId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(projectId)) {
    throw new WanxiangRuntimeError('INVALID_PROJECT', '项目 ID 只能包含字母、数字、下划线和连字符');
  }
}

function renderBrief(projectName, task, draft) {
  const rows = [
    ['真实任务与目标', draft.goal || task],
    ['输入与资料', draft.inputs],
    ['判断规则', draft.rules],
    ['交付结果', draft.output],
    ['边界与风险', draft.boundaries],
    ['验收标准', draft.success],
  ];
  const value = (item) => Array.isArray(item) ? item.join('、') : String(item || '待在万象需求发现中继续确认');
  return `# ${projectName || '未命名项目'} · 已确认工作简报\n\n${rows.map(([label, item]) => `## ${label}\n\n${value(item)}`).join('\n\n')}\n`;
}

function renderWorkspaceInstructions() {
  return `# 万象 Builder 工作区\n\n- 先阅读 \`.wanxiang/work-brief.md\` 和 \`.wanxiang/data-contract.json\`。\n- 构建与验证是同一个循环：每次实现后立即运行代表性案例和边界案例，再根据证据修正。\n- 只在当前工作区内读写；产物必须可读、可审查、可版本化。\n- 当前 Data Agent 仅有示例契约。不得声称已连接真实数据，不得访问真实凭证或执行外部写操作。\n- 高风险动作必须先预览并获得用户明确批准。\n- 用普通人能理解的语言解释当前判断、证据、风险和下一步。\n`;
}

function redact(output) {
  return String(output || '').replace(/([?&]token=)[^\s)]+/gu, '$1<redacted>').slice(-8_000);
}

async function writeIfMissing(file, contents) {
  await writeFile(file, contents, { encoding: 'utf8', flag: 'wx' }).catch((error) => {
    if (error?.code !== 'EEXIST') throw error;
  });
}

function quoteYaml(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
