import type { ReactNode } from 'react';

/** Read-only content and action buttons shown in a module's title bar / tile corners. */
export type TitleBarContent = {
  /** Read-only content in the title bar (e.g. a status badge). Stays visible and shrinks with the title as the module collapses. */
  titleBarDisplays?: ReactNode;
  /** Buttons in the title bar next to the title. Shrinks with the title as the module collapses. */
  titleBarActions?: ReactNode;
};
