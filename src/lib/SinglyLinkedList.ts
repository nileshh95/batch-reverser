import { reverseKGroup as reverseNodes, type KGroupResult } from './reverseKGroup.ts';

export interface TaskNode { id: string; name: string; next: TaskNode | null }

let seq = 0;
const makeId = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;

export class SinglyLinkedList {
  head: TaskNode | null = null;
  tail: TaskNode | null = null;
  private backup: string[] | null = null; // node ids in the order before the last reversal

  static from(names: string[]): SinglyLinkedList {
    const list = new SinglyLinkedList();
    names.forEach((n) => list.append(n));
    return list;
  }

  append(name: string): TaskNode {
    const node: TaskNode = { id: makeId(), name, next: null };
    if (this.tail) this.tail.next = node; else this.head = node;
    this.tail = node;
    this.backup = null;
    return node;
  }

  insertAt(position: number, name: string): TaskNode {
    if (position >= this.getLength()) return this.append(name);
    const node: TaskNode = { id: makeId(), name, next: null };
    if (position <= 0) { node.next = this.head; this.head = node; }
    else {
      let p = this.head!;
      for (let i = 1; i < position; i++) p = p.next!;
      node.next = p.next;
      p.next = node;
    }
    this.backup = null;
    return node;
  }

  update(id: string, name: string): boolean {
    for (let n = this.head; n; n = n.next) if (n.id === id) { n.name = name; return true; }
    return false;
  }

  remove(id: string): boolean {
    let prev: TaskNode | null = null;
    for (let cur = this.head; cur; prev = cur, cur = cur.next) {
      if (cur.id !== id) continue;
      if (prev) prev.next = cur.next; else this.head = cur.next;
      if (cur === this.tail) this.tail = prev;
      this.backup = null;
      return true;
    }
    return false;
  }

  clear(): void { this.head = this.tail = this.backup = null; }

  toArray(): { id: string; name: string }[] {
    const out: { id: string; name: string }[] = [];
    for (let n = this.head; n; n = n.next) out.push({ id: n.id, name: n.name });
    return out;
  }

  getLength(): number {
    let c = 0;
    for (let n = this.head; n; n = n.next) c++;
    return c;
  }

  canUndo(): boolean { return this.backup !== null; }

  reverseKGroup(k: number): KGroupResult {
    const before = this.toArray().map((t) => t.id);
    const res = reverseNodes(this.head, k);
    this.head = res.head;
    this.tail = null;
    for (let n = this.head; n; n = n.next) this.tail = n;
    if (res.batches > 0) this.backup = before;
    return res;
  }

  restorePreviousOrder(): boolean {
    if (!this.backup) return false;
    const byId = new Map<string, TaskNode>();
    for (let n = this.head; n; n = n.next) byId.set(n.id, n);
    let prev: TaskNode | null = null;
    this.head = null;
    for (const id of this.backup) {
      const n = byId.get(id)!;
      n.next = null;
      if (prev) prev.next = n; else this.head = n;
      prev = n;
    }
    this.tail = prev;
    this.backup = null;
    return true;
  }
}
