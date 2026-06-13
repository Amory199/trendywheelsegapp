// Maps an English namespace's literal-typed shape (it is `as const`) onto the
// same structure with every leaf widened to `string`. The Arabic counterpart is
// typed `Stringify<typeof enNamespace>`, so the compiler enforces that ar has
// exactly the same keys as en (missing/extra key = build error) while allowing
// the actual Arabic translation strings as values.
export type Stringify<T> = {
  [K in keyof T]: T[K] extends string ? string : Stringify<T[K]>;
};
