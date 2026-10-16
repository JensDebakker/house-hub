// A pure re-export barrel, unlike every other components/*/index - AdminTable has no single
// dominant component to put here (six roughly equal small table primitives), so there's
// nothing one of them could be named without misleadingly implying it's "the" component.
export { TableContainer } from './TableContainer';
export { HeaderRow } from './HeaderRow';
export { Row } from './Row';
export { HeaderCell } from './HeaderCell';
export { Cell } from './Cell';
export { AdminActionButton } from './AdminActionButton';
export { rowStyle, saveButtonStyle } from './tableStyles';
