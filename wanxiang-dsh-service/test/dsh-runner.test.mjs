import assert from 'node:assert/strict';
import { mkdtemp, realpath, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DshRunner, DshRunError } from '../src/dsh-runner.mjs';

test('runs a DSH-compatible CLI inside the project workspace', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wanxiang-dsh-test-'));
  const cli = path.join(root, 'fake-dsh.mjs');
  await writeFile(cli, `import { mkdirSync, writeFileSync } from 'node:fs'; import path from 'node:path'; if (process.argv.includes('--version')) console.log('test-dsh'); else { const prompt = process.argv.at(-1); const root = path.join(process.cwd(), '.wanxiang'); mkdirSync(root, { recursive: true }); for (const file of ['work-brief.md', 'data-contract.json', 'workflow.json', 'evals.json']) writeFileSync(path.join(root, file), '{}'); console.log(JSON.stringify({ cwd: process.cwd(), prompt })); }`);
  const runner = new DshRunner({ cliPath: cli, workspaceRoot: path.join(root, 'workspaces'), timeoutMs: 2_000 });

  assert.equal((await runner.status()).version, 'test-dsh');
  const result = await runner.run({ projectId: 'project-1', projectName: '测试项目', task: '整理周报', action: 'build' });
  const output = JSON.parse(result.output);
  assert.equal(await realpath(output.cwd), await realpath(path.join(root, 'workspaces', 'project-1')));
  assert.match(output.prompt, /整理周报/);
  assert.match(output.prompt, /work-brief\.md/);
  assert.deepEqual(result.evidence.files, ['.wanxiang/work-brief.md', '.wanxiang/data-contract.json', '.wanxiang/workflow.json', '.wanxiang/evals.json']);
});

test('rejects a workspace traversal project id', async () => {
  const runner = new DshRunner({ cliPath: '/tmp/unused', workspaceRoot: '/tmp/wanxiang' });
  await assert.rejects(
    runner.run({ projectId: '../outside', projectName: '测试', task: '测试', action: 'build' }),
    (error) => error instanceof DshRunError && error.code === 'INVALID_PROJECT',
  );
});
