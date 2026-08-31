import { WanxiangRuntimeManager } from './runtime-manager.mjs';

const manager = new WanxiangRuntimeManager();

try {
  const result = await manager.launch({
    projectId: process.env.WANXIANG_PROJECT_ID || 'wanxiang-workbench',
    projectName: process.env.WANXIANG_PROJECT_NAME || '我的工作 Agent',
    task: '通过需求发现明确一项真实工作，并在同一工作台中完成构建与验证。',
    discovery: {},
  });
  console.log(`万象已启动：${result.url}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void manager.stop().finally(() => process.exit(signal === 'SIGINT' ? 130 : 0));
  });
}
