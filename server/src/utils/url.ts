// A link is safe to store and show only if it is a normal https address:
// - the "https:" scheme (no javascript:, data:, or plain http:)
// - a real host name
// - no embedded username or password (https://name:secret@host)
export function isSafeHttpsUrl(value: string): boolean {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    url.hostname !== "" &&
    url.username === "" &&
    url.password === ""
  );
}
