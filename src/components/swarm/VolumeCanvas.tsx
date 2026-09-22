import { useCallback, useEffect, useRef } from "react";
import { MODES_LIST, useSwarm } from "@/lib/swarm/store";
import type { GlueStatus, ViewMode } from "@/lib/swarm/types";

const COL: Record<GlueStatus, string> = {
  ok: "#437742",
  strange: "#c47b2b",
  broken: "#ae5224",
  missing: "#6d6a55",
};
const INK = "#253122";
const GOLD = "#fdc57e";
const PULSE = "#009465";
const UBE = "#501345";
const SILVER = "#b6bfc1";
const DOWN = "#8c4c62";
const PAPER = "#c1c494";

type Pt = { x: number; y: number; z: number };
type Proj = { x: number; y: number; z: number; f: number };

function hex(h: string, a: number) {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function showRho(mode: ViewMode, role: string, status: GlueStatus) {
  if (mode === "swarm") return role === "core";
  if (mode === "commits") return role === "core" && status === "ok";
  if (mode === "live") return role === "core";
  if (mode === "operad") return role === "core" || role === "operad";
  if (mode === "eval") return role === "core";
  if (mode === "subspaces") return role === "drop" || role === "type" || role === "holds";
  return true;
}

export function VolumeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const yaw = useRef(0.55);
  const pitch = useRef(0.46);
  const drag = useRef(false);
  const lx = useRef(0);
  const ly = useRef(0);
  const sdx = useRef(0);
  const sdy = useRef(0);
  const moved = useRef(0);
  const gesture = useRef<"none" | "orbit" | "swipe">("none");
  const size = useRef({ w: 0, h: 0 });
  const reduce = useRef(false);

  const project = useCallback((p: Pt): Proj => {
    const cy = Math.cos(yaw.current);
    const sy = Math.sin(yaw.current);
    const cp = Math.cos(pitch.current);
    const sp = Math.sin(pitch.current);
    const x1 = p.x * cy - p.z * sy;
    const z1 = p.x * sy + p.z * cy;
    const y1 = p.y * cp - z1 * sp;
    const z2 = p.y * sp + z1 * cp;
    const f = 560 / (560 + z2 + 120);
    const { w, h } = size.current;
    return { x: w * 0.46 + x1 * f * 2.9, y: h * 0.58 + y1 * f * 2.9, z: z2, f };
  }, []);

  useEffect(() => {
    reduce.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const resize = () => {
      const r = c.parentElement!.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      size.current = { w: r.width, h: r.height };
      c.width = r.width * dpr;
      c.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c.parentElement!);

    const paint = () => {
      const st = useSwarm.getState();
      const graph = st.graph;
      const PILLARS = graph.pillars;
      const RESTRICTIONS = graph.restrictions;
      const TYPES = graph.types ?? [];
      const ARTS = graph.artifacts ?? [];
      const OPERAD = graph.operad ?? [];
      const { w, h } = size.current;
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w * 0.28, h * 0.12, 8, w * 0.5, h * 0.55, Math.max(w, h) * 0.7);
      g.addColorStop(0, hex(UBE, 0.07));
      g.addColorStop(0.6, hex(PAPER, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const mode = st.mode;
      const pillars = PILLARS.map((p) => {
        const y = mode === "eval" ? ({ core: 28, lib: 18, app: 8, mem: 0 }[p.kind] ?? 0) : 0;
        const hgt = 16 + p.dim * 9 + 28;
        return { ...p, y, h: hgt, color: p.known ? "#437742" : DOWN };
      });
      const index = Object.fromEntries(pillars.map((p) => [p.id, p]));

      type Edge = {
        s: string;
        t: string;
        st: GlueStatus;
        rel: string;
        kind: string;
        role: string;
        a: { x: number; y: number; z: number; h: number };
        b: { x: number; y: number; z: number; h: number };
        ctrl: Pt;
        mid: Pt;
        id: string;
      };
      const edges: Edge[] = [];
      for (const r of RESTRICTIONS) {
        const a = index[r.source];
        const b = index[r.target];
        if (!a || !b) continue;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 10, z: (a.z + b.z) / 2 };
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz) || 1;
        edges.push({
          id: r.id,
          s: r.source,
          t: r.target,
          st: r.status,
          rel: r.relation,
          kind: r.kind,
          role: "core",
          a,
          b,
          ctrl: { x: mid.x - (dz / len) * 22, y: mid.y + 16, z: mid.z + (dx / len) * 22 },
          mid,
        });
      }

      if (mode === "subspaces") {
        TYPES.forEach((ty) => {
          const o = { ...ty, y: 78, h: 8, color: UBE, kind: "core" as const, known: true, dim: 6 };
          index[ty.id] = o as (typeof pillars)[0];
        });
        ARTS.forEach((art, i) => {
          const ty = TYPES.find((t) => t.id === art.type);
          const host = index[art.maps];
          if (!ty || !host) return;
          const th = -0.7 + 1.4 * ((i % 3) / 2);
          const node = {
            id: art.id,
            folder: art.folder,
            x: ty.x + Math.cos(th) * 26,
            z: ty.z + Math.sin(th) * 20,
            y: 58,
            h: 8,
            color: COL[art.status],
            kind: "app" as const,
            known: true,
            dim: 2,
          };
          index[art.id] = node;
          edges.push({
            id: "d-" + art.id,
            s: art.id,
            t: art.maps,
            st: art.status,
            rel: "lives-at",
            kind: "projection",
            role: "drop",
            a: node,
            b: host,
            ctrl: { x: (node.x + host.x) / 2, y: 36, z: (node.z + host.z) / 2 },
            mid: { x: (node.x + host.x) / 2, y: 36, z: (node.z + host.z) / 2 },
          });
        });
      }

      const sel = st.selected;
      const focus = st.focusEdge ? edges.find((e) => e.id === st.focusEdge) : undefined;
      const keep = focus
        ? new Set([focus.s, focus.t])
        : sel
          ? new Set([sel, ...edges.filter((e) => e.s === sel || e.t === sel).flatMap((e) => [e.s, e.t])])
          : null;
      const rank: Record<GlueStatus, number> = { broken: 0, missing: 1, strange: 2, ok: 3 };
      const word = (s: GlueStatus) =>
        s === "broken" ? "won't fold" : s === "missing" ? "no map" : s === "strange" ? "needs a person" : "";
      const visible: typeof edges = [];

      for (const e of edges) {
        if (!showRho(mode, e.role, e.st)) continue;
        const on = !keep || keep.has(e.s) || keep.has(e.t);
        const hot = e.st !== "ok";
        const A = project({ x: e.a.x, y: e.a.y + e.a.h * 0.45, z: e.a.z });
        const B = project({ x: e.b.x, y: e.b.y + e.b.h * 0.45, z: e.b.z });
        const C = project(e.ctrl);
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.quadraticCurveTo(C.x, C.y, B.x, B.y);
        ctx.setLineDash(e.st === "missing" ? [4, 5] : e.st === "strange" ? [8, 4] : []);
        ctx.strokeStyle = COL[e.st];
        ctx.globalAlpha = !on ? 0.06 : mode === "commits" && e.st === "ok" ? 0.92 : hot ? 0.9 : 0.2;
        ctx.lineWidth = !on ? 1 : mode === "commits" && e.st === "ok" ? 2.8 : hot ? 2.3 : 1.1;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
        if (on) visible.push(e);
      }
      visible
        .filter((e) => (!focus ? e.st !== "ok" : e.id === focus.id))
        .sort((a, b) => rank[a.st] - rank[b.st])
        .slice(0, 3)
        .forEach((e) => {
          if (mode === "subspaces" && e.role !== "drop") return;
          const m = project(e.mid);
          const text = word(e.st) ? `${e.rel} · ${word(e.st)}` : e.rel;
          ctx.font = "600 11px sans-serif";
          ctx.textAlign = "center";
          const tw = ctx.measureText(text).width;
          ctx.fillStyle = hex(PAPER, 0.9);
          ctx.fillRect(m.x - tw / 2 - 5, m.y - 18, tw + 10, 15);
          ctx.fillStyle = INK;
          ctx.fillText(text, m.x, m.y - 7);
        });

      const drawPillar = (n: (typeof pillars)[0], on: boolean) => {
        const bot = project({ x: n.x, y: n.y, z: n.z });
        const top = project({ x: n.x, y: n.y + n.h, z: n.z });
        const rx = 8.4 * bot.f;
        const ry = 3.4 * bot.f;
        const rxt = 8.4 * top.f;
        const ryt = 3.4 * top.f;
        ctx.beginPath();
        ctx.moveTo(bot.x - rx, bot.y);
        ctx.lineTo(top.x - rxt, top.y);
        ctx.lineTo(top.x + rxt, top.y);
        ctx.lineTo(bot.x + rx, bot.y);
        ctx.closePath();
        ctx.fillStyle = hex(n.color, on ? 0.55 : 0.12);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(top.x, top.y, rxt, ryt, 0, 0, Math.PI * 2);
        ctx.fillStyle = hex(n.color, on ? 0.95 : 0.28);
        ctx.fill();
        ctx.strokeStyle = sel === n.id ? GOLD : hex(INK, on ? 0.4 : 0.1);
        ctx.lineWidth = sel === n.id ? 1.8 : 0.7;
        ctx.stroke();
        const cms = st.commits.filter((c) => c.pillar === n.id).slice(0, 5);
        cms.forEach((cm, i) => {
          const yy = n.y + 10 + ((i + 1) * (n.h - 16)) / (cms.length + 1);
          const p = project({ x: n.x, y: yy, z: n.z });
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.1 * p.f, 0, Math.PI * 2);
          ctx.fillStyle = cm.onTrunk ? GOLD : SILVER;
          ctx.fill();
        });
        if (on) {
          ctx.fillStyle = hex(INK, 0.82);
          ctx.font = `600 ${Math.max(10, 11.5 * bot.f)}px ${getComputedStyle(document.body).fontFamily}`;
          ctx.textAlign = "center";
          ctx.fillText(n.folder, bot.x, bot.y + 16 * bot.f);
        }
      };

      pillars
        .map((n) => ({ n, p: project({ x: n.x, y: n.y, z: n.z }) }))
        .sort((a, b) => a.p.z - b.p.z)
        .forEach(({ n }) => drawPillar(n, !keep || keep.has(n.id)));

      if (mode === "subspaces") {
        TYPES.forEach((ty) => {
          const p = project({ x: ty.x, y: 78, z: ty.z });
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 26 * p.f, 11 * p.f, 0, 0, Math.PI * 2);
          ctx.fillStyle = hex(UBE, 0.14);
          ctx.fill();
          ctx.strokeStyle = hex(UBE, 0.8);
          ctx.lineWidth = 1.3;
          ctx.stroke();
          ctx.fillStyle = hex(INK, 0.82);
          ctx.font = `600 ${Math.max(10, 12 * p.f)}px serif`;
          ctx.textAlign = "center";
          ctx.fillText(ty.folder, p.x, p.y - 14 * p.f);
        });
        ARTS.forEach((art, i) => {
          const ty = TYPES.find((t) => t.id === art.type);
          if (!ty) return;
          const th = -0.7 + 1.4 * ((i % 3) / 2);
          const p = project({
            x: ty.x + Math.cos(th) * 26,
            y: 58,
            z: ty.z + Math.sin(th) * 20,
          });
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5 * p.f, 0, Math.PI * 2);
          ctx.fillStyle = COL[art.status];
          ctx.fill();
          ctx.fillStyle = hex(INK, 0.75);
          ctx.font = `${Math.max(9, 10 * p.f)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(art.folder, p.x, p.y + 14 * p.f);
        });
      }

      if (mode === "operad") {
        OPERAD.forEach((n, i) => {
          const ang = -0.9 + (1.8 * i) / Math.max(1, OPERAD.length - 1);
          const p = project({ x: Math.cos(ang) * 70, y: 52, z: Math.sin(ang) * 70 });
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7 * p.f, 0, Math.PI * 2);
          ctx.fillStyle = n.oc === "agree" ? COL.ok : n.oc === "diverge" ? COL.strange : SILVER;
          ctx.fill();
          ctx.fillStyle = hex(INK, 0.8);
          ctx.font = `600 ${Math.max(9, 10.5 * p.f)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(n.sort, p.x, p.y + 16 * p.f);
        });
      }

      for (const a of st.agents) {
        if (mode === "live" && a.state !== "inflight") continue;
        const host = index[a.livesAt];
        if (!host) continue;
        const edge = edges.find((e) => e.id === a.edgeId);
        let p: Proj;
        if (a.state === "inflight" && edge) {
          const t = a.t ?? 0;
          const u = 1 - t;
          const A = { x: edge.a.x, y: edge.a.y + edge.a.h * 0.45, z: edge.a.z };
          const B = { x: edge.b.x, y: edge.b.y + edge.b.h * 0.45, z: edge.b.z };
          const C = edge.ctrl;
          p = project({
            x: u * u * A.x + 2 * u * t * C.x + t * t * B.x,
            y: u * u * A.y + 2 * u * t * C.y + t * t * B.y,
            z: u * u * A.z + 2 * u * t * C.z + t * t * B.z,
          });
        } else {
          const off = a.id.charCodeAt(1) % 5;
          p = project({ x: host.x + (off - 2) * 6, y: host.y + host.h * 0.7, z: host.z });
        }
        const r = (a.state === "inflight" ? 4.6 : 3.2) * p.f;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle =
          a.state === "inflight"
            ? PULSE
            : a.state === "blocked"
              ? COL.broken
              : a.role === "kernel"
                ? GOLD
                : a.state === "done"
                  ? COL.ok
                  : SILVER;
        ctx.fill();
        if (a.state === "inflight") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 4 * p.f, 0, Math.PI * 2);
          ctx.strokeStyle = hex(PULSE, 0.45);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [project]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const coarse = matchMedia("(pointer:coarse)").matches || innerWidth <= 900;

    const down = (e: PointerEvent) => {
      drag.current = true;
      moved.current = 0;
      sdx.current = 0;
      sdy.current = 0;
      lx.current = e.clientX;
      ly.current = e.clientY;
      gesture.current = "none";
      c.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - lx.current;
      const dy = e.clientY - ly.current;
      moved.current += Math.hypot(dx, dy);
      sdx.current += dx;
      sdy.current += dy;
      if (gesture.current === "none" && moved.current > 18) {
        gesture.current = Math.abs(sdy.current) > Math.abs(sdx.current) * 1.35 ? "swipe" : "orbit";
      }
      if (gesture.current === "orbit" || (!coarse && gesture.current === "none")) {
        yaw.current += dx * 0.005;
        pitch.current = Math.max(-0.15, Math.min(1.15, pitch.current + dy * 0.004));
      }
      lx.current = e.clientX;
      ly.current = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (gesture.current === "swipe" && Math.abs(sdy.current) > 56) {
        useSwarm.getState().stepMode(sdy.current < 0 ? 1 : -1);
      } else if (moved.current < 10) {
        const r = c.getBoundingClientRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        let best: string | null = null;
        let edgeHit: string | null = null;
        let bd = coarse ? 22 : 16;
        const st = useSwarm.getState();
        const PILLARS = st.graph.pillars;
        for (const r of st.graph.restrictions) {
          const a = PILLARS.find((p) => p.id === r.source);
          const b = PILLARS.find((p) => p.id === r.target);
          if (!a || !b) continue;
          const mid = project({ x: (a.x + b.x) / 2, y: 16, z: (a.z + b.z) / 2 });
          const d = Math.hypot(mid.x - px, mid.y - py);
          if (d < bd) {
            bd = d;
            edgeHit = r.id;
            best = null;
          }
        }
        for (const p of PILLARS) {
          const proj = project({ x: p.x, y: 0, z: p.z });
          const d = Math.hypot(proj.x - px, proj.y - py);
          if (d < bd) {
            bd = d;
            best = p.id;
            edgeHit = null;
          }
        }
        for (const a of st.agents) {
          const host = PILLARS.find((p) => p.id === a.livesAt);
          if (!host) continue;
          const proj = project({ x: host.x, y: 20, z: host.z });
          const d = Math.hypot(proj.x - px, proj.y - py);
          if (d < bd) {
            bd = d;
            best = a.id;
          }
        }
        if (edgeHit) useSwarm.getState().lookAt(edgeHit);
        else useSwarm.getState().select(best);
      }
      drag.current = false;
      gesture.current = "none";
    };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointercancel", up);
    };
  }, [project]);

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full touch-none"
      aria-label="Swarm volume. Swipe up or down to change mode. Tap a pillar or agent."
    />
  );
}

export { MODES_LIST };
