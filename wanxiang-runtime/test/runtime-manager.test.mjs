import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { WanxiangRuntimeManager } from '../src/runtime-manager.mjs';

test('prepares a Wanxiang workspace from the confirmed discovery brief', async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'wanxiang-workbench-'));
  try {
    const manager = new WanxiangRuntimeManager({ workspaceRoot });
    await manager.prepareWorkspace({
      projectId: 'weekly-followup',
      projectName: '客户跟进简报',
      task: '整理本周客户清单',
      discovery: {
        goal: '减少漏跟进',
        inputs: ['客户表', '沟通记录'],
        boundaries: '不发送消息',
      },
    });

    const root = path.join(workspaceRoot, 'weekly-followup');
    const brief = await readFile(path.join(root, '.wanxiang', 'work-brief.md'), 'utf8');
    const contract = JSON.parse(await readFile(path.join(root, '.wanxiang', 'data-contract.json'), 'utf8'));
    const instructions = await readFile(path.join(root, 'AGENTS.md'), 'utf8');

    assert.match(brief, /减少漏跟进/);
    assert.match(brief, /客户表、沟通记录/);
    assert.equal(contract.connected, false);
    assert.match(instructions, /构建与验证是同一个循环/);

    await writeFile(path.join(root, '.wanxiang', 'work-brief.md'), '# 已由万象确认\n', 'utf8');
    await manager.prepareWorkspace({
      projectId: 'weekly-followup',
      projectName: '不应覆盖',
      task: '不应覆盖',
      discovery: {},
    });
    assert.equal(await readFile(path.join(root, '.wanxiang', 'work-brief.md'), 'utf8'), '# 已由万象确认\n');
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test('isolates the runtime home and renders the Wanxiang product patch', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'wanxiang-runtime-'));
  try {
    const manager = new WanxiangRuntimeManager({
      dataRoot,
      environment: { DSH_HOME: '/tmp/foreign-profile' },
    });

    assert.equal(manager.environment.DSH_HOME, path.join(dataRoot, 'engine'));
    await manager.prepareRuntimePatch();
    const patch = await readFile(path.join(dataRoot, 'wanxiang.patch.yml'), 'utf8');
    assert.match(patch, /includeHarnessIdentity: false/);
    assert.match(patch, /ui-agent-preset/);
    assert.match(patch, /wanxiang-workbench\/src\/policy\.mjs/);
    assert.doesNotMatch(patch, /__WANXIANG_POLICY_PATH__/);
  } finally {
    await rm(dataRoot, { recursive: true, force: true });
  }
});

test('rejects a workspace traversal project id', async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'wanxiang-traversal-'));
  try {
    const manager = new WanxiangRuntimeManager({ workspaceRoot });
    await assert.rejects(
      manager.prepareWorkspace({ projectId: '../outside', projectName: 'bad', task: 'bad' }),
      /项目 ID/,
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
