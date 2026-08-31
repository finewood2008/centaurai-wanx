import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackAsk, nextDiscoverySlot, parseDiscoveryOutput, settleDiscovery } from '../src/discovery.mjs';

test('the user answer is authoritative and advances one slot', () => {
  const draft = settleDiscovery({ goal: '旧目标' }, { slot: 'goal', value: '每周整理客户跟进清单' });
  assert.equal(draft.goal, '每周整理客户跟进清单');
  assert.equal(nextDiscoverySlot(draft), 'inputs');
});

test('invalid model options fall back to usable choices', () => {
  const result = parseDiscoveryOutput('{"reply":"继续","ask":{"slot":"inputs","options":[]}}', { goal: 'x' }, 'inputs');
  assert.equal(result.ask.slot, 'inputs');
  assert.equal(result.ask.type, 'multi');
  assert.ok(result.ask.options.length >= 3);
});

test('all slots produce a confirmation turn', () => {
  const draft = settleDiscovery({
    goal: 'g', inputs: 'i', rules: 'r', output: 'o', boundaries: 'b', success: 's',
  }, null);
  const result = parseDiscoveryOutput('{"reply":"请确认","done":true}', draft, null);
  assert.equal(result.done, true);
  assert.equal(result.ask, null);
});

test('fallback multi-select is fixed by slot semantics', () => {
  assert.equal(fallbackAsk('rules').type, 'multi');
  assert.equal(fallbackAsk('success').type, 'single');
});
