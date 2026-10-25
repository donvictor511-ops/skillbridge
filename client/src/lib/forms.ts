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
