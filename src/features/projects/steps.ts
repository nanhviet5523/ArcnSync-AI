// No '@/' runtime imports here: logic.test.ts loads this file with plain `node --test`.
import type { ProjectStatus } from './projectApi';

/**
 * The 7 project steps, one per backend ProjectStatus, in order (CANCELLED is not a step).
 * Labels: steps.project (project pages, cards, landing page); landing-page copy: home.steps.<status>.
 */
export const PROJECT_STEPS = [
  'DRAFT', 'CONTRACT_PENDING', 'REQUIREMENT_ANALYSIS', 'IN_DESIGN', 'PRODUCT_SELECTION', 'QUOTING', 'COMPLETED',
] as const satisfies readonly ProjectStatus[];

/** Index into PROJECT_STEPS; COMPLETED = every step done (7), CANCELLED = -1. */
export const stepIndex = (s: ProjectStatus): number =>
  s === 'CANCELLED' ? -1 : s === 'COMPLETED' ? PROJECT_STEPS.length : PROJECT_STEPS.indexOf(s);
