import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const task = (over: Record<string, unknown> = {}) => ({
  title: 'Appeler la mutuelle',
  status: 'open',
  priority: 2,
  horizon: 'week',
  notes: null,
  estimateMin: 10,
  dueAt: null,
  dueHasTime: false,
  checklist: [],
  order: 1,
  createdAt: Timestamp.now(),
  ...over,
});

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-listo',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe('ownership', () => {
  it('lets a user read and write their own data', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users/alice'), { settings: { timezone: 'Europe/Paris' } }),
    );
    await assertSucceeds(setDoc(doc(db, 'users/alice/tasks/t1'), task()));
    await assertSucceeds(getDoc(doc(db, 'users/alice/tasks/t1')));
    await assertSucceeds(setDoc(doc(db, 'users/alice/lists/l1'), { name: 'Valise', items: [] }));
    await assertSucceeds(
      setDoc(doc(db, 'users/alice/routineDays/2026-10-22'), { planned: [], done: [] }),
    );
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/tasks/t1')));
  });

  it("forbids access to someone else's data", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/alice/tasks/t1'), task());
    });
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bob, 'users/alice/tasks/t1')));
    await assertFails(setDoc(doc(bob, 'users/alice/tasks/t2'), task()));
    await assertFails(getDoc(doc(bob, 'users/alice')));
  });

  it('forbids anonymous access', async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'users/alice/tasks/t1')));
    await assertFails(setDoc(doc(anon, 'users/alice/tasks/t1'), task()));
  });

  it('rejects unknown collections', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/secrets/x'), { a: 1 }));
  });
});

describe('task validation', () => {
  it('rejects invalid enums and types', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const ref = doc(db, 'users/alice/tasks/t1');
    await assertFails(setDoc(ref, task({ status: 'deleted' })));
    await assertFails(setDoc(ref, task({ priority: 4 })));
    await assertFails(setDoc(ref, task({ priority: '1' })));
    await assertFails(setDoc(ref, task({ horizon: 'later' })));
    await assertFails(setDoc(ref, task({ title: '' })));
    await assertFails(setDoc(ref, task({ dueAt: '2026-10-22' })));
    await assertFails(setDoc(ref, { status: 'open', priority: 2 }));
  });

  it('accepts valid updates and rejects invalid ones', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const ref = doc(db, 'users/alice/tasks/t1');
    await assertSucceeds(setDoc(ref, task()));
    await assertSucceeds(updateDoc(ref, { status: 'done', completedAt: Timestamp.now() }));
    await assertSucceeds(updateDoc(ref, { horizon: null, dueAt: Timestamp.now() }));
    await assertFails(updateDoc(ref, { status: 'archived' }));
    await assertFails(updateDoc(ref, { priority: 0 }));
  });

  it('validates routine days', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/routineDays/today'), { planned: [], done: [] }));
    await assertFails(setDoc(doc(db, 'users/alice/routineDays/2026-10-22'), { planned: 'a' }));
  });
});
