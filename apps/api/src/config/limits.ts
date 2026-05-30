// Pagination & query-size limits — single source of truth for every list
// endpoint. Routes that need a custom cap should still derive from these
// (`Math.min(req.query.limit, PAGINATION.max)`) instead of inventing a new
// magic number.

export const PAGINATION = {
  // Default page size when caller doesn't ask for anything specific.
  default: 20,
  // Hard upper bound for caller-supplied `limit`. Stops a client from
  // accidentally pulling 10k rows.
  max: 100,
  // Used by internal/admin views that genuinely need a big window in one
  // shot (full broadcast audience build, fleet snapshot, etc.). Not
  // exposed via paginated routes.
  large: 500,
} as const;
