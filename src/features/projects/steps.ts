// No '@/' runtime imports here: logic.test.ts loads this file with plain `node --test`.
import type { ProjectStatus } from './projectApi';

/**
 * The 6 project steps, in order (CANCELLED is not a step). The handover happens inside QUOTING, so it has no step
 * of its own. REQUIREMENT_ANALYSIS is not a step either: paying the deposit moves CONTRACT_PENDING straight to
 * IN_DESIGN, and a project still found in REQUIREMENT_ANALYSIS is drawn on the Design step.
 * Labels: steps.project (same order; project pages, cards, landing page); landing-page copy: home.steps.<status>.
 */
export const PROJECT_STEPS = [
  'DRAFT', 'CONTRACT_PENDING', 'IN_DESIGN', 'PRODUCT_SELECTION', 'QUOTING', 'COMPLETED',
] as const satisfies readonly ProjectStatus[];

export type ProjectStep = (typeof PROJECT_STEPS)[number];

/** The step a status is drawn on: each status is its own step, except the unused REQUIREMENT_ANALYSIS (Design). */
const stepOf = (s: string): string => (s === 'REQUIREMENT_ANALYSIS' ? 'IN_DESIGN' : s);

/** Index into PROJECT_STEPS; COMPLETED = every step done (6), CANCELLED = -1. */
export const stepIndex = (s: ProjectStatus): number =>
  s === 'CANCELLED' ? -1 : s === 'COMPLETED' ? PROJECT_STEPS.length : (PROJECT_STEPS as readonly string[]).indexOf(stepOf(s));

export type StepState = 'done' | 'active' | 'upcoming' | 'muted';

/**
 * How each of the 6 steps is drawn, from `project.status` alone (no "furthest step reached": QUOTING can go back to
 * PRODUCT_SELECTION, and the stepper goes back with it). COMPLETED: every step done. CANCELLED, or a status this
 * build doesn't know yet: every step muted, none active (`known: false` for the latter, so the caller can warn).
 */
export function projectStepStates(status: string): { states: StepState[]; cancelled: boolean; known: boolean } {
  const all = (state: StepState) => PROJECT_STEPS.map(() => state);
  if (status === 'COMPLETED') return { states: all('done'), cancelled: false, known: true };
  if (status === 'CANCELLED') return { states: all('muted'), cancelled: true, known: true };
  const current = (PROJECT_STEPS as readonly string[]).indexOf(stepOf(status));
  if (current < 0) return { states: all('muted'), cancelled: false, known: false };
  return {
    states: PROJECT_STEPS.map((_, i) => (i < current ? 'done' : i === current ? 'active' : 'upcoming')),
    cancelled: false,
    known: true,
  };
}
