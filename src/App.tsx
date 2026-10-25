import { useEffect, useReducer, useState } from 'react';
import { Check, Eraser, FileText, Moon, Pencil, Plus, Repeat, Sun, Trash2, Undo2 } from 'lucide-react';
import { SinglyLinkedList } from './lib/SinglyLinkedList.ts';

const KEY = 'batch-reverser:v1';
const MAX_NAME = 80;
const MAX_TASKS = 200;
const SAMPLE = ['Invoice.pdf', 'Contract.docx', 'Report.xlsx', 'MeetingNotes.docx', 'Receipt.pdf', 'Budget.xlsx', 'ProjectPlan.pdf', 'Summary.docx'];
const PENDING = 'Pending batch (not enough tasks, order kept)';

interface Run { before: string[]; after: string[]; k: number; batches: number; remainder: number }

function load(): { names: string[]; k: number } {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (d && Array.isArray(d.names) && d.names.every((n: unknown) => typeof n === 'string')) {
      const k = Number.isInteger(d.k) && d.k >= 1 && d.k <= 50 ? d.k : 3;
      return { names: d.names.slice(0, MAX_TASKS).map((n: string) => n.slice(0, MAX_NAME)), k };
    }
  } catch { /* ignore corrupt or outdated data */ }
  return { names: [], k: 3 };
}

/** Display-only helper: splits an already-ordered array into batch labels. */
function chunk<T>(items: T[], k: number) {
  const out: { items: T[]; complete: boolean }[] = [];
  for (let i = 0; i < items.length; i += k) {
    const s = items.slice(i, i + k);
    out.push({ items: s, complete: s.length === k });
  }
  return out;
}

export default function App() {
  const [init] = useState(load);
  const [list] = useState(() => SinglyLinkedList.from(init.names));
  const [k, setK] = useState(init.k);
  const [ver, bump] = useReducer((x: number) => x + 1, 0);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [compare, setCompare] = useState(false);
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  const tasks = list.toArray();
  const n = tasks.length;

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ names: list.toArray().map((t) => t.name), k })); } catch { /* storage full or blocked */ }
  }, [ver, k, list]);

  const change = (fn: () => void) => { fn(); setRun(null); setError(''); bump(); };
  const validName = (v: string) => {
    const s = v.trim();
    if (!s) { setError('Enter a document name first.'); return null; }
    if (s.length > MAX_NAME) { setError(`Names are limited to ${MAX_NAME} characters.`); return null; }
    return s;
  };

  const add = () => {
    if (n >= MAX_TASKS) return setError(`The queue is limited to ${MAX_TASKS} tasks.`);
    const s = validName(text);
    if (s) { change(() => list.append(s)); setText(''); }
  };
  const saveEdit = () => {
    if (!editing) return;
    const s = validName(editing.draft);
    if (s) { change(() => list.update(editing.id, s)); setEditing(null); }
  };
  const setKSafe = (v: number) => setK(Number.isFinite(v) ? Math.min(50, Math.max(1, Math.floor(v))) : 1);
  const reverse = () => {
    const before = tasks.map((t) => t.name);
    const res = list.reverseKGroup(k);
    setRun({ before, after: list.toArray().map((t) => t.name), k, batches: res.batches, remainder: res.remainder });
    bump();
  };
  const undo = () => { list.restorePreviousOrder(); setRun(null); bump(); };
  const clearSaved = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } change(() => { list.clear(); }); };

  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800';
  const primary = 'inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40';
  const card = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900';

  let pos = 0;
  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Batch Reverser</h1>
            <p className="text-sm text-slate-500">Document queue backed by a singly linked list. Reverse it in groups of K.</p>
          </div>
          <button className={btn} onClick={() => setDark(!dark)} aria-label="Toggle dark mode">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
        </header>

        <section className={card} aria-label="Task manager">
          <div className="flex flex-wrap gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="Document name, e.g. Invoice.pdf" aria-label="Document name"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
            <button className={primary} onClick={add}><Plus size={16} />Add Task</button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">{n} {n === 1 ? 'task' : 'tasks'}</span>
            <button className={btn} onClick={() => change(() => SAMPLE.forEach((s) => list.append(s)))} disabled={n + SAMPLE.length > MAX_TASKS}>Load Sample Tasks</button>
            <button className={btn} onClick={() => change(() => list.clear())} disabled={!n}><Eraser size={14} />Clear Queue</button>
            <button className={btn} onClick={clearSaved}>Clear Saved Queue</button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <label className="flex items-center gap-2 text-sm">Batch size K
              <button className={btn} onClick={() => setKSafe(k - 1)} aria-label="Decrease K">−</button>
              <input type="number" min={1} max={50} value={k} onChange={(e) => setKSafe(e.target.valueAsNumber)}
                className="w-16 rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-center dark:border-slate-700" />
              <button className={btn} onClick={() => setKSafe(k + 1)} aria-label="Increase K">+</button>
            </label>
            <button className={primary} onClick={reverse} disabled={!n}><Repeat size={16} />Reverse Batches</button>
            {list.canUndo() && <button className={btn} onClick={undo}><Undo2 size={14} />Undo Reversal</button>}
          </div>
        </section>

        <section aria-label="Queue" className="space-y-4">
          {n === 0 && <p className={`${card} text-center text-sm text-slate-500`}>The queue is empty. Add a document or load the sample tasks.</p>}
          {chunk(tasks, k).map((g, bi) => (
            <div key={bi}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                {g.complete ? `Batch ${bi + 1}` : PENDING}
              </h2>
              <ul className="flex flex-wrap items-center gap-y-2">
                {g.items.map((t) => {
                  pos++;
                  const last = pos === n;
                  return (
                    <li key={t.id} className="flex items-center">
                      <div className={`${card} w-48 !p-3`}>
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="shrink-0 text-indigo-500" />
                          {editing?.id === t.id ? (
                            <input autoFocus value={editing.draft} aria-label="Edit document name"
                              onChange={(e) => setEditing({ id: t.id, draft: e.target.value })}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }}
                              className="min-w-0 flex-1 rounded border border-slate-300 bg-transparent px-1 text-sm dark:border-slate-600" />
                          ) : <span className="truncate text-sm font-medium" title={t.name}>{t.name}</span>}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                          <span>#{pos} · {g.complete ? `Batch ${bi + 1}` : 'Pending'}</span>
                          <span className="flex gap-1">
                            {editing?.id === t.id
                              ? <button onClick={saveEdit} aria-label={`Save ${t.name}`}><Check size={14} /></button>
                              : <button onClick={() => setEditing({ id: t.id, draft: t.name })} aria-label={`Edit ${t.name}`}><Pencil size={14} /></button>}
                            <button onClick={() => change(() => list.remove(t.id))} aria-label={`Delete ${t.name}`}><Trash2 size={14} /></button>
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 font-mono text-xs text-slate-400" aria-hidden>{last ? '→ null' : '→'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        {run && (
          <section className={card} aria-label="Before and after">
            <h2 className="mb-3 font-medium">Before → After (K = {run.k})</h2>
            <p className="font-mono text-xs text-slate-500">Before: {run.before.join(' → ')}</p>
            <p className="mt-1 font-mono text-xs">After: {run.after.join(' → ')}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {chunk(run.before, run.k).map((g, i) => {
                const out = run.after.slice(i * run.k, i * run.k + g.items.length);
                return <li key={i}><b>{g.complete ? `Batch ${i + 1}` : 'Pending batch'}:</b> {g.items.join(', ')} → {g.complete ? out.join(', ') : 'unchanged'}</li>;
              })}
            </ul>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-3 dark:text-slate-300">
              <div>Total tasks: {run.before.length}</div>
              <div>Batches reversed: {run.batches}</div>
              <div>Unchanged remainder: {run.remainder}</div>
              <div>Order changed: {run.before.join('\n') !== run.after.join('\n') ? 'yes' : 'no'}</div>
              <div>Time: O(n)</div>
              <div>Auxiliary space: O(1)</div>
            </dl>
          </section>
        )}

        <section className={card}>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />Compare K Values
          </label>
          {compare && (
            <div className="mt-3 space-y-3">
              {n === 0 && <p className="text-sm text-slate-500">Add tasks to compare.</p>}
              {n > 0 && [2, 3, 4].map((kk) => {
                const copy = SinglyLinkedList.from(tasks.map((t) => t.name));
                const res = copy.reverseKGroup(kk);
                const out = copy.toArray().map((t) => t.name);
                return (
                  <div key={kk} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                    <b>K = {kk}</b> · {res.batches} complete {res.batches === 1 ? 'group' : 'groups'} reversed
                    <p className="mt-1 font-mono text-xs">
                      {chunk(out, kk).map((g) => (g.complete ? `[ ${g.items.join(' → ')} ]` : `( ${g.items.join(' → ')} ) unchanged remainder`)).join('  ')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="pb-6 text-center text-xs text-slate-500">
          Reverse nodes in K-groups: O(n) time, O(1) auxiliary space. GitHub: <a className="underline" href="https://github.com/nileshh95/batch-reverser">nileshh95/batch-reverser</a>
        </footer>
      </main>
    </div>
  );
}
