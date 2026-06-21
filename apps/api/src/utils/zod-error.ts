import type { ZodError, ZodIssue } from "zod";

// Turn a Zod validation failure into something a human can act on. The default
// Zod messages ("Required", "Invalid", "String must contain at least 5
// character(s)") don't name the field and read like a stack trace, so the app
// used to surface a bare "Validation error". This builds, for every endpoint at
// once, a labelled sentence per field plus a one-line summary the UI can show.

// ["preferredDate"] → "Preferred date", ["images", 2, "url"] → "Images #3 url".
function humanizeField(path: (string | number)[]): string {
  if (path.length === 0) return "This field";
  const parts = path.map((seg) =>
    typeof seg === "number" ? `#${seg + 1}` : seg.replace(/([a-z0-9])([A-Z])/g, "$1 $2"),
  );
  const spaced = parts.join(" ").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Friendly name for an expected primitive type.
function typeName(expected: unknown): string {
  switch (expected) {
    case "string":
      return "text value";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "true/false value";
    case "date":
      return "date";
    case "array":
      return "list";
    default:
      return String(expected);
  }
}

// Build a complete, friendly, field-named sentence from a single Zod issue. For
// codes Zod can't describe well (custom refinements, regex) we trust the
// schema author's message, which is already human-written in our validators.
function friendlyIssue(issue: ZodIssue): string {
  const label = humanizeField(issue.path);
  switch (issue.code) {
    case "invalid_type":
      if (issue.received === "undefined" || issue.received === "null") {
        return `${label} is required`;
      }
      return `${label} must be a ${typeName(issue.expected)}`;
    case "too_small": {
      const min = issue.minimum;
      if (issue.type === "string") {
        return Number(min) <= 1
          ? `${label} is required`
          : `${label} must be at least ${min} characters`;
      }
      if (issue.type === "number") return `${label} must be at least ${min}`;
      if (issue.type === "array") {
        return Number(min) <= 1
          ? `Add at least one item to ${label.toLowerCase()}`
          : `${label} needs at least ${min} items`;
      }
      return `${label} is too small`;
    }
    case "too_big": {
      const max = issue.maximum;
      if (issue.type === "string") return `${label} must be ${max} characters or fewer`;
      if (issue.type === "number") return `${label} must be ${max} or less`;
      if (issue.type === "array") return `${label} can have at most ${max} items`;
      return `${label} is too large`;
    }
    case "invalid_string": {
      if (issue.validation === "email") return `${label} must be a valid email address`;
      if (issue.validation === "url") return `${label} must be a valid web address`;
      // regex / custom string check → the schema's own message is already clear.
      return issue.message;
    }
    case "invalid_enum_value": {
      const opts = (issue.options ?? []).map(String).join(", ");
      return opts ? `${label} must be one of: ${opts}` : `${label} is not a valid choice`;
    }
    case "invalid_date":
      return `${label} must be a valid date`;
    case "unrecognized_keys":
      return `Unexpected field${issue.keys.length > 1 ? "s" : ""}: ${issue.keys.join(", ")}`;
    default:
      // Custom refinements (e.g. "passwords don't match") carry their own
      // message; fall back to a generic line only if there isn't one.
      return issue.message && issue.message !== "Invalid input"
        ? issue.message
        : `${label} is not valid`;
  }
}

export interface FriendlyFieldError {
  path: string;
  message: string;
}

/**
 * Turn a ZodError into a one-line `summary` (for a toast / banner) plus a
 * `fields` array (for inline, per-input errors on a form).
 */
export function humanizeZodError(error: ZodError): {
  summary: string;
  fields: FriendlyFieldError[];
} {
  const fields: FriendlyFieldError[] = error.errors.map((e) => ({
    path: e.path.join("."),
    message: friendlyIssue(e),
  }));

  // Collapse duplicate sentences (two refinements on the same field, etc.).
  const unique: string[] = [];
  for (const f of fields) if (!unique.includes(f.message)) unique.push(f.message);

  let summary: string;
  if (unique.length === 0) {
    summary = "Please check your input and try again.";
  } else if (unique.length === 1) {
    summary = unique[0];
  } else {
    const shown = unique.slice(0, 3).join("; ");
    const extra = unique.length - 3;
    summary = extra > 0 ? `Please fix: ${shown}; and ${extra} more` : `Please fix: ${shown}`;
  }

  return { summary, fields };
}
