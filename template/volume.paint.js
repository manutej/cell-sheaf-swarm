/* Design template: paint a SheafGraph. Do not restyle tokens. Color is glue. Gold is earned. */
/* volume.paint.js — design template. Load before volume.boot.js. Do not restyle tokens. */

var C = {
  paper: "#c1c494", ink: "#253122", ube: "#501345", ok: "#437742",
  gold: "#fdc57e", mauve: "#9a72aa", silver: "#b6bfc1",
  bad: "#ae5224", odd: "#c47b2b", miss: "#6d6a55", down: "#8c4c62",
};
var SC = { ok: C.ok, strange: C.odd, broken: C.bad, missing: C.miss };
var VIEWS = ["pillars", "rho", "strata", "harmonic", "trunk", "subspaces"];
var CAM = {
  pillars: [0.55, 0.46], rho: [0.85, 0.5], strata: [0.4, 0.62],
  harmonic: [0.95, 0.44], trunk: [0.7, 0.38], subspaces: [0.48, 0.58],
};
var BLURB = {
  pillars: "What exists. Height is how much the folder holds.",
  rho: "What restricts. Heavy curves are the ones that do not commute.",
  strata: "What stacks. Kind becomes height.",
  harmonic: "What is already known, and what is still dark.",
  trunk: "What may fold. Only a consistent map is thick. Gold is earned.",
  subspaces: "What type lives on which folder.",
};
var UP = ["README", "BRIEF", "HANDOFF"];
var DN = ["ci", "hook", "release"];

var root = document.documentElement;
var BASE = root.dataset.base || "./";
var CONTRACTS = root.dataset.contracts || `${BASE}contracts/`;

var graph = null;
var catalog = [];
var view = "pillars";
var paused = true;
var fan = null;
var fanDir = "up";
var pin = null;
var yaw = 0.55;
var pitch = 0.46;
var W = 0;
var H = 0;
var drag = 0;
var lx = 0;
var ly = 0;
var sdx = 0;
var sdy = 0;
var moved = 0;
var L = { nodes: [], edges: [] };

var coarse = matchMedia("(pointer:coarse)").matches || innerWidth <= 900;
var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
var canvas = document.getElementById("c");
var ctx = canvas.getContext("2d");

function hex(h, a) {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function project(p) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x1 = p.x * cy - p.z * sy, z1 = p.x * sy + p.z * cy;
  const y1 = p.y * cp - z1 * sp, z2 = p.y * sp + z1 * cp;
  const f = 560 / (560 + z2 + 110);
  return { x: W * 0.42 + x1 * f * 2.9, y: H * 0.56 + y1 * f * 2.9, z: z2, f };
}
function q(a, c, b, t) {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y, z: u * u * a.z + 2 * u * t * c.z + t * t * b.z };
}
function showRho(e) {
  if (e.role === "fan") return true;
  if (view === "subspaces") return e.role === "drop" || e.role === "type" || e.role === "holds";
  if (view === "trunk") return e.role === "core" && e.st === "ok";
  if (view === "pillars") return e.role === "core" && e.st !== "ok";
  if (view === "rho" || view === "strata" || view === "harmonic") return e.role === "core";
  return true;
}

function layout() {
  if (!graph) return { nodes: [], edges: [] };
  const nodes = [];
  const ix = {};
  const commits = graph.commits || [];
  for (const r of graph.pillars) {
    const cms = commits.filter((c) => c.pillar === r.id);
    const o = {
      ...r,
      role: "core",
      y: view === "strata" ? ({ core: 36, lib: 24, app: 12, mem: 0 }[r.kind] || 8) : 0,
      h: 18 + r.dim * 8 + cms.length * 9,
      color: r.known ? C.ok : C.down,
      commits: cms,
    };
    nodes.push(o);
    ix[o.id] = o;
  }
  const edges = [];
  for (const r of graph.restrictions) {
    const a = ix[r.source], b = ix[r.target];
    if (!a || !b) continue;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 8, z: (a.z + b.z) / 2 };
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
    edges.push({
      id: r.id, s: r.source, t: r.target, rel: r.relation, kind: r.kind, st: r.status,
      d: r.residual, meaning: r.residualMeaning, a, b, mid,
      ctrl: { x: mid.x - (dz / len) * 20, y: mid.y + 16, z: mid.z + (dx / len) * 20 },
      role: "core",
    });
  }
  if (view === "subspaces") {
    for (const ty of graph.types || []) {
      const o = { ...ty, role: "type", y: 78, h: 8, color: C.ube, known: true, dim: 6, kind: "core" };
      nodes.push(o);
      ix[o.id] = o;
    }
    (graph.artifacts || []).forEach((art, i) => {
      const ty = ix[art.type], host = ix[art.maps];
      if (!ty) return;
      const th = -0.8 + (1.6 * (i % 3)) / 2;
      const o = {
        id: art.id, folder: art.folder, role: "art", type: art.type, maps: art.maps,
        st: art.status, y: 58, h: 8, x: ty.x + Math.cos(th) * 26, z: ty.z + Math.sin(th) * 20,
        color: SC[art.status], kind: "app", known: true, dim: 2,
      };
      nodes.push(o);
      ix[o.id] = o;
      if (host) {
        const mid = { x: (o.x + host.x) / 2, y: 30, z: (o.z + host.z) / 2 };
        edges.push({
          id: "d-" + art.id, s: o.id, t: host.id, rel: "lives-at", kind: "projection",
          st: art.status, d: art.status === "ok" ? 0.05 : 0.4, a: o, b: host, mid,
          ctrl: { x: mid.x, y: 38, z: mid.z }, role: "drop",
        });
      }
    });
  }
  if (fan && ix[fan]) {
    const p = ix[fan];
    for (let i = 0; i < 3; i++) {
      const th = -0.8 + (1.6 * i) / 2;
      const y = fanDir === "up" ? p.h + 26 : -22;
      const o = {
        id: "f" + i, folder: (fanDir === "up" ? UP : DN)[i], role: "fan", y, h: 10,
        x: p.x + Math.cos(th) * 40, z: p.z + Math.sin(th) * 30,
        color: fanDir === "up" ? C.mauve : C.down, kind: "mem", known: true, dim: 1,
      };
      nodes.push(o);
      const mid = { x: (p.x + o.x) / 2, y: (p.y + o.y) / 2, z: (p.z + o.z) / 2 };
      edges.push({
        id: "fan" + i, s: p.id, t: o.id, rel: fanDir, kind: "embed", st: "ok", d: 0.1,
        a: p, b: o, mid, ctrl: mid, role: "fan",
      });
    }
  }
  return { nodes, edges };
}

function drawPillar(n, bot, on) {
  const top = project({ x: n.x, y: n.y + n.h, z: n.z });
  const rx = 8.4 * bot.f, ry = 3.2 * bot.f, rxt = 8.4 * top.f, ryt = 3.2 * top.f;
  ctx.beginPath();
  ctx.moveTo(bot.x - rx, bot.y);
  ctx.lineTo(top.x - rxt, top.y);
  ctx.lineTo(top.x + rxt, top.y);
  ctx.lineTo(bot.x + rx, bot.y);
  ctx.closePath();
  ctx.fillStyle = hex(n.color, on ? 0.55 : 0.14);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(top.x, top.y, rxt, ryt, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(n.color, on ? 0.92 : 0.22);
  ctx.fill();
  ctx.strokeStyle = pin && pin.n && pin.n.id === n.id ? C.gold : hex(C.ink, on ? 0.4 : 0.1);
  ctx.lineWidth = pin && pin.n && pin.n.id === n.id ? 1.6 : 0.7;
  ctx.stroke();
  (n.commits || []).slice(0, 5).forEach((c, i) => {
    const p = project({ x: n.x, y: n.y + 12 + ((i + 1) * (n.h - 16)) / ((n.commits.length || 1) + 1), z: n.z });
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 * p.f, 0, Math.PI * 2);
    ctx.fillStyle = c.onTrunk ? C.gold : C.silver;
    ctx.fill();
  });
  if (on) {
    ctx.fillStyle = hex(C.ink, 0.82);
    ctx.font = `600 ${Math.max(9, 11 * bot.f)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(n.folder, bot.x, bot.y + 15 * bot.f);
  }
}

function paint() {
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.28, H * 0.12, 8, W * 0.5, H * 0.55, Math.max(W, H) * 0.7);
  g.addColorStop(0, hex(C.ube, 0.07));
  g.addColorStop(0.6, hex(C.paper, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const keep = (function () {
    if (!pin) return null;
    if (pin.k === "edge") return { nodes: new Set([pin.e.s, pin.e.t]), edge: pin.e.id };
    const nodes = new Set([pin.n.id]);
    let edge = null;
    for (const e of L.edges) {
      if (e.s === pin.n.id || e.t === pin.n.id || e.a.id === pin.n.id || e.b.id === pin.n.id) {
        nodes.add(e.s || e.a.id);
        nodes.add(e.t || e.b.id);
      }
    }
    return { nodes, edge };
  })();
  const rank = { broken: 0, missing: 1, strange: 2, ok: 3 };
  const word = (s) => (s === "broken" ? "won't fold" : s === "missing" ? "no map" : s === "strange" ? "needs a person" : "");
  const labeled = [];
  L.edges.forEach((e) => {
    if (!showRho(e) && e.role !== "fan") return;
    const idA = e.s || e.a.id;
    const idB = e.t || e.b.id;
    const on = !keep || keep.nodes.has(idA) || keep.nodes.has(idB);
    const hot = e.st !== "ok";
    const a = project({ x: e.a.x, y: e.a.y + e.a.h * 0.45, z: e.a.z });
    const b = project({ x: e.b.x, y: e.b.y + e.b.h * 0.45, z: e.b.z });
    const c = project(e.ctrl);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    ctx.strokeStyle = SC[e.st] || C.ink;
    ctx.globalAlpha = !on ? 0.06 : view === "trunk" && e.st === "ok" ? 0.92 : hot ? 0.9 : 0.2;
    ctx.lineWidth = !on ? 1 : view === "trunk" && e.st === "ok" ? 2.6 : hot ? 2.3 : 1.05;
    ctx.setLineDash(e.st === "missing" ? [4, 5] : e.st === "strange" ? [8, 4] : []);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    if (on && (hot || (keep && keep.edge === e.id))) labeled.push(e);
  });
  labeled.sort((a, b) => {
    const fa = typeof fixOf === "function" ? fixOf(a.id) : null;
    const fb = typeof fixOf === "function" ? fixOf(b.id) : null;
    const sa = fa ? (fa.closes ? -100 : 0) - fa.opens.length * 10 + (rank[a.st] || 9) : rank[a.st] || 9;
    const sb = fb ? (fb.closes ? -100 : 0) - fb.opens.length * 10 + (rank[b.st] || 9) : rank[b.st] || 9;
    return sa - sb;
  }).slice(0, 3).forEach((e) => {
    const m = project(e.mid);
    const f = typeof fixOf === "function" ? fixOf(e.id) : null;
    const text = f && f.closes ? "closes the trunk" : f && f.opens.length ? "opens " + f.opens[0] : word(e.st) ? e.rel + " · " + word(e.st) : e.rel;
    ctx.font = "600 11px sans-serif";
    ctx.textAlign = "center";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = hex(C.paper, 0.9);
    ctx.fillRect(m.x - tw / 2 - 5, m.y - 18, tw + 10, 15);
    ctx.fillStyle = C.ink;
    ctx.fillText(text, m.x, m.y - 7);
  });
  L.nodes
    .map((n) => ({ n, p: project({ x: n.x, y: n.y, z: n.z }) }))
    .sort((a, b) => a.p.z - b.p.z)
    .forEach(({ n, p }) => {
      if (n.role === "type") {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 24 * p.f, 10 * p.f, 0, 0, Math.PI * 2);
        ctx.fillStyle = hex(C.ube, 0.16);
        ctx.fill();
        ctx.strokeStyle = C.ube;
        ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.font = "600 11px serif";
        ctx.textAlign = "center";
        ctx.fillText(n.folder, p.x, p.y - 12);
        return;
      }
      if (n.role === "art" || n.role === "fan") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.fillStyle = C.ink;
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(n.folder, p.x, p.y + 14);
        return;
      }
      drawPillar(n, p, !keep || keep.nodes.has(n.id));
    });
}

