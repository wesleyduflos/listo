/** "T-shirts x3" → { label: "T-shirts", qty: 3 } */
export function parseItem(raw: string): { label: string; qty?: number } {
  const m = raw.trim().match(/^(.*?)\s*[x×]\s*(\d+)$/i);
  if (m && m[1]) return { label: m[1], qty: Number(m[2]) };
  return { label: raw.trim() };
}
