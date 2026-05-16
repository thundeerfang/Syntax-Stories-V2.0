/** Main column offset when the sidebar is collapsed (52px) or expanded (240px). */
export function mainColumnOffsetClass(isOpen: boolean): string {
  return isOpen ? 'ml-60 w-[calc(100%-15rem)]' : 'ml-[52px] w-[calc(100%-52px)]';
}

export const MAIN_COLUMN_OFFSET_TRANSITION =
  'transition-[margin-left,width] duration-300 ease-in-out';
