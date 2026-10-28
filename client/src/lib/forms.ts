// Builds the value for aria-describedby so screen readers read the hint
// and error text together with the field.
export function getDescribedBy(
  id: string,
  hint?: string,
  error?: string,
): string | undefined {
  const ids: string[] = [];

  if (error) {
    ids.push(`${id}-error`);
  }
  if (hint) {
    ids.push(`${id}-hint`);
  }

  return ids.length > 0 ? ids.join(" ") : undefined;
}

// After a failed submit, move the keyboard focus to the first field that has
// an error, so keyboard and screen reader users land in the right place.
// Fields must have ids like "<idPrefix>-<fieldName>", for example "login-email".
export function focusFirstInvalidField(
  errors: Record<string, string>,
  fieldOrder: readonly string[],
  idPrefix: string,
): void {
  const firstInvalid = fieldOrder.find((field) => field in errors);

  if (firstInvalid !== undefined) {
    document.getElementById(`${idPrefix}-${firstInvalid}`)?.focus();
  }
}
