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

export const SCHEMA_ID = "sheaf-graph/2020-12" as const;

export const Pillar = z.object({
  id: z.string().min(1),
  folder: z.string().min(1),
  kind: z.enum(["core", "lib", "app", "mem"]),
  known: z.boolean(),
  dim: z.number().int().min(1),
  x: z.number(),
  z: z.number(),
});
export type Pillar = z.infer<typeof Pillar>;

export const Restriction = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  relation: z.string().min(1),
  kind: RestrictKind,
  status: GlueStatus,
  residual: z.number().min(0),
  residualMeaning: z.string().optional(),
});
export type Restriction = z.infer<typeof Restriction>;

export const Commit = z.object({
  sha: z.string().min(6).max(40),
  pillar: z.string().min(1),
  message: z.string().min(1),
  onTrunk: z.boolean(),
  at: z.number().optional(),
});
export type Commit = z.infer<typeof Commit>;

export const Agent = z.object({
  id: z.string().min(1),
  role: AgentRole,
  state: AgentState,
  livesAt: z.string().min(1),
  task: z.string().min(1),
  edgeId: z.string().nullable().optional(),
  t: z.number().optional(),
  ticksLeft: z.number().optional(),
});
export type Agent = z.infer<typeof Agent>;

export const OperadNode = z.object({
  id: z.string().min(1),
  parent: z.string().nullable().optional(),
  question: z.string().min(1),
  sort: z.string().min(1),
  compose: z.string().optional(),
  collapse: z.string().optional(),
  oc: OcVerdict,
  prompt: z.string().min(1),
});
export type OperadNode = z.infer<typeof OperadNode>;

export const Finding = z.object({
  id: z.string().min(1),
  seat: Seat,
  sev: z.enum(["P0", "P1", "P2"]),
  claim: z.string().min(1),
  evidence: z.string().min(1),
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
  "roll",
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
  id: z.string().min(1),
  folder: z.string().min(1),
  x: z.number(),
  z: z.number(),
});
export type TypeDisc = z.infer<typeof TypeDisc>;

export const Artifact = z.object({
  id: z.string().min(1),
  folder: z.string().min(1),
  type: z.string().min(1),
  maps: z.string().min(1),
  status: GlueStatus,
});
export type Artifact = z.infer<typeof Artifact>;

export const SheafGraph = z.object({
  schema: z.literal(SCHEMA_ID),
  id: z.string().min(1),
  title: z.string().optional(),
  palette: z.record(z.string(), z.string()).optional(),
  pillars: z.array(Pillar).min(1),
  restrictions: z.array(Restriction),
  commits: z.array(Commit).optional(),
  agents: z.array(Agent).optional(),
  operad: z.array(OperadNode).optional(),
  findings: z.array(Finding).optional(),
  types: z.array(TypeDisc).optional(),
  artifacts: z.array(Artifact).optional(),
});
export type SheafGraph = z.infer<typeof SheafGraph>;
