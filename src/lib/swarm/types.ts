import { z } from "zod";

export const GlueStatus = z.enum(["ok", "strange", "broken", "missing"]);
export type GlueStatus = z.infer<typeof GlueStatus>;

export const RestrictKind = z.enum([
  "identity",
  "projection",
  "embed",
  "spectral",
  "type-aware",
]);
export type RestrictKind = z.infer<typeof RestrictKind>;

export const AgentRole = z.enum([
  "planner",
  "worker",
  "reviewer",
  "fixer",
  "kernel",
  "detector",
]);
export type AgentRole = z.infer<typeof AgentRole>;

export const AgentState = z.enum(["idle", "inflight", "blocked", "done"]);
export type AgentState = z.infer<typeof AgentState>;

export const ViewMode = z.enum([
  "swarm",
  "commits",
  "live",
  "operad",
  "eval",
  "subspaces",
]);
export type ViewMode = z.infer<typeof ViewMode>;

export const OcVerdict = z.enum(["agree", "diverge", "pending"]);
export type OcVerdict = z.infer<typeof OcVerdict>;

export const Seat = z.enum(["user", "operator", "craft", "red"]);
export type Seat = z.infer<typeof Seat>;

export const Pillar = z.object({
  id: z.string(),
  folder: z.string(),
  kind: z.enum(["core", "lib", "app", "mem"]),
  known: z.boolean(),
  dim: z.number().int().min(1),
  x: z.number(),
  z: z.number(),
});
export type Pillar = z.infer<typeof Pillar>;

export const Restriction = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  relation: z.string(),
  kind: RestrictKind,
  status: GlueStatus,
  residual: z.number(),
});
export type Restriction = z.infer<typeof Restriction>;

export const Commit = z.object({
  sha: z.string(),
  pillar: z.string(),
  message: z.string(),
  onTrunk: z.boolean(),
  at: z.number(),
});
export type Commit = z.infer<typeof Commit>;

export const Agent = z.object({
  id: z.string(),
  role: AgentRole,
  state: AgentState,
  livesAt: z.string(),
  task: z.string(),
  edgeId: z.string().nullable(),
  t: z.number(),
  ticksLeft: z.number(),
});
export type Agent = z.infer<typeof Agent>;

export const OperadNode = z.object({
  id: z.string(),
  parent: z.string().nullable(),
  question: z.string(),
  sort: z.string(),
  compose: z.string(),
  collapse: z.string(),
  oc: OcVerdict,
  prompt: z.string(),
});
export type OperadNode = z.infer<typeof OperadNode>;

export const Finding = z.object({
  id: z.string(),
  seat: Seat,
  sev: z.enum(["P0", "P1", "P2"]),
  claim: z.string(),
  evidence: z.string(),
});
export type Finding = z.infer<typeof Finding>;

export const EventKind = z.enum([
  "tick",
  "launch",
  "oc",
  "commit",
  "block",
  "fix",
  "eval",
]);
export type EventKind = z.infer<typeof EventKind>;

export const SwarmEvent = z.object({
  id: z.string(),
  at: z.number(),
  kind: EventKind,
  text: z.string(),
  status: GlueStatus.optional(),
});
export type SwarmEvent = z.infer<typeof SwarmEvent>;

export const TypeDisc = z.object({
  id: z.string(),
  folder: z.string(),
  x: z.number(),
  z: z.number(),
});
export type TypeDisc = z.infer<typeof TypeDisc>;

export const Artifact = z.object({
  id: z.string(),
  folder: z.string(),
  type: z.string(),
  maps: z.string(),
  status: GlueStatus,
});
export type Artifact = z.infer<typeof Artifact>;
