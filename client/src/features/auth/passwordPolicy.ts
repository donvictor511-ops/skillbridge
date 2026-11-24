const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password1234", "password12345",
  "password123456", "passwordpassword", "12345678", "123456789", "87654321",
  "qwerty123", "qwertyuiop", "qwertyuiop12", "qwertyuiopas", "qwertyuiop123",
  "qwerty123456", "abc12345", "letmein1", "letmein123456", "welcome1",
  "welcome12345", "welcome123456", "iloveyou", "iloveyou1234", "iloveyou12345",
  "admin123", "adminadmin123", "administrator", "passw0rd", "passw0rd1234",
  "p@ssword1234", "p@ssw0rd1234", "mypassword123", "mypassword1234", "123456789012",
  "1234567890123", "12345678901234", "1234567890123456", "123123123123",
  "aaaaaaaaaaaa", "1q2w3e4r5t6y", "1qaz2wsx3edc", "abcdefghijkl", "abcdefg12345",
  "changeme1234", "trustno1trustno1", "football12345", "baseball12345", "monkey123456",
  "dragon123456", "superman1234", "sunshine1234", "princess1234", "whatever1234",
  "starwars1234", "freedom12345", "computer1234",
  "11111111", "00000000", "22222222", "33333333", "44444444",
  "55555555", "66666666", "77777777", "88888888", "99999999",
]);

export function isTooSimplePassword(password: string): boolean {
  const normalized = password.toLowerCase();
  if (COMMON_PASSWORDS.has(normalized)) return true;
  if (/^(.)\1+$/u.test(normalized) || /^(.{1,4})\1+$/u.test(normalized)) return true;

  const sequences = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
  for (const sequence of sequences) {
    for (const direction of [sequence, [...sequence].reverse().join("")]) {
      for (let length = 8; length <= direction.length; length += 1) {
        for (let start = 0; start <= direction.length - length; start += 1) {
          if (normalized.includes(direction.slice(start, start + length))) return true;
        }
      }
    }
  }

  return new Set(normalized).size <= 2;
}
