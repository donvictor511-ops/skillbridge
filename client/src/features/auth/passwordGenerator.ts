const lowercase = "abcdefghijkmnopqrstuvwxyz";
const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const digits = "23456789";
const symbols = "!@#$%&*+-_?";
const allCharacters = `${lowercase}${uppercase}${digits}${symbols}`;

function secureIndex(max: number): number {
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / max) * max;
  const value = new Uint32Array(1);

  do {
    window.crypto.getRandomValues(value);
  } while (value[0] >= limit);

  return value[0] % max;
}

export function suggestStrongPassword(length = 20): string {
  const characters = [
    lowercase[secureIndex(lowercase.length)],
    uppercase[secureIndex(uppercase.length)],
    digits[secureIndex(digits.length)],
    symbols[secureIndex(symbols.length)],
  ];

  while (characters.length < length) {
    characters.push(allCharacters[secureIndex(allCharacters.length)]);
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = secureIndex(index + 1);
    [characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ];
  }

  return characters.join("");
}
