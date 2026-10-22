/** Short random id for embedded items (checklist entries, template steps). */
export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
