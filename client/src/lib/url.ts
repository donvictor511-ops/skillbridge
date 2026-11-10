// A link is safe to draw only if it is a normal https address:
// the "https:" scheme, a real host, and no username or password inside.
// The server and database already check links. We check AGAIN before showing.
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
