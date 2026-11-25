import { useCallback, useEffect, useState } from 'react';
import { designApi } from '@/features/design-workspace/designApi';
import { canOpenWorkspace } from '@/features/projects/projectApi';
import type { Project } from '@/features/projects/projectApi';
import { conceptApi, conceptErrorText, conceptSummary } from './conceptApi';
import type { Concept } from './conceptApi';

export interface ProjectConcepts {
  /** null until the first load answers (or when the project has not reached design). */
  concepts: Concept[] | null;
  error: string;
  /** The project already has a layout version: the concept stage is over (also for projects made before concepts existed). */
  hasLayout: boolean;
  /**
   * The Concept step is done: a concept was chosen, a layout exists, or the project is past IN_DESIGN.
   * undefined while still unknown, so the stepper does not jump back and forth.
   */
  conceptDone: boolean | undefined;
  reload: () => Promise<void>;
}

/** Concepts of the project, loaded once it has reached design (GET /projects/{id}/concepts). */
export function useProjectConcepts(project: Pick<Project, 'id' | 'status'> | null): ProjectConcepts {
  const id = project?.id ?? '';
  const status = project?.status;
  const enabled = !!status && canOpenWorkspace(status);
  const inDesign = status === 'IN_DESIGN';
  const [concepts, setConcepts] = useState<Concept[] | null>(null);
  const [hasLayout, setHasLayout] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!enabled || !id) return;
    setError('');
    try {
      // Only IN_DESIGN needs the layout check: later stages always have one.
      const [list, layouts] = await Promise.all([
        conceptApi.list(id),
        inDesign ? designApi.listVersions(id, 'LAYOUT_2D').then((r) => r.items.length > 0) : Promise.resolve(true),
      ]);
      setConcepts(list);
      setHasLayout(layouts);
    } catch (e) {
      setError(conceptErrorText(e));
    }
  }, [enabled, id, inDesign]);
  useEffect(() => { Promise.resolve().then(reload); }, [reload]);

  const approved = concepts ? !!conceptSummary(concepts).approved : undefined;
  const conceptDone = !enabled ? undefined
    : !inDesign ? true
      : approved || hasLayout ? true
        : concepts && hasLayout === false ? false : undefined;

  return { concepts, error, hasLayout: hasLayout ?? !inDesign, conceptDone, reload };
}
