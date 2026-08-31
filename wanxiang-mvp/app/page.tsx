'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Database,
  Eye,
  FileCheck2,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  PlayCircle,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  WandSparkles,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  DshApiError,
  getDshStatus,
  launchDshWeb,
  runDsh,
  type DiscoveryAsk,
  type DiscoveryDraft,
  type DiscoveryMessage,
  type DiscoverySlot,
  type DshResult,
} from '@/lib/dsh-client';

const stages = [
  { label: '发现', detail: '需求对话' },
  { label: '定义', detail: '工作与数据' },
  { label: '构建验证', detail: 'DSH 内闭环' },
  { label: '使用', detail: 'DSH 工作会话' },
];

const discoveryFields: Array<{ slot: DiscoverySlot; label: string }> = [
  { slot: 'goal', label: '真实任务与目标' },
  { slot: 'inputs', label: '输入与资料' },
  { slot: 'rules', label: '判断规则' },
  { slot: 'output', label: '交付结果' },
  { slot: 'boundaries', label: '边界与风险' },
  { slot: 'success', label: '验收标准' },
];

const defaultTask =
  '每周一我要从客户表里找出 14 天没有跟进、但最近有明确采购意向的客户，再结合上次沟通记录，为每位销售整理一份本周优先跟进清单。';

const storageKey = 'wanxiang-prototype-v5';

type ViewId = 'builder' | 'runs' | 'data' | 'approvals' | 'settings';
type ModalId = 'manual' | 'profile' | 'principles' | 'projects' | 'new-agent' | 'permissions' | 'reset' | 'run-detail' | 'dsh-result' | null;
type RunRecord = { id: number; kind: string; time: string; result: string; detail: string };
type CommunityMessage = { id: number; author: string; text: string; mine?: boolean; kind?: '咨询' | '反馈' };
type DiscoveryUiMessage = DiscoveryMessage & { id: number };

const initialRuns: RunRecord[] = [];

const initialCommunityMessages: CommunityMessage[] = [
  { id: 1, author: '万象社群', text: '这里可以咨询构建问题或提交产品反馈。社群是独立支持服务，不参与 Agent 的阶段解锁和发布判断。' },
];
const initialDiscoveryMessages: DiscoveryUiMessage[] = [
  { id: 1, role: 'assistant', content: '先别想要做什么产品。请说一件你最近亲手完成、而且以后还会重复发生的工作。我会一次只追问一个问题，把需求逐步整理清楚。' },
];

function formatDiscoveryValue(value: string | string[]) {
  return Array.isArray(value) ? value.join('；') : value;
}

function discoveryDraftToTask(draft: DiscoveryDraft) {
  return discoveryFields
    .filter(({ slot }) => draft[slot])
    .map(({ slot, label }) => `${label}：${formatDiscoveryValue(draft[slot]!)}`)
    .join('\n');
}

export default function Home() {
  const [projectId, setProjectId] = useState('customer-followup');
  const [projectName, setProjectName] = useState('客户跟进简报');
  const [task, setTask] = useState(defaultTask);
  const [briefReady, setBriefReady] = useState(false);
  const [briefConfirmed, setBriefConfirmed] = useState(false);
  const [discoveryMessages, setDiscoveryMessages] = useState<DiscoveryUiMessage[]>(initialDiscoveryMessages);
  const [discoveryDraft, setDiscoveryDraft] = useState<DiscoveryDraft>({});
  const [discoveryAsk, setDiscoveryAsk] = useState<DiscoveryAsk | null>(null);
  const [discoveryQuestion, setDiscoveryQuestion] = useState<string | null>(null);
  const [dataConnected, setDataConnected] = useState(false);
  const [agentBuilt, setAgentBuilt] = useState(false);
  const [evaluationRun, setEvaluationRun] = useState(false);
  const [shadowRuns, setShadowRuns] = useState(0);
  const [published, setPublished] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [activeView, setActiveView] = useState<ViewId>('builder');
  const [modal, setModal] = useState<ModalId>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [runs, setRuns] = useState<RunRecord[]>(initialRuns);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>(initialCommunityMessages);
  const [communityDraft, setCommunityDraft] = useState('');
  const [communityMode, setCommunityMode] = useState<'咨询' | '反馈'>('咨询');
  const [newAgentName, setNewAgentName] = useState('新的工作 Agent');
  const [newAgentTask, setNewAgentTask] = useState('');
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);
  const [lastDshResult, setLastDshResult] = useState<DshResult | null>(null);
  const [pendingShadowRunId, setPendingShadowRunId] = useState<number | null>(null);
  const [dshState, setDshState] = useState<{ status: 'checking' | 'ready' | 'offline'; version?: string; message?: string }>({ status: 'checking' });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    queueMicrotask(() => {
      if (saved) {
        try {
          const state = JSON.parse(saved);
          setProjectId(state.projectId ?? 'customer-followup');
          setProjectName(state.projectName ?? '客户跟进简报');
          setTask(state.task ?? defaultTask);
          setBriefReady(Boolean(state.briefReady || state.briefSubmitted || state.briefConfirmed));
          setBriefConfirmed(Boolean(state.briefConfirmed ?? state.briefSubmitted));
          setDiscoveryMessages(Array.isArray(state.discoveryMessages) ? state.discoveryMessages : initialDiscoveryMessages);
          setDiscoveryDraft(state.discoveryDraft && typeof state.discoveryDraft === 'object' ? state.discoveryDraft : {});
          setDiscoveryAsk(state.discoveryAsk ?? null);
          setDiscoveryQuestion(typeof state.discoveryQuestion === 'string' ? state.discoveryQuestion : null);
          setDataConnected(Boolean(state.dataConnected));
          setAgentBuilt(Boolean(state.agentBuilt));
          setEvaluationRun(Boolean(state.evaluationRun));
          setShadowRuns(Number(state.shadowRuns) || 0);
          setPublished(Boolean(state.published));
          setActiveStage(Math.min(Number(state.activeStage) || 0, 1));
          setRuns(Array.isArray(state.runs) ? state.runs : initialRuns);
          setCommunityMessages(Array.isArray(state.communityMessages) ? state.communityMessages : initialCommunityMessages);
          setLastDshResult(state.lastDshResult ?? null);
          setPendingShadowRunId(typeof state.pendingShadowRunId === 'number' ? state.pendingShadowRunId : null);
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    getDshStatus()
      .then((status) => setDshState({ status: 'ready', version: status.version }))
      .catch((error) => setDshState({ status: 'offline', message: error instanceof Error ? error.message : 'DSH 服务不可用' }));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify({
      projectId,
      projectName,
      task,
      briefReady,
      briefConfirmed,
      discoveryMessages,
      discoveryDraft,
      discoveryAsk,
      discoveryQuestion,
      dataConnected,
      agentBuilt,
      evaluationRun,
      shadowRuns,
      published,
      activeStage,
      runs,
      communityMessages,
      lastDshResult,
      pendingShadowRunId,
    }));
  }, [hydrated, projectId, projectName, task, briefReady, briefConfirmed, discoveryMessages, discoveryDraft, discoveryAsk, discoveryQuestion, dataConnected, agentBuilt, evaluationRun, shadowRuns, published, activeStage, runs, communityMessages, lastDshResult, pendingShadowRunId]);

  const unlockedStage = briefConfirmed ? 1 : 0;
  const evidenceCount =
    Number(briefConfirmed) +
    Number(dataConnected) +
    Number(evaluationRun) +
    Number(shadowRuns >= 3);
  const progress = briefConfirmed ? 50 : briefReady ? 25 : 10;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  function completeAfter(key: string, message: string, action: () => void) {
    if (pendingAction) return;
    setPendingAction(key);
    window.setTimeout(() => {
      action();
      setPendingAction(null);
      notify(message);
    }, 650);
  }

  function resetProgress(nextName = projectName, nextTask = task, nextProjectId = projectId) {
    setProjectId(nextProjectId);
    setProjectName(nextName);
    setTask(nextTask);
    setBriefReady(false);
    setBriefConfirmed(false);
    setDiscoveryMessages(initialDiscoveryMessages);
    setDiscoveryDraft({});
    setDiscoveryAsk(null);
    setDiscoveryQuestion(null);
    setDataConnected(false);
    setAgentBuilt(false);
    setEvaluationRun(false);
    setShadowRuns(0);
    setPublished(false);
    setActiveStage(0);
    setActiveView('builder');
    setRuns([]);
    setLastDshResult(null);
    setPendingShadowRunId(null);
  }

  function createAgent() {
    const name = newAgentName.trim();
    const realTask = newAgentTask.trim();
    if (!name || !realTask) {
      notify('请填写 Agent 名称和一项真实任务。');
      return;
    }
    resetProgress(name, realTask, `project-${Date.now()}`);
    setModal(null);
    setNewAgentName('新的工作 Agent');
    setNewAgentTask('');
    notify('新项目已创建，从发现阶段开始。');
  }

  function sendCommunityMessage() {
    const text = communityDraft.trim();
    if (!text) return;
    setCommunityMessages((current) => [...current, { id: Date.now(), author: '我', text, mine: true, kind: communityMode }]);
    setCommunityDraft('');
    notify(`${communityMode}已记录。正式版接入社群服务后会在这里同步回复。`);
  }

  async function continueDiscovery(answered: { slot: DiscoverySlot; value: string | string[] }, shown: string) {
    if (pendingAction) return;
    const userMessage: DiscoveryUiMessage = { id: Date.now(), role: 'user', content: shown };
    const nextMessages = [...discoveryMessages, userMessage];
    setDiscoveryMessages(nextMessages);
    setPendingAction('discover');

    if (briefReady || briefConfirmed || dataConnected || agentBuilt || evaluationRun || shadowRuns > 0 || published) {
      setBriefReady(false);
      setBriefConfirmed(false);
      setDataConnected(false);
      setAgentBuilt(false);
      setEvaluationRun(false);
      setShadowRuns(0);
      setPublished(false);
      setActiveStage(0);
      setRuns([]);
      setLastDshResult(null);
      setPendingShadowRunId(null);
    }

    try {
      const result = await runDsh({
        projectId,
        projectName,
        task: answered.slot === 'goal' ? formatDiscoveryValue(answered.value) : task,
        action: 'discover',
        discovery: {
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          draft: discoveryDraft,
          answered,
        },
      });
      const turn = result.evidence.discovery;
      if (!turn) throw new DshApiError('DSH_DISCOVERY_INVALID', 'DSH 没有返回有效的发现结果');
      setLastDshResult(result);
      setDshState((current) => ({ ...current, status: 'ready' }));
      setDiscoveryDraft(turn.draft);
      setDiscoveryAsk(turn.ask);
      setDiscoveryQuestion(turn.question);
      setDiscoveryMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', content: turn.reply }]);
      if (answered.slot === 'goal') setTask(formatDiscoveryValue(answered.value));
      if (turn.done) {
        setBriefReady(true);
        notify('需求访谈已完成，请通读工作简报并确认。');
      }
    } catch (error) {
      const failure = error instanceof DshApiError ? error : new DshApiError('DSH_DISCOVERY_FAILED', '需求访谈失败');
      setDiscoveryMessages((current) => current.filter((message) => message.id !== userMessage.id));
      if (failure.code === 'DSH_SERVICE_OFFLINE') setDshState({ status: 'offline', message: failure.message });
      notify(`${failure.message}，请重试。`);
    } finally {
      setPendingAction(null);
    }
  }

  async function executeDsh(action: DshResult['action'], pendingKey: string, onSuccess: (result: DshResult) => void) {
    if (pendingAction) return;
    setPendingAction(pendingKey);
    try {
      const result = await runDsh({ projectId, projectName, task, action });
      setLastDshResult(result);
      setDshState((current) => ({ ...current, status: 'ready' }));
      onSuccess(result);
    } catch (error) {
      const failure = error instanceof DshApiError ? error : new DshApiError('DSH_REQUEST_FAILED', 'DSH 请求失败');
      if (failure.code === 'DSH_SERVICE_OFFLINE') setDshState({ status: 'offline', message: failure.message });
      const failedRun = { id: Date.now(), kind: `DSH ${action}`, time: '刚刚', result: '失败', detail: `${failure.message}${failure.details ? `：${failure.details}` : ''}` };
      setRuns([failedRun, ...runs]);
      notify(`${failure.message}。请查看运行记录。`);
    } finally {
      setPendingAction(null);
    }
  }

  function startOfficialRun() {
    void executeDsh('run', 'official-run', (result) => {
      setRuns((current) => [{
        id: Date.now(),
        kind: 'DSH 运行演练',
        time: '刚刚',
        result: '等待成员批准',
        detail: result.output,
      }, ...current]);
      setActiveView('runs');
      notify('DSH 运行演练完成，结果已进入运行记录。');
    });
  }

  async function openDshWorkspace() {
    if (pendingAction) return;
    if (!briefConfirmed) {
      notify('请先完成需求访谈并确认工作简报。');
      return;
    }
    setPendingAction('launch-dsh');
    setDataConnected(true);
    try {
      const launch = await launchDshWeb({
        projectId,
        projectName,
        task: discoveryDraftToTask(discoveryDraft),
        discovery: discoveryDraft,
      });
      window.location.assign(launch.url);
    } catch (error) {
      const failure = error instanceof DshApiError ? error : new DshApiError('DSH_WEB_FAILED', 'DSH 工作台启动失败');
      if (failure.code === 'DSH_SERVICE_OFFLINE') setDshState({ status: 'offline', message: failure.message });
      setDataConnected(false);
      notify(`${failure.message}。${failure.details ? '请查看本地服务日志。' : '请重试。'}`);
      setPendingAction(null);
    }
  }

  function openView(view: ViewId) {
    setActiveView(view);
    if (view === 'builder') setActiveStage(Math.min(activeStage, unlockedStage));
  }

  const modalContent: Record<Exclude<ModalId, null>, { title: string; body: ReactNode }> = {
    manual: {
      title: '万象学习手册',
      body: <div className="space-y-3 text-sm leading-6"><p>从真实工作开始，而不是从“想做一个什么应用”开始。</p>{stages.map((stage, index) => <button key={stage.label} onClick={() => { setModal(null); openView('builder'); if (index <= unlockedStage) setActiveStage(index); else notify(`“${stage.label}”尚未解锁，请先完成当前阶段。`); }} className="flex w-full items-center gap-3 rounded-xl border bg-background p-3 text-left hover:bg-muted"><span className="grid size-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{index + 1}</span><span><strong>{stage.label}</strong><span className="ml-2 text-muted-foreground">{stage.detail}</span></span></button>)}</div>,
    },
    profile: {
      title: '个人与原型状态',
      body: <div className="space-y-3 text-sm"><div className="flex items-center gap-3 rounded-xl border p-4"><div className="grid size-10 place-items-center rounded-full bg-[#d9c7a6] font-semibold text-[#3a3124]">林</div><div><p className="font-semibold">林同学</p><p className="text-muted-foreground">社群成员 · 第 1 期</p></div></div><p className="rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground">当前为前端交互原型。数据保存在本浏览器，尚未连接账号系统。</p><Button variant="outline" className="w-full" onClick={() => { setModal(null); setActiveView('settings'); }}>打开项目设置</Button></div>,
    },
    principles: {
      title: '万象产品原则',
      body: <div className="space-y-4 text-sm leading-6">{['从最近一次真实任务开始，不从功能清单开始。', '没有真实运行与验收证据，就不算完成。', '高风险动作必须由人批准，能力只按最小权限开放。', '成员不仅得到 Agent，也要逐渐学会维护自己的工作能力。'].map((item, index) => <div key={item} className="flex gap-3 rounded-xl border p-4"><span className="font-mono text-primary">0{index + 1}</span><p>{item}</p></div>)}</div>,
    },
    projects: {
      title: '选择工作 Agent',
      body: <div className="space-y-3"><button onClick={() => { setModal(null); openView('builder'); }} className="w-full rounded-xl border border-primary/30 bg-primary/[0.04] p-4 text-left"><div className="flex items-center justify-between"><span className="font-semibold">{projectName}</span><Badge>当前项目</Badge></div><p className="mt-1 text-xs text-muted-foreground">进度 {progress}% · {published ? 'v1.0.0' : 'Draft 0.1'}</p></button><Button variant="outline" className="w-full" onClick={() => setModal('new-agent')}><Plus /> 新建工作 Agent</Button></div>,
    },
    'new-agent': {
      title: '新建工作 Agent',
      body: <div className="space-y-4"><label htmlFor="new-agent-name" className="block text-sm font-semibold">Agent 名称</label><input id="new-agent-name" value={newAgentName} onChange={(event) => setNewAgentName(event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring/40" /><label htmlFor="new-agent-task" className="block text-sm font-semibold">最近一次真实任务</label><Textarea id="new-agent-task" value={newAgentTask} onChange={(event) => setNewAgentTask(event.target.value)} className="min-h-28 bg-background font-normal" placeholder="描述你实际收到的输入和需要交付的结果" /><Button className="w-full" onClick={createAgent}><Plus /> 创建并开始发现</Button></div>,
    },
    permissions: {
      title: '数据权限说明',
      body: <div className="space-y-3 text-sm">{[['客户与联系人', '读取客户状态、负责人和最近跟进时间'], ['沟通记录', '读取最近 180 天的沟通摘要与采购意向']].map(([name, detail]) => <div key={name} className="rounded-xl border p-4"><div className="flex items-center justify-between"><p className="font-semibold">{name}</p><Badge variant="outline">只读</Badge></div><p className="mt-2 text-xs text-muted-foreground">{detail}</p></div>)}<p className="rounded-xl bg-[#fff8e9] p-3 text-xs text-[#5f4a20]">原型不会访问真实数据，也不会保存任何凭证。</p></div>,
    },
    reset: {
      title: '重新开始当前项目？',
      body: <div className="space-y-4 text-sm"><p>这会清除当前构建进度、运行记录和发布状态，但保留项目名称与任务描述。</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(null)}>取消</Button><Button variant="destructive" onClick={() => { resetProgress(); setModal(null); notify('当前项目已重置。'); }}><RotateCcw /> 确认重置</Button></div></div>,
    },
    'run-detail': {
      title: selectedRun?.kind ?? '运行详情',
      body: selectedRun ? <div className="space-y-4 text-sm"><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">运行时间</p><p className="mt-1 font-semibold">{selectedRun.time}</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">结果</p><p className="mt-1 font-semibold text-primary">{selectedRun.result}</p></div></div><div className="whitespace-pre-wrap rounded-xl bg-muted p-4 leading-6">{selectedRun.detail}</div><p className="text-xs text-muted-foreground">{selectedRun.kind.startsWith('DSH') ? '这条记录来自真实 DSH Session；当前仍使用示例数据，尚未连接 Data Agent。' : '这是早期原型模拟记录，不代表真实 DSH 运行结果。'}</p></div> : <p>未选择运行记录。</p>,
    },
    'dsh-result': {
      title: 'DSH Runtime',
      body: <div className="space-y-4 text-sm"><div className="flex items-center justify-between rounded-xl border p-4"><div><p className="font-semibold">DeepSeek Harness</p><p className="mt-1 text-xs text-muted-foreground">Headless Profile · 服务端真实进程</p></div><Badge variant={dshState.status === 'ready' ? 'default' : 'secondary'}>{dshState.status === 'checking' ? '检查中' : dshState.status === 'ready' ? `v${dshState.version}` : '未连接'}</Badge></div>{lastDshResult ? <><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">最近动作</p><p className="mt-1 font-semibold">{lastDshResult.action}</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">实际耗时</p><p className="mt-1 font-semibold">{Math.round(lastDshResult.durationMs / 1000)} 秒</p></div></div><div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-[#18201f] p-4 text-xs leading-6 text-[#e8eee9]">{lastDshResult.output}</div><p className="break-all font-mono text-[10px] text-muted-foreground">Run ID: {lastDshResult.runId}</p></> : <p className="rounded-xl bg-muted p-4 text-muted-foreground">{dshState.status === 'offline' ? dshState.message : '尚未执行 DSH 构建。'}</p>}</div>,
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="font-heading text-xl leading-none">万象</p>
            <p className="mt-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Work agent builder
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setModal('dsh-result')} className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs sm:flex">
            <span className={`size-2 rounded-full ${dshState.status === 'ready' ? 'bg-primary' : dshState.status === 'checking' ? 'bg-[#d9b877]' : 'bg-destructive'}`} />
            {dshState.status === 'ready' ? `DSH ${dshState.version}` : dshState.status === 'checking' ? 'DSH 检查中' : 'DSH 未连接'}
          </button>
          <Button variant="ghost" size="sm" aria-label="新建工作 Agent" onClick={() => setModal('new-agent')}>
            <Plus /><span className="hidden sm:inline">新建</span>
          </Button>
          <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => setModal('manual')}>
            <BookOpen /> 学习手册
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCommunityOpen(true)}>
            <Users /> 社群支持
          </Button>
          <button
            className="ml-1 grid size-8 place-items-center rounded-full bg-[#d9c7a6] text-xs font-semibold text-[#3a3124]"
            aria-label="打开个人菜单"
            onClick={() => setModal('profile')}
          >
            林
          </button>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto border-b bg-card px-4 py-2 lg:hidden" aria-label="移动导航">
        <NavItem icon={LayoutDashboard} label="需求发现" active={activeView === 'builder'} onClick={() => openView('builder')} compact />
        <NavItem icon={MessageSquareText} label="社群" onClick={() => setCommunityOpen(true)} compact />
        <NavItem icon={BookOpen} label="手册" onClick={() => setModal('manual')} compact />
      </nav>

      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-r px-3 py-5 lg:block">
          <Button className="mb-6 w-full justify-start" size="lg" onClick={() => setModal('new-agent')}>
            <Plus /> 新建工作 Agent
          </Button>

          <nav aria-label="主导航" className="space-y-1">
            <NavItem icon={LayoutDashboard} label="需求发现与定义" active={activeView === 'builder'} onClick={() => openView('builder')} />
            <NavItem icon={Users} label="社群支持" onClick={() => setCommunityOpen(true)} />
          </nav>

          <p className="mb-2 mt-8 px-3 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            当前项目
          </p>
          <button className="w-full rounded-xl border bg-card p-3 text-left shadow-xs hover:bg-muted/40" onClick={() => setModal('projects')}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold">{projectName}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">销售运营 · Draft 0.1</p>
            <Progress value={progress} className="mt-3" />
          </button>

        </aside>

        <main className="min-w-0 px-4 py-6 md:px-8 md:py-8 xl:px-12">
          <div className="mx-auto max-w-6xl">
            {activeView === 'builder' ? <>
            <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                    {published ? '已发布' : `${stages[activeStage].label}阶段`}
                  </Badge>
                  <span className="text-xs text-muted-foreground">最后更新：刚刚</span>
                </div>
                <h1 className="font-heading text-3xl tracking-tight md:text-4xl">{projectName}</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  先把一项真实工作说清楚。万象会引导你把它逐步构建成可验证的工作 Agent；需要帮助时可随时打开社群支持。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setModal('principles')}>查看产品原则</Button>
                <Button
                  variant={briefConfirmed ? 'default' : 'secondary'}
                  disabled={pendingAction === 'launch-dsh'}
                  onClick={() => { void openDshWorkspace(); }}
                >
                  {pendingAction === 'launch-dsh' ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
                  {pendingAction === 'launch-dsh' ? '正在启动 DSH…' : '进入 DSH 工作台'}
                </Button>
              </div>
            </div>

            <section aria-labelledby="journey-title" className="mb-7 overflow-hidden rounded-2xl border bg-card shadow-xs">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <div>
                  <p id="journey-title" className="text-sm font-semibold">从真实任务到可靠运行</p>
                  <p className="text-xs text-muted-foreground">发现与定义在这里完成；构建、验证和后续使用都在 DSH 工作界面中进行。</p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{activeStage + 1} / 4</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4">
                {stages.map((stage, index) => (
                  <button
                    key={stage.label}
                    type="button"
                    aria-disabled={index > unlockedStage}
                    onClick={() => index > unlockedStage ? notify(`“${stage.label}”尚未解锁，请先完成当前阶段。`) : setActiveStage(index)}
                    className={`relative border-r p-4 text-left transition-colors last:border-r-0 ${
                      index === activeStage ? 'bg-primary/[0.055]' : 'hover:bg-muted/35'
                    } ${index > unlockedStage ? 'opacity-45' : ''}`}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className={`grid size-6 place-items-center rounded-full border font-mono text-[10px] ${
                          index <= unlockedStage
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {index < unlockedStage || published ? <Check className="size-3" /> : index + 1}
                      </span>
                      {index === activeStage && <CircleDot className="size-3.5 text-primary" />}
                      {index > unlockedStage && <LockKeyhole className="size-3 text-muted-foreground" />}
                    </div>
                    <p className="text-sm font-semibold">{stage.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{stage.detail}</p>
                  </button>
                ))}
              </div>
            </section>

            <StageWorkspace
              activeStage={activeStage}
              task={task}
              setTask={(value) => {
                setTask(value);
                setBriefReady(false);
                setBriefConfirmed(false);
                setDiscoveryMessages(initialDiscoveryMessages);
                setDiscoveryDraft({});
                setDiscoveryAsk(null);
                setDiscoveryQuestion(null);
                setDataConnected(false);
                setAgentBuilt(false);
                setEvaluationRun(false);
                setShadowRuns(0);
                setPublished(false);
                setRuns([]);
                setLastDshResult(null);
                setPendingShadowRunId(null);
              }}
              briefReady={briefReady}
              discoveryMessages={discoveryMessages}
              discoveryDraft={discoveryDraft}
              discoveryAsk={discoveryAsk}
              discoveryQuestion={discoveryQuestion}
              answerDiscovery={continueDiscovery}
              pendingAction={pendingAction}
              briefConfirmed={briefConfirmed}
              confirmBrief={() => {
                completeAfter('confirm-brief', '工作范围已确认，可以定义数据边界并进入 DSH。', () => {
                  setTask(discoveryDraftToTask(discoveryDraft));
                  setBriefConfirmed(true);
                  setActiveStage(1);
                });
              }}
              dataConnected={dataConnected}
              connectData={() => {
                void openDshWorkspace();
              }}
              agentBuilt={agentBuilt}
              buildAgent={() => {
                void executeDsh('build', 'build', (result) => {
                  setAgentBuilt(true);
                  setActiveStage(3);
                  setRuns((current) => [{ id: Date.now(), kind: 'DSH 构建', time: '刚刚', result: '通过', detail: result.output }, ...current]);
                  notify('DSH 已生成真实工作区产物，验证阶段已解锁。');
                });
              }}
              evaluationRun={evaluationRun}
              runEvaluation={() => {
                void executeDsh('evaluate', 'evaluate', (result) => {
                  const passed = result.evidence.evaluationPassed === true;
                  setEvaluationRun(passed);
                  setRuns((current) => [{ id: Date.now(), kind: 'DSH 案例评测', time: '刚刚', result: passed ? '通过' : '未通过', detail: result.output }, ...current]);
                  notify(passed ? 'DSH 工作区评测通过。' : 'DSH 评测未通过，请查看运行记录中的风险。');
                });
              }}
              shadowRuns={shadowRuns}
              shadowApprovalPending={pendingShadowRunId !== null}
              addShadowRun={() => {
                if (pendingShadowRunId !== null) {
                  setShadowRuns((current) => Math.min(3, current + 1));
                  setRuns((current) => current.map((run) => run.id === pendingShadowRunId ? { ...run, result: '成员已接受' } : run));
                  setPendingShadowRunId(null);
                  notify('本次 DSH 影子运行已由成员验收。');
                  return;
                }
                void executeDsh('run', 'shadow', (result) => {
                  const recordId = Date.now();
                  setRuns((current) => [{ id: recordId, kind: 'DSH 影子运行', time: '刚刚', result: '等待成员验收', detail: result.output }, ...current]);
                  setPendingShadowRunId(recordId);
                  notify('DSH 影子运行完成，请检查结果是否可接受。');
                });
              }}
              published={published}
              publish={() => completeAfter('publish', 'Agent v1 原型已发布，可以开始 DSH 运行演练。', () => setPublished(true))}
              startOfficialRun={startOfficialRun}
              dshState={dshState}
              lastDshResult={lastDshResult}
              openDshResult={() => setModal('dsh-result')}
              evidenceCount={evidenceCount}
            />
            </> : <AuxiliaryView
              view={activeView}
              projectName={projectName}
              setProjectName={setProjectName}
              dataConnected={dataConnected}
              connectData={() => briefConfirmed
                ? completeAfter('connect-data-view', '示例数据契约已确认。', () => setDataConnected(true))
                : notify('请先在工作台形成并确认工作简报。')}
              pendingAction={pendingAction}
              runs={runs}
              openRun={(run) => { setSelectedRun(run); setModal('run-detail'); }}
              published={published}
              startOfficialRun={startOfficialRun}
              openPermissions={() => setModal('permissions')}
              openReset={() => setModal('reset')}
              notify={notify}
            />}
          </div>
        </main>
      </div>
      <CommunityDrawer
        open={communityOpen}
        onOpenChange={setCommunityOpen}
        messages={communityMessages}
        draft={communityDraft}
        setDraft={setCommunityDraft}
        mode={communityMode}
        setMode={setCommunityMode}
        onSend={sendCommunityMessage}
      />
      {modal && <PrototypeModal title={modalContent[modal].title} onClose={() => setModal(null)}>{modalContent[modal].body}</PrototypeModal>}
      {toast && <output className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[#18201f] px-5 py-3 text-sm text-[#f4f1ea] shadow-xl">{toast}</output>}
    </div>
  );
}

type StageWorkspaceProps = {
  activeStage: number;
  task: string;
  setTask: (value: string) => void;
  briefReady: boolean;
  discoveryMessages: DiscoveryUiMessage[];
  discoveryDraft: DiscoveryDraft;
  discoveryAsk: DiscoveryAsk | null;
  discoveryQuestion: string | null;
  answerDiscovery: (answered: { slot: DiscoverySlot; value: string | string[] }, shown: string) => void;
  pendingAction: string | null;
  briefConfirmed: boolean;
  confirmBrief: () => void;
  dataConnected: boolean;
  connectData: () => void;
  agentBuilt: boolean;
  buildAgent: () => void;
  evaluationRun: boolean;
  runEvaluation: () => void;
  shadowRuns: number;
  shadowApprovalPending: boolean;
  addShadowRun: () => void;
  published: boolean;
  publish: () => void;
  startOfficialRun: () => void;
  dshState: { status: 'checking' | 'ready' | 'offline'; version?: string; message?: string };
  lastDshResult: DshResult | null;
  openDshResult: () => void;
  evidenceCount: number;
};

function StageWorkspace(props: StageWorkspaceProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <BuilderHeader stage={props.activeStage} />
        {props.activeStage === 0 && <DiscoveryStage {...props} />}
        {props.activeStage === 1 && <ModelStage {...props} />}
        {props.activeStage === 2 && <BuildStage {...props} />}
        {props.activeStage === 3 && <VerifyStage {...props} />}
        {props.activeStage === 4 && <ReleaseStage {...props} />}
      </section>

      <aside className="space-y-5">
        <button onClick={props.openDshResult} className="w-full rounded-2xl border bg-card p-5 text-left shadow-xs hover:bg-muted/35">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold">DSH Runtime</p><Badge variant={props.dshState.status === 'ready' ? 'default' : 'secondary'}>{props.dshState.status === 'ready' ? `v${props.dshState.version}` : props.dshState.status === 'checking' ? '检查中' : '未连接'}</Badge></div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{['discover', 'build', 'evaluate', 'shadow', 'official-run'].includes(props.pendingAction || '') ? '真实 Session 正在执行；额度受限时会自动等待并重试。' : props.lastDshResult ? `最近运行耗时 ${Math.round(props.lastDshResult.durationMs / 1000)} 秒，点击查看输出。` : '点击查看真实 DSH 服务状态。'}</p>
        </button>
        <BriefReviewCard
          briefReady={props.briefReady}
          briefConfirmed={props.briefConfirmed}
          draft={props.discoveryDraft}
          onConfirm={props.confirmBrief}
          pending={props.pendingAction === 'confirm-brief'}
        />
        <section className="rounded-2xl border bg-[#18201f] p-5 text-[#f4f1ea] shadow-xs">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-[#aab5b0] uppercase">项目原则</p>
          <p className="mt-3 font-heading text-xl leading-7">没有真实运行和验收，就没有完成。</p>
          <p className="mt-3 text-xs leading-5 text-[#bfc8c4]">万象不会用完成动画替代工作证据。</p>
        </section>
      </aside>
    </div>
  );
}

function BuilderHeader({ stage }: { stage: number }) {
  const descriptions = [
    '正在和你一起定义第一项真实工作',
    '正在确认工作、数据与风险边界',
    '将在 DSH 中边构建边验证',
    '将在 DSH 中持续运行与改进',
  ];
  return (
    <div className="flex items-center gap-3 border-b px-5 py-4">
      <div className="grid size-9 place-items-center rounded-xl bg-[#e9e1d2] text-[#5f4d34]">
        <Sparkles className="size-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">万象 Builder</h2>
        <p className="text-xs text-muted-foreground">{descriptions[stage]}</p>
      </div>
      <Badge variant="secondary" className="ml-auto">{stages[stage].label}阶段</Badge>
    </div>
  );
}

function BriefReviewCard({
  briefReady,
  briefConfirmed,
  draft,
  onConfirm,
  pending,
}: {
  briefReady: boolean;
  briefConfirmed: boolean;
  draft: DiscoveryDraft;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">工作范围</h2>
        <Badge variant={briefConfirmed ? 'default' : 'secondary'}>
          {briefConfirmed ? '已确认' : briefReady ? '待你确认' : '等待简报'}
        </Badge>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        {briefConfirmed ? '这份简报已成为后续建模和验收的工作依据。' : '请确认目标、输入、输出和边界准确；这一判断由你完成，不依赖社群服务。'}
      </p>
      <div className="mt-4 space-y-3 border-t pt-4">
        {discoveryFields.map(({ slot, label }) => (
          <div key={slot}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{label}</p>
              {draft[slot] && <Check className="size-3 text-primary" />}
            </div>
            <p className={`mt-1 text-xs leading-5 ${draft[slot] ? 'text-foreground' : 'text-muted-foreground/60'}`}>
              {draft[slot] ? formatDiscoveryValue(draft[slot]) : '还没聊到'}
            </p>
          </div>
        ))}
      </div>
      <Button
        variant={briefConfirmed ? 'secondary' : 'outline'}
        className="mt-4 w-full"
        disabled={!briefReady || briefConfirmed || pending}
        onClick={onConfirm}
      >
        {pending ? <LoaderCircle className="animate-spin" /> : briefConfirmed ? <Check /> : <FileCheck2 />}
        {pending ? '正在确认…' : briefConfirmed ? '工作简报已确认' : '确认并进入定义'}
      </Button>
    </section>
  );
}

function DiscoveryStage(props: StageWorkspaceProps) {
  const [reply, setReply] = useState('');
  const [selection, setSelection] = useState<{ slot: DiscoverySlot | null; values: string[] }>({ slot: null, values: [] });
  const hasStarted = props.discoveryMessages.some((message) => message.role === 'user');
  const ask = props.discoveryAsk;
  const selected = selection.slot === ask?.slot ? selection.values : [];

  function submitCustom() {
    const value = (hasStarted ? reply : props.task).trim();
    const slot = ask?.slot ?? 'goal';
    if (!value) return;
    props.answerDiscovery({ slot, value }, value);
    setReply('');
  }

  function chooseOption(option: DiscoveryAsk['options'][number]) {
    if (!ask) return;
    if (ask.type === 'single') {
      props.answerDiscovery({ slot: ask.slot, value: option.value }, option.label);
      return;
    }
    setSelection((current) => {
      const values = current.slot === ask.slot ? current.values : [];
      return {
        slot: ask.slot,
        values: values.includes(option.value)
          ? values.filter((value) => value !== option.value)
          : [...values, option.value],
      };
    });
  }

  function submitMultiple() {
    if (!ask || selected.length === 0) return;
    const shown = ask.options.filter((option) => selected.includes(option.value)).map((option) => option.label).join('、');
    props.answerDiscovery({ slot: ask.slot, value: selected }, shown);
  }

  return (
    <div className="flex min-h-[620px] flex-col">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div><p className="text-xs font-semibold">需求访谈</p><p className="mt-0.5 text-[10px] text-muted-foreground">每轮只确认一个问题，右侧简报实时累积</p></div>
        <span className="font-mono text-xs text-muted-foreground">{Object.keys(props.discoveryDraft).length} / {discoveryFields.length}</span>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5 md:p-7">
        {props.discoveryMessages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted'}`}>
              {message.role === 'assistant' && <p className="mb-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">万象 Builder</p>}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {props.pendingAction === 'discover' && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> DSH Builder 正在理解并整理这一轮…</div>
          </div>
        )}

        {ask && props.pendingAction !== 'discover' && !props.briefReady && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-3 duration-300">
            <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-4">
              <p className="text-sm font-semibold leading-6">{props.discoveryQuestion}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ask.type === 'multi' ? '可以多选，也可以在下方自己说明。' : '选择最接近的一项，也可以在下方自己说明。'}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {ask.options.map((option, index) => {
                const picked = selected.includes(option.value);
                return (
                  <button key={`${ask.slot}-${option.value}`} onClick={() => chooseOption(option)} className={`rounded-xl border p-3 text-left transition-colors ${picked ? 'border-primary bg-primary/[0.07]' : 'bg-background hover:bg-muted/40'}`}>
                    <div className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full border font-mono text-[9px]">{index + 1}</span><p className="text-xs font-semibold">{option.label}</p></div>
                    {option.description && <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{option.description}</p>}
                  </button>
                );
              })}
            </div>
            {ask.type === 'multi' && <div className="flex justify-end"><Button size="sm" onClick={submitMultiple} disabled={selected.length === 0}>选好了 <ArrowRight /></Button></div>}
          </div>
        )}

        {props.briefReady && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.05] p-4">
            <Check className="size-5 text-primary" /><div><p className="text-sm font-semibold">需求访谈已完成</p><p className="mt-1 text-xs text-muted-foreground">请通读右侧工作简报，确认后再定义数据边界。</p></div>
          </div>
        )}
      </div>

      {!props.briefReady && (
        <div className="border-t p-4 md:px-7">
          {!hasStarted ? (
            <div>
              <label htmlFor="discovery-first" className="mb-2 block text-xs font-semibold">从最近一次真实任务开始</label>
              <Textarea id="discovery-first" value={props.task} onChange={(event) => props.setTask(event.target.value)} className="min-h-24 resize-none bg-background" placeholder="例如：上周五，我需要从……整理出……交给……" />
            </div>
          ) : (
            <Textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitCustom(); } }}
              className="min-h-20 resize-none bg-background"
              placeholder="选项只是台阶，你也可以直接说自己的实际情况…"
            />
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[10px] leading-4 text-muted-foreground">对话由真实 DSH Session 处理；额度受限时会自动等待并继续。</p>
            <Button onClick={submitCustom} disabled={props.pendingAction === 'discover' || !(hasStarted ? reply.trim() : props.task.trim())}>
              {props.pendingAction === 'discover' ? <LoaderCircle className="animate-spin" /> : <Send />} {hasStarted ? '发送' : '开始访谈'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModelStage(props: StageWorkspaceProps) {
  return (
    <div className="space-y-6 p-5 md:p-7">
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-6">
        工作范围已经确认。这里只确认数据与风险边界；接下来会直接进入你修改后的 DSH 界面，在同一个工作会话里完成构建与验证。
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Data Agent 契约草案</h3>
            <p className="mt-1 text-xs text-muted-foreground">仅定义字段与权限占位，尚未接入真实 Data Agent。</p>
          </div>
          <Badge variant="outline">最小权限</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Capability
            title="客户与联系人"
            detail="读取客户状态、负责人和最近跟进时间"
            permission="示例 · 只读字段"
            active={props.dataConnected}
          />
          <Capability
            title="沟通记录"
            detail="读取最近一次沟通摘要与采购意向"
            permission="示例 · 最近 180 天"
            active={props.dataConnected}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">工作流草案</h3>
        <ol className="overflow-hidden rounded-xl border bg-background">
          {[
            ['筛选', '找出超过 14 天未跟进的有效客户'],
            ['判断', '结合采购意向和排除条件计算优先级'],
            ['整理', '按销售负责人生成清单，并附上进入理由'],
            ['批准', '负责人确认后，清单才进入正式周报'],
          ].map(([title, detail], index) => (
            <li key={title} className="flex gap-4 border-b p-4 last:border-b-0">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border font-mono text-[11px]">{index + 1}</span>
              <div><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{detail}</p></div>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[#d9b877] bg-[#fff8e9] p-4 text-[#5f4a20] sm:flex-row sm:items-center">
        <TriangleAlert className="size-5 shrink-0" />
        <p className="text-xs leading-5">确认的是示例数据契约，不代表真实数据已连接。MVP 不会发送消息或修改客户数据。</p>
        <Button className="sm:ml-auto" onClick={props.connectData} disabled={props.pendingAction === 'launch-dsh'}>
          {props.pendingAction === 'launch-dsh' ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
          {props.pendingAction === 'launch-dsh' ? '正在启动 DSH…' : '确认并进入 DSH'}
        </Button>
      </div>
    </div>
  );
}

function Capability({
  title,
  detail,
  permission,
  active,
}: {
  title: string;
  detail: string;
  permission: string;
  active: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${active ? 'border-primary/30 bg-primary/[0.035]' : 'bg-background'}`}>
      <div className="flex items-center justify-between">
        <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground"><Database className="size-4" /></span>
        {active && <Check className="size-4 text-primary" />}
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      <p className="mt-3 font-mono text-[10px] text-muted-foreground">{permission}</p>
    </div>
  );
}

function BuildStage(props: StageWorkspaceProps) {
  const artifacts = [
    ['.wanxiang/work-brief.md', '真实工作与完成标准'],
    ['.wanxiang/data-contract.json', '数据来源占位与只读边界'],
    ['.wanxiang/workflow.json', '可观察工作流与批准点'],
    ['.wanxiang/evals.json', '结果正确性与边界规则'],
  ];
  return (
    <div className="space-y-6 p-5 md:p-7">
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-6">
        我会把已确认的工作契约组合成一个 DSH 工作 Agent。它的每项能力都有来源，暂时不会获得额外权限。
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <BuildCard icon={GitBranch} label="Workflow" value="4 个可观察步骤" />
        <BuildCard icon={Database} label="Data contract" value="2 个来源占位" />
        <BuildCard icon={ShieldCheck} label="Approval" value="1 个成员确认点" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div><h3 className="text-sm font-semibold">项目工作区</h3><p className="mt-0.5 text-xs text-muted-foreground">可读、可审查、可版本化</p></div>
          <Badge variant="outline">Draft 0.1</Badge>
        </div>
        {artifacts.map(([name, detail]) => (
          <div key={name} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
            <FileCheck2 className="size-4 text-muted-foreground" />
            <code className="text-xs font-medium">{name}</code>
            <span className="ml-auto text-xs text-muted-foreground">{detail}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-primary/25 bg-primary/[0.035] p-5 sm:flex-row sm:items-center">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><WandSparkles className="size-4" /></div>
        <div><p className="text-sm font-semibold">准备构建可验证版本</p><p className="mt-1 text-xs text-muted-foreground">构建完成后不会直接发布，必须先通过案例评测与影子运行。</p></div>
        <Button className="sm:ml-auto" onClick={props.buildAgent} disabled={props.agentBuilt || props.pendingAction === 'build'}>
          {props.pendingAction === 'build' ? <LoaderCircle className="animate-spin" /> : props.agentBuilt ? <Check /> : <WandSparkles />}
          {props.pendingAction === 'build' ? '正在构建…' : props.agentBuilt ? 'Draft 0.1 已构建' : '构建 Agent Draft 0.1'}
        </Button>
      </div>
    </div>
  );
}

function BuildCard({ icon: Icon, label, value }: { icon: typeof GitBranch; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <Icon className="size-4 text-primary" />
      <p className="mt-5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

const evaluationCases = [
  ['正常客户', '超过 14 天、有明确采购意向', '进入清单'],
  ['近期跟进', '3 天前已沟通', '不进入'],
  ['边界：已成交', '状态为已成交', '排除'],
  ['边界：明确拒绝', '最新记录为暂不考虑', '排除'],
  ['多人协作', '客户负责人发生变更', '归入新负责人'],
];

function VerifyStage(props: StageWorkspaceProps) {
  const readyForRelease = props.evaluationRun && props.shadowRuns >= 3;
  return (
    <div className="space-y-6 p-5 md:p-7">
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-6">
        构建完成不代表有用。先用代表性案例检查规则，再在真实任务里影子运行三次；输出只供对比，不触发外部动作。
      </div>

      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead className="border-b bg-muted/50 text-muted-foreground">
            <tr><th className="px-4 py-3 font-medium">案例</th><th className="px-4 py-3 font-medium">输入条件</th><th className="px-4 py-3 font-medium">预期</th><th className="px-4 py-3 font-medium">结果</th></tr>
          </thead>
          <tbody>
            {evaluationCases.map(([name, input, expected]) => (
              <tr key={name} className="border-b last:border-b-0">
                <td className="px-4 py-3 font-medium">{name}</td><td className="px-4 py-3 text-muted-foreground">{input}</td><td className="px-4 py-3">{expected}</td>
                <td className="px-4 py-3">{props.evaluationRun ? <Badge className="bg-primary/10 text-primary">通过</Badge> : <span className="text-muted-foreground">待运行</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div><p className="text-sm font-semibold">案例评测</p><p className="mt-1 text-xs text-muted-foreground">5 个案例中包含 2 个异常或边界情况。</p></div>
        <Button className="sm:ml-auto" onClick={props.runEvaluation} disabled={props.evaluationRun || props.pendingAction === 'evaluate'}>
          {props.pendingAction === 'evaluate' ? <LoaderCircle className="animate-spin" /> : props.evaluationRun ? <Check /> : <FlaskConical />}
          {props.pendingAction === 'evaluate' ? '正在评测…' : props.evaluationRun ? '5 / 5 已通过' : '运行案例评测'}
        </Button>
      </div>

      <div className={`rounded-xl border p-5 ${props.evaluationRun ? 'bg-card' : 'bg-muted/40 opacity-60'}`}>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-semibold">真实任务影子运行</p><p className="mt-1 text-xs text-muted-foreground">每次由成员对比原结果，并确认是否可接受。</p></div>
          <span className="font-mono text-sm">{props.shadowRuns} / 3</span>
        </div>
        <div className="my-4 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((run) => (
            <div key={run} className={`h-2 rounded-full ${run < props.shadowRuns ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
        <Button variant="outline" className="w-full" disabled={!props.evaluationRun || props.shadowRuns >= 3 || props.pendingAction === 'shadow'} onClick={props.addShadowRun}>
          {props.pendingAction === 'shadow' ? <LoaderCircle className="animate-spin" /> : props.shadowApprovalPending ? <Check /> : <Eye />}
          {props.pendingAction === 'shadow' ? 'DSH 正在影子运行…' : props.shadowRuns >= 3 ? '3 次运行均已接受' : props.shadowApprovalPending ? '确认本次结果可接受' : '开始一次 DSH 影子运行'}
        </Button>
      </div>

      {readyForRelease && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.05] p-4">
          <Check className="size-5 text-primary" /><p className="text-sm font-semibold">验证门槛已通过，可以进入发布阶段。</p>
        </div>
      )}
    </div>
  );
}

function ReleaseStage(props: StageWorkspaceProps) {
  return (
    <div className="space-y-6 p-5 md:p-7">
      {props.published ? (
        <div className="py-10 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Rocket className="size-6" /></div>
          <p className="mt-5 font-heading text-3xl">Agent v1 已发布</p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">客户跟进简报原型现在可以通过 DSH 运行演练。接入真实 Data Agent 前，它只处理示例数据，且每次输出仍需成员批准。</p>
          <div className="mx-auto mt-6 grid max-w-xl gap-3 text-left sm:grid-cols-3">
            <ReleaseFact label="版本" value="v1.0.0" /><ReleaseFact label="证据" value="8 次通过" /><ReleaseFact label="回滚点" value="Draft 0.1" />
          </div>
          <Button className="mt-7" onClick={props.startOfficialRun} disabled={props.pendingAction === 'official-run'}>{props.pendingAction === 'official-run' ? <LoaderCircle className="animate-spin" /> : <PlayCircle />} {props.pendingAction === 'official-run' ? '正在运行…' : '开始一次 DSH 运行演练'}</Button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-6">所有必要证据已经齐备。发布的是一个有版本、可回滚的工作能力，不是一次不可追踪的生成结果。</div>
          <div className="overflow-hidden rounded-xl border bg-background">
            {[
              ['工作范围', '成员已确认'],
              ['数据契约', '2 个来源占位'],
              ['案例评测', '5/5 通过'],
              ['影子运行', '3/3 结果可接受'],
              ['高风险动作', '保持人工批准'],
              ['回滚计划', '保留 Draft 0.1'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"><Check className="size-4 text-primary" /><span className="text-sm">{label}</span><span className="ml-auto text-xs text-muted-foreground">{value}</span></div>
            ))}
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/[0.045] p-5">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 text-primary" /><div><p className="text-sm font-semibold">发布前检查</p><p className="mt-1 text-xs leading-5 text-muted-foreground">工作范围、数据边界、案例评测与三次影子运行证据均已齐备。发布决定由项目成员确认。</p></div></div>
            <Button className="mt-5 w-full" size="lg" onClick={props.publish} disabled={props.pendingAction === 'publish'}>{props.pendingAction === 'publish' ? <LoaderCircle className="animate-spin" /> : <Rocket />} {props.pendingAction === 'publish' ? '正在发布…' : '发布 Agent v1'}</Button>
          </div>
        </>
      )}
    </div>
  );
}

function ReleaseFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-background p-3"><p className="font-mono text-[10px] text-muted-foreground uppercase">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

type AuxiliaryViewProps = {
  view: Exclude<ViewId, 'builder'>;
  projectName: string;
  setProjectName: (value: string) => void;
  dataConnected: boolean;
  connectData: () => void;
  pendingAction: string | null;
  runs: RunRecord[];
  openRun: (run: RunRecord) => void;
  published: boolean;
  startOfficialRun: () => void;
  openPermissions: () => void;
  openReset: () => void;
  notify: (message: string) => void;
};

function AuxiliaryView(props: AuxiliaryViewProps) {
  const headings: Record<AuxiliaryViewProps['view'], [string, string]> = {
    runs: ['运行记录', '查看每次构建、评测和工作运行留下的证据。'],
    data: ['数据能力', '当前先确认最小只读数据契约；真实 Data Agent 尚未接入。'],
    approvals: ['权限与批准', '所有高风险动作在执行前都需要明确的人类批准。'],
    settings: ['项目设置', '管理当前项目的名称、保存状态与原型数据。'],
  };
  const [title, description] = headings[props.view];

  return (
    <div>
      <div className="mb-7">
        <Badge variant="outline" className="mb-2 border-primary/30 bg-primary/5 text-primary">{props.projectName}</Badge>
        <h1 className="font-heading text-3xl tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      {props.view === 'runs' && (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold">全部运行</p><p className="mt-1 text-xs text-muted-foreground">共 {props.runs.length} 条原型记录</p></div>
            <Button
              variant={props.published ? 'default' : 'secondary'}
              onClick={() => props.published ? props.startOfficialRun() : props.notify('需要先通过验证并发布 Agent。')}
              disabled={props.pendingAction === 'official-run'}
            >
              {props.pendingAction === 'official-run' ? <LoaderCircle className="animate-spin" /> : <PlayCircle />}
              {props.pendingAction === 'official-run' ? '正在运行…' : '开始 DSH 运行演练'}
            </Button>
          </div>
          {props.runs.length ? props.runs.map((run) => (
            <button key={run.id} onClick={() => props.openRun(run)} className="flex w-full items-center gap-4 border-b p-5 text-left last:border-b-0 hover:bg-muted/40">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Clock3 className="size-4" /></span>
              <div className="min-w-0"><p className="text-sm font-semibold">{run.kind}</p><p className="mt-1 truncate text-xs text-muted-foreground">{run.detail}</p></div>
              <div className="ml-auto shrink-0 text-right"><Badge variant="outline">{run.result}</Badge><p className="mt-1 text-[10px] text-muted-foreground">{run.time}</p></div>
            </button>
          )) : <div className="p-10 text-center text-sm text-muted-foreground">完成构建后，运行证据会出现在这里。</div>}
        </section>
      )}

      {props.view === 'data' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {[
            ['客户与联系人', '客户状态、负责人、最近跟进时间', '1,248 条记录'],
            ['沟通记录', '沟通摘要、采购意向与记录时间', '最近 180 天'],
          ].map(([name, detail, scope]) => (
            <section key={name} className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Database className="size-4" /></span><Badge variant={props.dataConnected ? 'default' : 'secondary'}>{props.dataConnected ? '契约已确认' : '待确认'}</Badge></div>
              <h2 className="mt-5 text-lg font-semibold">{name}</h2><p className="mt-2 text-sm text-muted-foreground">{detail}</p><p className="mt-4 font-mono text-xs text-muted-foreground">只读 · {scope}</p>
              <Button variant="outline" className="mt-5 w-full" onClick={props.dataConnected ? props.openPermissions : props.connectData} disabled={props.pendingAction === 'connect-data-view'}>
                {props.pendingAction === 'connect-data-view' ? <LoaderCircle className="animate-spin" /> : props.dataConnected ? <ShieldCheck /> : <Database />}
                {props.pendingAction === 'connect-data-view' ? '正在确认…' : props.dataConnected ? '查看契约' : '确认示例契约'}
              </Button>
            </section>
          ))}
          <p className="lg:col-span-2 rounded-xl border border-[#d9b877] bg-[#fff8e9] p-4 text-xs leading-5 text-[#5f4a20]">当前仅确认前端示例契约，不会读取真实客户数据，也不会上传凭证。</p>
        </div>
      )}

      {props.view === 'approvals' && (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
          {[
            ['示例数据契约', props.dataConnected ? '已确认' : '等待确认', '定义客户与沟通信息的只读字段，不代表真实连接'],
            ['DSH 运行演练', props.published ? '等待每次运行批准' : '尚未发布', '示例数据输出在交付前由成员确认'],
            ['外部写入动作', '保持禁止', 'MVP 不发送消息，也不修改客户数据'],
          ].map(([name, status, detail], index) => (
            <div key={name} className="flex flex-col gap-4 border-b p-5 last:border-b-0 sm:flex-row sm:items-center">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-4" /></span>
              <div><p className="text-sm font-semibold">{name}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
              <Button variant="outline" size="sm" className="sm:ml-auto" onClick={() => index === 0 ? props.openPermissions() : props.notify(index === 1 ? 'DSH 运行演练会逐次请求成员批准。' : '外部写入动作在当前 MVP 中保持禁止。')}>{status}</Button>
            </div>
          ))}
        </section>
      )}

      {props.view === 'settings' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border bg-card p-5 shadow-xs md:p-7">
            <label htmlFor="project-name" className="block text-sm font-semibold">项目名称</label>
            <input id="project-name" value={props.projectName} onChange={(event) => props.setProjectName(event.target.value)} className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
            <p className="mt-2 text-xs text-muted-foreground">名称与构建进度自动保存在当前浏览器。</p>
            <Button className="mt-5" onClick={() => props.notify('项目设置已保存。')} disabled={!props.projectName.trim()}><Save /> 保存设置</Button>
          </section>
          <section className="rounded-2xl border border-destructive/25 bg-card p-5 shadow-xs">
            <p className="text-sm font-semibold text-destructive">重置项目进度</p><p className="mt-2 text-xs leading-5 text-muted-foreground">清除构建、验证和发布状态，返回发现阶段。</p>
            <Button variant="destructive" className="mt-5 w-full" onClick={props.openReset}><RotateCcw /> 重新开始</Button>
          </section>
        </div>
      )}
    </div>
  );
}

function CommunityDrawer({
  open,
  onOpenChange,
  messages,
  draft,
  setDraft,
  mode,
  setMode,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: CommunityMessage[];
  draft: string;
  setDraft: (value: string) => void;
  mode: '咨询' | '反馈';
  setMode: (mode: '咨询' | '反馈') => void;
  onSend: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,460px)] sm:max-w-[460px]">
        <SheetHeader className="border-b px-5 py-5">
          <div className="flex items-center gap-3 pr-10">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Users className="size-5" /></span>
            <div>
              <div className="flex items-center gap-2">
                <SheetTitle>万象社群支持</SheetTitle>
                <Badge variant="outline">外部服务</Badge>
              </div>
              <SheetDescription className="mt-1">随时咨询构建问题，或把产品反馈交给社群团队。</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="border-b bg-[#fff8e9] px-5 py-3 text-xs leading-5 text-[#5f4a20]">
          社群不参与 Builder 流程，不会改变项目阶段、验收证据或发布权限。
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="rounded-xl border bg-muted/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">本周社群开放时间</p>
              <Badge variant="secondary">周三 20:00</Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">真实任务拆解、数据边界与 DSH 构建答疑。</p>
          </div>

          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.mine ? 'justify-end' : ''}`}>
              {!message.mine && <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#d5e0dc] text-[10px] font-semibold text-[#274a40]">群</div>}
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.mine ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted'}`}>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold opacity-75">
                  <span>{message.author}</span>
                  {message.kind && <span>{message.kind}</span>}
                </div>
                <p>{message.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-5">
          <div className="mb-3 grid grid-cols-2 rounded-lg bg-muted p-1">
            {(['咨询', '反馈'] as const).map((item) => (
              <button key={item} onClick={() => setMode(item)} className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${mode === item ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}`}>
                {item === '咨询' ? '咨询问题' : '产品反馈'}
              </button>
            ))}
          </div>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={mode === '咨询' ? '描述你在任务拆解、数据或 DSH 构建中遇到的问题…' : '告诉我们哪里不好用，以及你期望发生什么…'}
            className="min-h-24 resize-none bg-background"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="max-w-56 text-[10px] leading-4 text-muted-foreground">MVP 中消息保存在本浏览器；正式版将接入独立社群服务。</p>
            <Button onClick={onSend} disabled={!draft.trim()}><Send /> 提交{mode}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PrototypeModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#18201f]/45 p-4 backdrop-blur-sm">
      <dialog open aria-label={title} className="relative m-0 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-0 text-foreground shadow-2xl">
        <div className="sticky top-0 flex items-center border-b bg-card/95 px-5 py-4 backdrop-blur"><h2 className="font-heading text-xl">{title}</h2><button onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="关闭"><X className="size-4" /></button></div>
        <div className="p-5">{children}</div>
      </dialog>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  count,
  onClick,
  compact = false,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
  count?: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${compact ? 'shrink-0' : 'w-full'} ${
        active ? 'bg-primary/8 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="size-4" />
      <span>{label}</span>
      {count && <span className="ml-auto font-mono text-[10px]">{count}</span>}
    </button>
  );
}
