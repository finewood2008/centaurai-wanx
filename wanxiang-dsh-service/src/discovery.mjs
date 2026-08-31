export const DISCOVERY_SLOTS = ['goal', 'inputs', 'rules', 'output', 'boundaries', 'success'];

const SLOT_LABELS = {
  goal: '真实任务与目标',
  inputs: '输入与资料来源',
  rules: '判断与优先级规则',
  output: '交付结果',
  boundaries: '排除项与风险边界',
  success: '验收标准',
};

const FALLBACK_OPTIONS = {
  goal: [
    ['找出最需要处理的事项', '从重复工作中识别优先对象'],
    ['把零散信息整理成结果', '减少每次手工汇总'],
    ['持续提醒不能遗漏的工作', '避免承诺和节点失控'],
  ],
  inputs: [
    ['业务表格', '客户、订单或项目数据'],
    ['沟通与会议记录', '消息、邮件、通话或会议纪要'],
    ['个人工作记录', '你平时维护的文档与清单'],
  ],
  rules: [
    ['按时间判断', '例如超过若干天没有处理'],
    ['按状态与条件筛选', '满足条件才进入结果'],
    ['按优先级排序', '综合重要性、紧急性或价值'],
  ],
  output: [
    ['一份可执行清单', '每一项都能直接继续处理'],
    ['一份结构化简报', '包含结论、依据和下一步'],
    ['一份可修改草稿', '由你确认后再对外使用'],
  ],
  boundaries: [
    ['不自动对外发送', '只生成结果，发送前必须确认'],
    ['不修改原始业务数据', '默认只读，不回写来源'],
    ['拿不准时进入人工复核', '不猜测、不静默跳过'],
  ],
  success: [
    ['关键对象没有遗漏', '与人工结果对比确认覆盖完整'],
    ['每条结果都有依据', '能解释为什么进入或被排除'],
    ['结果可以直接继续工作', '使用者不需要重新整理一遍'],
  ],
};

export function settleDiscovery(rawDraft, answered) {
  const draft = {};
  if (rawDraft && typeof rawDraft === 'object' && !Array.isArray(rawDraft)) {
    for (const slot of DISCOVERY_SLOTS) {
      const value = normalizeValue(rawDraft[slot]);
      if (value) draft[slot] = value;
    }
  }
  if (answered && DISCOVERY_SLOTS.includes(answered.slot)) {
    const value = normalizeValue(answered.value);
    if (value) draft[answered.slot] = value;
  }
  return draft;
}

export function nextDiscoverySlot(draft) {
  return DISCOVERY_SLOTS.find((slot) => !draft[slot]) || null;
}

export function buildDiscoveryPrompt({ projectName, messages, draft, nextSlot }) {
  const transcript = normalizeMessages(messages)
    .map((message) => `${message.role === 'user' ? '用户' : 'Builder'}：${message.content}`)
    .join('\n');
  const draftLines = DISCOVERY_SLOTS
    .filter((slot) => draft[slot])
    .map((slot) => `- ${SLOT_LABELS[slot]}：${formatValue(draft[slot])}`)
    .join('\n') || '（尚未记录）';

  return [
    '你是万象 Builder 的需求发现访谈者。用户不一定会表达产品需求，但熟悉自己的真实工作。',
    '你的任务不是立刻给方案，而是通过克制、专业的多轮对话，把一项重复工作问清楚。',
    '',
    `项目：${projectName || '未命名工作 Agent'}`,
    `本轮要问的唯一主题：${nextSlot ? `${nextSlot}（${SLOT_LABELS[nextSlot]}）` : '信息已齐，做最终回读'}`,
    '',
    '当前需求草稿：',
    draftLines,
    '',
    '对话记录：',
    transcript || '（第一轮）',
    '',
    '只输出一个 JSON 对象，不要 Markdown，不要代码围栏。格式：',
    nextSlot
      ? '{"reply":"先回读上一轮的真正含义，再说明写进了哪一部分，最后自然引出本轮问题。2-3个短段落。","question":"本轮只问一个问题","ask":{"slot":"指定槽位","type":"single或multi","allowCustom":true,"options":[{"label":"短标题","description":"选它意味着什么","value":"写入需求草稿的正式表述"}]},"done":false}'
      : '{"reply":"完整回读已经确认的工作目标、输入、规则、输出、边界和验收方式，并请用户通读确认。","question":null,"ask":null,"done":true}',
    '',
    '硬规则：',
    '- 只能询问指定槽位，不要跳题或重复已经记录的内容。',
    '- 有 ask 时必须提供至少 3 个具体选项，且允许用户自由输入。',
    '- inputs、rules、boundaries 使用 multi；其他槽位使用 single。',
    '- 不声称已经连接真实数据，不替用户作业务决定。',
    '- 所有用户可见文字使用中文，语气像有判断力的同事，不像客服。',
  ].join('\n');
}

export function parseDiscoveryOutput(raw, draft, nextSlot) {
  const parsed = extractObject(raw);
  const fallback = nextSlot ? fallbackAsk(nextSlot) : null;
  const reply = typeof parsed?.reply === 'string' && parsed.reply.trim()
    ? parsed.reply.trim()
    : nextSlot
      ? `我已经把你的回答写进需求草稿。接下来需要确认${SLOT_LABELS[nextSlot]}。`
      : '需求信息已经齐了。请通读右侧工作简报，确认它准确描述了你的真实工作。';

  if (!nextSlot) return { reply, question: null, ask: null, done: true, draft };

  const ask = normalizeAsk(parsed?.ask, nextSlot) || fallback;
  const question = typeof parsed?.question === 'string' && parsed.question.trim()
    ? parsed.question.trim()
    : `关于${SLOT_LABELS[nextSlot]}，哪一种最接近你的实际情况？`;
  return { reply, question, ask, done: false, draft };
}

export function fallbackAsk(slot) {
  const multi = ['inputs', 'rules', 'boundaries'].includes(slot);
  return {
    slot,
    type: multi ? 'multi' : 'single',
    allowCustom: true,
    options: FALLBACK_OPTIONS[slot].map(([label, description]) => ({ label, description, value: label })),
  };
}

function normalizeAsk(raw, slot) {
  if (!raw || typeof raw !== 'object' || raw.slot !== slot || !Array.isArray(raw.options)) return null;
  const options = raw.options.map((option) => {
    if (!option || typeof option !== 'object') return null;
    const label = typeof option.label === 'string' ? option.label.trim() : '';
    if (!label) return null;
    return {
      label,
      description: typeof option.description === 'string' ? option.description.trim() : '',
      value: typeof option.value === 'string' && option.value.trim() ? option.value.trim() : label,
    };
  }).filter(Boolean);
  if (options.length < 3) return null;
  return {
    slot,
    type: ['inputs', 'rules', 'boundaries'].includes(slot) ? 'multi' : 'single',
    allowCustom: raw.allowCustom !== false,
    options,
  };
}

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-20).flatMap((message) => {
    if (!message || typeof message !== 'object') return [];
    if (!['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') return [];
    return [{ role: message.role, content: message.content.slice(0, 4000) }];
  });
}

function normalizeValue(raw) {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    const values = raw.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
    return values.length ? values : null;
  }
  return null;
}

function formatValue(value) {
  return Array.isArray(value) ? value.join('；') : value;
}

function extractObject(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
