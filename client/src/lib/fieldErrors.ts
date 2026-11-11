// The server reports problems inside lists like "skills.2".
// The form only needs the top-level name ("skills").
export function toTopLevelErrors(
  fieldErrors: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [field, message] of Object.entries(fieldErrors)) {
    const key = field.split(".")[0] ?? field;
    if (!(key in result)) {
      result[key] = message;
    }
  }

  return result;
}
