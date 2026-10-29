export interface NormalizedSkill {
  // The text shown to people, for example "TypeScript".
  name: string;
  // A lowercase version used to recognize duplicates ("typescript").
  nameKey: string;
}

export function normalizeSkill(rawName: string): NormalizedSkill {
  const name = rawName.trim().replace(/\s+/g, " ");
  return { name, nameKey: name.toLowerCase() };
}

// Removes case-insensitive duplicates. The FIRST spelling wins.
export function uniqueSkills(rawNames: string[]): NormalizedSkill[] {
  const byKey = new Map<string, NormalizedSkill>();

  for (const rawName of rawNames) {
    const skill = normalizeSkill(rawName);
    if (!byKey.has(skill.nameKey)) {
      byKey.set(skill.nameKey, skill);
    }
  }

  return Array.from(byKey.values());
}
