import { collection, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const userDoc = (uid: string) => doc(db, 'users', uid);
export const col = (
  uid: string,
  name: 'tasks' | 'routines' | 'routineDays' | 'lists' | 'prepTemplates' | 'preparations',
) => collection(db, 'users', uid, name);
export const sub = (uid: string, name: Parameters<typeof col>[1], id: string) =>
  doc(db, 'users', uid, name, id);
