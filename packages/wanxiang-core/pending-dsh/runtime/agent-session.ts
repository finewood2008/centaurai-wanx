import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

/**
 * 会话工厂：万象的每条会话都从这里出生或复活。
 *
 * 「当前是哪个助手」不是全局状态——它是建会话那一刻写进 header 的两个显式
 * 参数：`agentPreset`（人格与工具集）和 `cwd`（它睁眼看见的世界，也是沙箱
 * 边界）。此后不可变；恢复历史会话时从它自己的 header 读回来，绝不用
 * 「当前默认」——换了 preset 的历史是模型没法继续演的历史。
 */

/** 会话 id 的语义前缀：万象定时/任务跑建的会话带它，与 SPA 会话区分。 */
export const RUN_PREFIX = "wanx-run-";

export type SessionKind = "run" | "chat";

export interface AgentHold {
  agent: any;
  /** 必须 await：它停掉驱动循环、等它退出、从 registry 摘除、卸掉 scope。 */
  dispose: () => Promise<void>;
}

function newSessionId(_kind: SessionKind, slug: string): string {
  return `${RUN_PREFIX}${slug}-${randomUUID()}`;
}

/**
 * 建一条挂在指定助手上的全新会话。
 *
 * @param cwd 应用自己的 workspace——工具的根、技能发现的项目根、沙箱的
 *   写边界，三者由这一个值决定。调用方传 workspaceDir(APPS_DIR, slug)。
 */
export async function createSession(
  ctx: any,
  opts: { slug: string; kind: SessionKind; cwd: string },
): Promise<AgentHold> {
  const { installModelSelection } = await import("@deepseek-ai/dsh-agent");
  const { SessionId } = await import("@deepseek-ai/dsh-session");
  const selection = ctx.get("agentDefaultModel").currentSelection();
  mkdirSync(opts.cwd, { recursive: true });

  const created = await ctx.get("agents").create({
    sessionId: SessionId(newSessionId(opts.kind, opts.slug)),
    meta: { cwd: opts.cwd, agentPreset: opts.slug },
    agentOptions: { provider: selection.provider, model: selection.model },
    setup: async (agentCtx: any) => {
      installModelSelection(agentCtx, { current: selection, assembled: undefined });
      await ctx.get("agentPresets").mount(agentCtx, opts.slug);
    },
  });
  return { agent: created.agent, dispose: () => created.dispose() };
}
