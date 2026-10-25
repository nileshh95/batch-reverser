import type { TaskNode } from './SinglyLinkedList.ts';

export interface Pointers { groupPrev: string | null; kth: string | null; prev: string | null; cur: string | null }
export interface Snapshot { caption: string; pointers: Pointers; head: string | null; next: Record<string, string | null> }
export interface KGroupResult { head: TaskNode | null; batches: number; remainder: number; snapshots: Snapshot[] }

/**
 * Canonical Reverse Nodes in K-Group. Relinks `next` pointers in place (O(n) time, O(1) extra space
 * when `record` is false). With `record = true` it also emits snapshots (node ids + pointer positions)
 * for animation; run that on a throwaway copy of the list, since the nodes are mutated.
 */
export function reverseKGroup(head: TaskNode | null, k: number, record = false): KGroupResult {
  const all: TaskNode[] = [];
  for (let n = head; n; n = n.next) all.push(n);
  const dummy: TaskNode = { id: 'dummy', name: '', next: head };
  const snapshots: Snapshot[] = [];
  const id = (n?: TaskNode | null) => (n ? n.id : null);
  const snap = (caption: string, p: Partial<Record<keyof Pointers, TaskNode | null>>) => {
    if (!record) return;
    const next: Record<string, string | null> = {};
    for (const n of all) next[n.id] = id(n.next);
    snapshots.push({ caption, head: id(dummy.next), next,
      pointers: { groupPrev: id(p.groupPrev), kth: id(p.kth), prev: id(p.prev), cur: id(p.cur) } });
  };

  const valid = Number.isInteger(k) && k >= 1;
  let batches = 0;
  let groupPrev = dummy;
  while (valid) {
    let kth: TaskNode | null = groupPrev;
    for (let i = 0; i < k && kth; i++) kth = kth.next;
    if (!kth) { snap('The remaining tasks are fewer than K, so their order stays unchanged.', { groupPrev }); break; }
    snap('Find the K-th node of this batch.', { groupPrev, kth });

    const groupNext: TaskNode | null = kth.next;
    let prev: TaskNode | null = groupNext;
    let cur: TaskNode | null = groupPrev.next;
    while (cur !== groupNext) {
      const tmp: TaskNode | null = cur!.next;
      cur!.next = prev;
      prev = cur;
      cur = tmp;
      snap('Reverse the next pointer of the current node.', { groupPrev, kth, prev, cur });
    }
    const first = groupPrev.next!;
    groupPrev.next = kth;
    groupPrev = first;
    batches++;
    snap('Connect the reversed batch to the previous part of the list.', { groupPrev, kth });
  }
  return { head: dummy.next, batches, remainder: valid ? all.length - batches * k : all.length, snapshots };
}
