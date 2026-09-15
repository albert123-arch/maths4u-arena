// MySQL's native JSON storage reorders object keys; hashes must not depend on
// their original insertion order. Array order (tasks, parts and images) is kept.
export function canonicalJson(value) {
  return JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a<b?-1:a>b?1:0)):item);
}
