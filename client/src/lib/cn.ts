type ClassValue = string | false | null | undefined;

// Joins class names and skips empty values.
// Example: cn('p-4', isActive && 'bg-brand') -> 'p-4 bg-brand' or 'p-4'
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
