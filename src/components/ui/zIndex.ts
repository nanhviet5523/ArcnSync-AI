/** The one stacking scale for the app shell and the workspace. Full class names, so Tailwind can see them. */
export const Z = {
  /** Popovers drawn on the canvas. */
  canvasOverlay: 'z-30',
  /** Status and error banners on the canvas. */
  canvasBanner: 'z-40',
  drawerBackdrop: 'z-[65]',
  /** Side columns when they become drawers below 1024px. */
  drawer: 'z-[70]',
  menu: 'z-[80]',
  /** Full-height sheets opened on top of the workspace (catalog, project info). */
  sheet: 'z-[90]',
  /** Always on top: a dialog can open from any drawer or sheet. */
  modal: 'z-[100]',
} as const;
