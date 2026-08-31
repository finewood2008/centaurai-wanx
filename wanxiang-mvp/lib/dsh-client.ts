const serviceUrl = process.env.NEXT_PUBLIC_WANXIANG_DSH_URL || 'http://127.0.0.1:4317';

export type DshStatus = {
  ok: true;
  runtime: 'dsh';
  version: string;
  profile: string;
};

export type DshResult = {
  ok: true;
  runId: string;
  action: 'discover' | 'build' | 'evaluate' | 'run';
  output: string;
  durationMs: number;
  workspace: string;
  runtime: 'dsh';
  evidence: { files: string[]; evaluationPassed?: boolean; discovery?: DiscoveryTurn };
  events: Array<{ type: string; attempt: number; at: string; retryInSeconds?: number }>;
};

export type DshWebLaunch = {
  ok: true;
  runtime: 'dsh-web';
  url: string;
  port: number;
  reused: boolean;
};

export type DiscoverySlot = 'goal' | 'inputs' | 'rules' | 'output' | 'boundaries' | 'success';
export type DiscoveryDraft = Partial<Record<DiscoverySlot, string | string[]>>;
export type DiscoveryMessage = { role: 'user' | 'assistant'; content: string };
export type DiscoveryAsk = {
  slot: DiscoverySlot;
  type: 'single' | 'multi';
  allowCustom: boolean;
  options: Array<{ label: string; description?: string; value: string }>;
};
export type DiscoveryTurn = {
  reply: string;
  question: string | null;
  ask: DiscoveryAsk | null;
  done: boolean;
  draft: DiscoveryDraft;
};

export class DshApiError extends Error {
  code: string;
  details: string;

  constructor(code: string, message: string, details = '') {
    super(message);
    this.name = 'DshApiError';
    this.code = code;
    this.details = details;
  }
}

export async function getDshStatus(): Promise<DshStatus> {
  return request<DshStatus>('/api/dsh/health');
}

export async function runDsh(input: {
  projectId: string;
  projectName: string;
  task: string;
  action: DshResult['action'];
  discovery?: {
    messages: DiscoveryMessage[];
    draft: DiscoveryDraft;
    answered: { slot: DiscoverySlot; value: string | string[] } | null;
  };
}): Promise<DshResult> {
  return request<DshResult>('/api/dsh/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function launchDshWeb(input: {
  projectId: string;
  projectName: string;
  task: string;
  discovery: DiscoveryDraft;
}): Promise<DshWebLaunch> {
  return request<DshWebLaunch>('/api/dsh/web/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${serviceUrl}${path}`, init);
  } catch {
    throw new DshApiError('DSH_SERVICE_OFFLINE', '无法连接万象 DSH 服务');
  }

  const body = await response.json().catch(() => ({})) as { code?: string; message?: string; details?: string };
  if (!response.ok) {
    throw new DshApiError(body.code || 'DSH_REQUEST_FAILED', body.message || 'DSH 请求失败', body.details || '');
  }
  return body as T;
}
