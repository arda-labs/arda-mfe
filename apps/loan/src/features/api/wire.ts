/**
 * A request body built from a generated input schema (ADR-005). Request schemas
 * leave every field optional because the backend decodes leniently; K names the
 * fields this client always sends, and must be real backend fields.
 */
export type WireBody<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>
