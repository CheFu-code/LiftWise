const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function timerHarness() {
  let now = 10000, cursor = 0, sequence = 0;
  const slots = [], effects = [], intervals = new Map(), listeners = new Set(), alerts = [];
  const app = { currentState: 'active', addEventListener: (_name, fn) => { listeners.add(fn); return { remove: () => listeners.delete(fn) }; } };
  class Clock extends Date { static now() { return now; } }
  const module = { exports: {} };
  const react = {
    useState: initial => { const index = cursor++; slots[index] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[index].value, value => { slots[index].value = value; }]; },
    useRef: initial => { const index = cursor++; slots[index] ??= { current: initial }; return slots[index]; },
    useEffect: (effect, deps) => { const index = cursor++; const old = slots[index]; if (!old || deps.some((value, i) => value !== old.deps[i])) { effects.push(() => { old?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; }); } },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/use-workout-timer.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module, exports: module.exports, Date: Clock,
    setInterval: fn => { const id = ++sequence; intervals.set(id, fn); return id; }, clearInterval: id => intervals.delete(id),
    require: name => ({ react, 'react-native': { AppState: app }, '@/lib/workout-reminders': { syncRestAlert: async (...args) => { alerts.push(args); } }, '@/lib/toast-store': { showToast() {} } })[name],
  });
  let options = { userId: 'alice', restAlerts: true, sound: false };
  return {
    alerts, intervals,
    render: next => { if (next) options = next; cursor = 0; const result = module.exports.useWorkoutTimer(options); while (effects.length) effects.shift()(); return result; },
    background: () => { app.currentState = 'background'; listeners.forEach(fn => fn('background')); },
    foreground: () => { app.currentState = 'active'; listeners.forEach(fn => fn('active')); },
    advance: ms => { now += ms; },
    stop: () => slots.forEach(slot => slot.cleanup?.()),
  };
}

test('rest alert gets an absolute deadline and survives backgrounding; skip and unmount cancel it', () => {
  const hook = timerHarness();
  const timer = hook.render();
  timer.startRest(60);
  const scheduled = hook.alerts.at(-1);
  assert.equal(scheduled[0], 'alice');
  assert.equal(scheduled[2], 70000);
  assert.equal(scheduled[3], false);
  hook.background();
  assert.equal(hook.intervals.size, 0, 'no background JavaScript ticking is required');
  hook.advance(30000); hook.foreground();
  assert.equal(hook.render().rest, 30);
  hook.render().skipRest();
  assert.equal(hook.alerts.at(-1)[2], undefined);
  hook.stop();
  assert.equal(hook.alerts.at(-1)[0], undefined);
  assert.equal(hook.intervals.size, 0);
});

test('rest alerts stay off unless enabled, and restoring elapsed time preserves the workout start', () => {
  const hook = timerHarness();
  let timer = hook.render({ userId: 'alice', restAlerts: false });
  timer.startRest(60);
  assert.equal(hook.alerts.filter(call => call[2]).length, 0);
  timer.restore({ startedAt: 1000, savedAt: 5000, elapsed: 10, paused: true });
  timer = hook.render();
  assert.equal(timer.startedAt, 1000);
  assert.equal(timer.elapsed, 10);
  assert.equal(timer.isPaused, true);
  hook.stop();
});
