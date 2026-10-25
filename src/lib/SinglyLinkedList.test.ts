import { describe, expect, it } from 'vitest';
import { SinglyLinkedList as L } from './SinglyLinkedList.ts';
import { reverseKGroup } from './reverseKGroup.ts';

const A = 'ABCDEFGH'.split('');
const names = (l: L) => l.toArray().map((t) => t.name).join('');
const rev = (a: string[], k: number) => { const l = L.from(a); l.reverseKGroup(k); return names(l); };

describe('reverseKGroup', () => {
  const cases: [number, string][] = [[1, 'ABCDEFGH'], [2, 'BADCFEHG'], [3, 'CBAFEDGH'], [4, 'DCBAHGFE'], [9, 'ABCDEFGH']];
  for (const [k, exp] of cases) it(`K=${k}`, () => expect(rev(A, k)).toBe(exp));

  it('handles empty, single and invalid K', () => {
    expect(rev([], 3)).toBe('');
    expect(rev(['A'], 2)).toBe('A');
    expect(rev(A, 0)).toBe('ABCDEFGH');
  });
  it('keeps head/tail correct, ends in null, has no cycle', () => {
    const l = L.from(A);
    const res = l.reverseKGroup(3);
    expect([res.batches, res.remainder]).toEqual([2, 2]);
    expect(l.head!.name).toBe('C');
    expect(l.tail!.name).toBe('H');
    expect(l.tail!.next).toBeNull();
    let steps = 0;
    for (let n = l.head; n; n = n.next) expect(++steps).toBeLessThanOrEqual(8);
  });
  it('supports append and remove after reversal', () => {
    const l = L.from(A);
    l.reverseKGroup(3);
    l.append('I');
    expect(names(l)).toBe('CBAFEDGHI');
    l.remove(l.head!.id);
    l.remove(l.tail!.id);
    expect(names(l)).toBe('BAFEDGH');
    expect(l.tail!.name).toBe('H');
  });
  it('removes by id when names are duplicated', () => {
    const l = L.from(['x', 'x', 'x']);
    l.remove(l.toArray()[1].id);
    expect(l.getLength()).toBe(2);
  });
  it('undoes the last reversal', () => {
    const l = L.from(A);
    l.reverseKGroup(4);
    expect(l.restorePreviousOrder()).toBe(true);
    expect(names(l)).toBe('ABCDEFGH');
    expect(l.tail!.name).toBe('H');
  });
  it('records snapshots that end in the same order as the live run', () => {
    const l = L.from(A);
    const res = reverseKGroup(l.head, 3, true);
    const last = res.snapshots[res.snapshots.length - 1];
    expect(res.snapshots.length).toBeGreaterThan(0);
    expect(last.pointers.groupPrev).not.toBeNull();
    expect(names(l)).not.toBe('ABCDEFGH'); // mutated: callers must pass a copy
    expect(rev(A, 3)).toBe('CBAFEDGH');
  });
});
