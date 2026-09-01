import { WanxiangRuntimeManager } from './runtime-manager.mjs';

const manager = new WanxiangRuntimeManager();

try {
  const result = await manager.launch();
  console.log(`万象已启动，请使用完整本地认证地址：${result.url}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void manager.stop().finally(() => process.exit(signal === 'SIGINT' ? 130 : 0));
  });
}
