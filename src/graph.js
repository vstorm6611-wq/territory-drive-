// กราฟถนน: nodes[i] = {x,y,adj:[{to,len}]}  (หน่วยเมตร)
export function loadGraph(d) {
  const n = d.nodes.map(([x, y]) => ({ x, y, adj: [] }));
  for (const [a, b] of d.edges) {
    const l = Math.hypot(n[a].x - n[b].x, n[a].y - n[b].y);
    if (l < 0.5) continue;
    n[a].adj.push({ to: b, len: l });
    n[b].adj.push({ to: a, len: l });
  }
  return n;
}

export function trace(prev, u) {
  const p = [];
  for (; u !== -1; u = prev.get(u)) p.push(u);
  return p.reverse();
}

// BFS นับ hop; ถ้ามี goal จะคืน {path} ของโหนดแรกที่ตรงเงื่อนไข
export function bfs(g, s, { skip = new Set(), goal = null, maxDepth = 99 } = {}) {
  const prev = new Map([[s, -1]]), dep = new Map([[s, 0]]), q = [s];
  for (let i = 0; i < q.length; i++) {
    const u = q[i];
    if (goal && goal(u)) return { path: trace(prev, u) };
    if (dep.get(u) >= maxDepth) continue;
    for (const { to } of g[u].adj) {
      if (prev.has(to) || skip.has(to)) continue;
      prev.set(to, u); dep.set(to, dep.get(u) + 1); q.push(to);
    }
  }
  return goal ? {} : { order: q, dep, prev };
}
