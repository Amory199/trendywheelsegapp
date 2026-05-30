import "./specs";

// Tour registry barrel. Re-exports the public API from `./registry`, and
// imports `./specs` at the top of the module solely for its side effect of
// populating the registry. Both files import only from `./registry`, so there
// is no cycle.

export { getTourSpec, registerTour } from "./registry";
