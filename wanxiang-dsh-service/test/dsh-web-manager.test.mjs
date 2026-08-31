import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DshWebManager } from '../src/dsh-web-manager.mjs';

test('prepares a DSH workspace from the confirmed discovery brief', async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'wanxiang-dsh-web-'));
  try {
    const manager = new DshWebManager({ workspaceRoot });
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
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
