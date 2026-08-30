'use client';

import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleDot,
  Database,
  Eye,
  FileCheck2,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  PlayCircle,
  Plus,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  WandSparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

const stages = [
  { label: '发现', detail: '真实任务' },
  { label: '建模', detail: '流程与数据' },
  { label: '构建', detail: 'Agent 能力' },
  { label: '验证', detail: '案例与影子运行' },
  { label: '发布', detail: '版本与回滚' },
];

const defaultTask =
  '每周一我要从客户表里找出 14 天没有跟进、但最近有明确采购意向的客户，再结合上次沟通记录，为每位销售整理一份本周优先跟进清单。';

export default function Home() {
  const [task, setTask] = useState(defaultTask);
  const [briefReady, setBriefReady] = useState(false);
  const [briefSubmitted, setBriefSubmitted] = useState(false);
  const [dataConnected, setDataConnected] = useState(false);
  const [agentBuilt, setAgentBuilt] = useState(false);
  const [evaluationRun, setEvaluationRun] = useState(false);
  const [shadowRuns, setShadowRuns] = useState(0);
  const [published, setPublished] = useState(false);
  const [activeStage, setActiveStage] = useState(0);

  const unlockedStage = published
    ? 4
    : evaluationRun && shadowRuns >= 3
      ? 4
      : agentBuilt
        ? 3
        : dataConnected
          ? 2
          : briefSubmitted
            ? 1
            : 0;
  const evidenceCount =
    Number(briefSubmitted) +
    Number(dataConnected) +
    Number(evaluationRun) +
    Number(shadowRuns >= 3);

  function createBrief() {
    if (!task.trim()) return;
    setBriefReady(true);
  }

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
          <Button variant="ghost" size="sm" className="hidden md:inline-flex">
            <BookOpen /> 学习手册
          </Button>
          <Button variant="outline" size="sm">
            <Users /> 社群工作坊
          </Button>
          <button
            className="ml-1 grid size-8 place-items-center rounded-full bg-[#d9c7a6] text-xs font-semibold text-[#3a3124]"
            aria-label="打开个人菜单"
          >
            林
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-r px-3 py-5 lg:block">
          <Button className="mb-6 w-full justify-start" size="lg">
            <Plus /> 新建工作 Agent
          </Button>

          <nav aria-label="主导航" className="space-y-1">
            <NavItem icon={LayoutDashboard} label="我的工作台" active />
            <NavItem icon={PlayCircle} label="运行记录" count="3" />
            <NavItem icon={MessageSquareText} label="导师反馈" count="1" />
            <NavItem icon={Database} label="数据能力" />
          </nav>

          <p className="mb-2 mt-8 px-3 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            当前项目
          </p>
          <button className="w-full rounded-xl border bg-card p-3 text-left shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold">客户跟进简报</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">销售运营 · Draft 0.1</p>
            <Progress value={20} className="mt-3" />
          </button>

          <nav aria-label="辅助导航" className="mt-8 space-y-1">
            <NavItem icon={ShieldCheck} label="权限与批准" />
            <NavItem icon={Settings} label="项目设置" />
          </nav>
        </aside>

        <main className="min-w-0 px-4 py-6 md:px-8 md:py-8 xl:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                    {published ? '已发布' : `${stages[activeStage].label}阶段`}
                  </Badge>
                  <span className="text-xs text-muted-foreground">最后更新：刚刚</span>
                </div>
                <h1 className="font-heading text-3xl tracking-tight md:text-4xl">客户跟进简报</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  先把一项真实工作说清楚。万象会和你、导师一起，把它逐步构建成可验证的工作 Agent。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline">查看产品原则</Button>
                <Button
                  disabled={unlockedStage < 4}
                  onClick={() => setActiveStage(4)}
                >
                  发布 Agent
                </Button>
              </div>
            </div>

            <section aria-labelledby="journey-title" className="mb-7 overflow-hidden rounded-2xl border bg-card shadow-xs">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <div>
                  <p id="journey-title" className="text-sm font-semibold">从真实任务到可靠运行</p>
                  <p className="text-xs text-muted-foreground">完成当前阶段的证据门槛后，才会进入下一阶段。</p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{activeStage + 1} / 5</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5">
                {stages.map((stage, index) => (
                  <button
                    key={stage.label}
                    type="button"
                    disabled={index > unlockedStage}
                    onClick={() => setActiveStage(index)}
                    className={`relative border-r p-4 text-left transition-colors last:border-r-0 ${
                      index === activeStage ? 'bg-primary/[0.055]' : 'hover:bg-muted/35'
                    } disabled:cursor-not-allowed disabled:opacity-45`}
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
                setBriefSubmitted(false);
              }}
              briefReady={briefReady}
              createBrief={createBrief}
              briefSubmitted={briefSubmitted}
              submitBrief={() => {
                setBriefSubmitted(true);
                setActiveStage(1);
              }}
              dataConnected={dataConnected}
              connectData={() => {
                setDataConnected(true);
                setActiveStage(2);
              }}
              agentBuilt={agentBuilt}
              buildAgent={() => {
                setAgentBuilt(true);
                setActiveStage(3);
              }}
              evaluationRun={evaluationRun}
              runEvaluation={() => setEvaluationRun(true)}
              shadowRuns={shadowRuns}
              addShadowRun={() => setShadowRuns((current) => Math.min(3, current + 1))}
              published={published}
              publish={() => setPublished(true)}
              evidenceCount={evidenceCount}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

type StageWorkspaceProps = {
  activeStage: number;
  task: string;
  setTask: (value: string) => void;
  briefReady: boolean;
  createBrief: () => void;
  briefSubmitted: boolean;
  submitBrief: () => void;
  dataConnected: boolean;
  connectData: () => void;
  agentBuilt: boolean;
  buildAgent: () => void;
  evaluationRun: boolean;
  runEvaluation: () => void;
  shadowRuns: number;
  addShadowRun: () => void;
  published: boolean;
  publish: () => void;
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
        <MentorCard
          briefReady={props.briefReady}
          briefSubmitted={props.briefSubmitted}
          onSubmit={props.submitBrief}
        />
        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">有用性证据</h2>
            <span className="font-mono text-xs text-muted-foreground">{props.evidenceCount} / 4</span>
          </div>
          <div className="space-y-4">
            <Evidence
              icon={FileCheck2}
              title="真实工作简报"
              detail={props.briefSubmitted ? '导师已确认范围' : '等待形成并提交'}
              done={props.briefSubmitted}
            />
            <Evidence
              icon={Database}
              title="真实数据能力"
              detail={props.dataConnected ? '客户数据（只读）已连接' : '尚未连接'}
              done={props.dataConnected}
            />
            <Evidence
              icon={FlaskConical}
              title="5 个验收案例"
              detail={props.evaluationRun ? '5/5 通过，含 2 个边界案例' : '尚未运行'}
              done={props.evaluationRun}
            />
            <Evidence
              icon={PlayCircle}
              title="3 次影子运行"
              detail={`${props.shadowRuns}/3 次结果被成员接受`}
              done={props.shadowRuns >= 3}
            />
          </div>
        </section>
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
    '正在把工作拆成流程、数据与风险边界',
    '正在把已确认的契约组合成工作 Agent',
    '正在用案例和真实任务检验是否有用',
    '正在准备可追溯、可回滚的正式版本',
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

function MentorCard({
  briefReady,
  briefSubmitted,
  onSubmit,
}: {
  briefReady: boolean;
  briefSubmitted: boolean;
  onSubmit: () => void;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">导师评审</h2>
        <Badge variant={briefSubmitted ? 'default' : 'secondary'}>
          {briefSubmitted ? '范围已确认' : '待提交'}
        </Badge>
      </div>
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d5e0dc] text-xs font-semibold text-[#274a40]">陈</div>
        <div>
          <p className="text-sm font-medium">陈老师</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {briefSubmitted ? '范围清楚，可以进入数据与流程建模。' : '将重点检查任务边界、异常情况和是否真的能验收。'}
          </p>
        </div>
      </div>
      <Button
        variant={briefSubmitted ? 'secondary' : 'outline'}
        className="mt-4 w-full"
        disabled={!briefReady || briefSubmitted}
        onClick={onSubmit}
      >
        {briefSubmitted ? <Check /> : <MessageSquareText />}
        {briefSubmitted ? '工作简报已确认' : '提交工作简报'}
      </Button>
    </section>
  );
}

function DiscoveryStage(props: StageWorkspaceProps) {
  return (
    <div className="space-y-5 p-5 md:p-7">
      <div className="max-w-2xl rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-6">
        不用先描述你想做什么产品。请回忆一下最近一次你亲手完成、而且还会重复发生的工作：你当时收到了什么，又要交付什么结果？
      </div>
      <div>
        <label htmlFor="real-task" className="mb-2 block text-sm font-semibold">最近一次真实任务</label>
        <Textarea
          id="real-task"
          value={props.task}
          onChange={(event) => props.setTask(event.target.value)}
          rows={5}
          className="min-h-32 resize-none bg-background px-4 py-3 leading-6"
          placeholder="例如：上周五，我需要从……整理出……交给……"
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">请使用真实发生过的输入和结果，暂时不用考虑怎么实现。</p>
          <Button onClick={props.createBrief} disabled={!props.task.trim()}>
            形成工作简报 <ArrowRight />
          </Button>
        </div>
      </div>

      {props.briefReady && (
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-primary/25 bg-primary/[0.035] p-5 duration-300">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3.5" /></span>
            <h3 className="text-sm font-semibold">工作简报已形成</h3>
            <Badge variant="outline" className="ml-auto">等待导师确认</Badge>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <BriefItem label="工作目标" value="每周生成需要优先跟进的客户清单" />
            <BriefItem label="主要使用者" value="销售负责人和一线销售" />
            <BriefItem label="真实输入" value="客户表、采购意向、沟通记录" />
            <BriefItem label="可验收输出" value="每位销售的本周优先清单与理由" />
          </dl>
          <div className="mt-4 border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground">已记录的边界</p>
            <p className="mt-1 text-sm">已成交、明确拒绝或由管理层冻结的客户，不进入跟进清单。</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BriefItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function ModelStage(props: StageWorkspaceProps) {
  return (
    <div className="space-y-6 p-5 md:p-7">
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-6">
        工作范围已经确认。现在只连接完成这项工作真正需要的数据，并把高风险动作留给人批准。
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Data Agent 可用能力</h3>
            <p className="mt-1 text-xs text-muted-foreground">凭证不会暴露给 Builder Agent。</p>
          </div>
          <Badge variant="outline">最小权限</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Capability
            title="客户与联系人"
            detail="读取客户状态、负责人和最近跟进时间"
            permission="只读 · 1,248 条"
            active={props.dataConnected}
          />
          <Capability
            title="沟通记录"
            detail="读取最近一次沟通摘要与采购意向"
            permission="只读 · 最近 180 天"
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
        <p className="text-xs leading-5">MVP 不会自动发送消息或修改客户数据。所有输出先进入影子运行，由成员确认。</p>
        <Button className="sm:ml-auto" onClick={props.connectData} disabled={props.dataConnected}>
          {props.dataConnected ? <Check /> : <Database />}
          {props.dataConnected ? '已连接' : '确认并连接'}
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
    ['work-brief.md', '真实工作与完成标准'],
    ['data-contracts/customer.yaml', '只读数据能力与字段范围'],
    ['workflows/weekly-follow-up.yaml', '四步工作流与批准点'],
    ['evals/rubric.yaml', '结果正确性与边界规则'],
  ];
  return (
    <div className="space-y-6 p-5 md:p-7">
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-6">
        我会把已确认的工作契约组合成一个 DSH 工作 Agent。它的每项能力都有来源，暂时不会获得额外权限。
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <BuildCard icon={GitBranch} label="Workflow" value="4 个可观察步骤" />
        <BuildCard icon={Database} label="Data tools" value="2 个只读能力" />
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
        <Button className="sm:ml-auto" onClick={props.buildAgent} disabled={props.agentBuilt}>
          {props.agentBuilt ? <Check /> : <WandSparkles />}
          {props.agentBuilt ? 'Draft 0.1 已构建' : '构建 Agent Draft 0.1'}
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
        <Button className="sm:ml-auto" onClick={props.runEvaluation} disabled={props.evaluationRun}>
          {props.evaluationRun ? <Check /> : <FlaskConical />}
          {props.evaluationRun ? '5 / 5 已通过' : '运行案例评测'}
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
        <Button variant="outline" className="w-full" disabled={!props.evaluationRun || props.shadowRuns >= 3} onClick={props.addShadowRun}>
          <Eye /> {props.shadowRuns >= 3 ? '3 次运行均已接受' : '记录一次可接受的影子运行'}
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
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">客户跟进简报现在可以按周运行。它仍保持只读，并在输出进入正式周报前请求成员批准。</p>
          <div className="mx-auto mt-6 grid max-w-xl gap-3 text-left sm:grid-cols-3">
            <ReleaseFact label="版本" value="v1.0.0" /><ReleaseFact label="证据" value="8 次通过" /><ReleaseFact label="回滚点" value="Draft 0.1" />
          </div>
          <Button className="mt-7"><PlayCircle /> 开始一次正式运行</Button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-6">所有必要证据已经齐备。发布的是一个有版本、可回滚的工作能力，不是一次不可追踪的生成结果。</div>
          <div className="overflow-hidden rounded-xl border bg-background">
            {[
              ['工作范围', '导师已确认'],
              ['数据权限', '2 个只读能力'],
              ['案例评测', '5/5 通过'],
              ['影子运行', '3/3 结果可接受'],
              ['高风险动作', '保持人工批准'],
              ['回滚计划', '保留 Draft 0.1'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"><Check className="size-4 text-primary" /><span className="text-sm">{label}</span><span className="ml-auto text-xs text-muted-foreground">{value}</span></div>
            ))}
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/[0.045] p-5">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 text-primary" /><div><p className="text-sm font-semibold">导师发布批准</p><p className="mt-1 text-xs leading-5 text-muted-foreground">陈老师：范围、权限和验收证据完整，同意发布只读 v1。</p></div></div>
            <Button className="mt-5 w-full" size="lg" onClick={props.publish}><Rocket /> 发布 Agent v1</Button>
          </div>
        </>
      )}
    </div>
  );
}

function ReleaseFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-background p-3"><p className="font-mono text-[10px] text-muted-foreground uppercase">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  count,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
  count?: string;
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? 'bg-primary/8 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="size-4" />
      <span>{label}</span>
      {count && <span className="ml-auto font-mono text-[10px]">{count}</span>}
    </button>
  );
}

function Evidence({
  icon: Icon,
  title,
  detail,
  done = false,
}: {
  icon: typeof FileCheck2;
  title: string;
  detail: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-lg border ${
          done ? 'border-primary/20 bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'
        }`}
      >
        {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
