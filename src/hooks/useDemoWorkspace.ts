import { useSyncExternalStore } from 'react';
import { getDemoWorkspace, subscribeDemoWorkspace } from '@/services/demoWorkspaceService';

export function useDemoWorkspace() {
  return useSyncExternalStore(subscribeDemoWorkspace,getDemoWorkspace,getDemoWorkspace);
}
