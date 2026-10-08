import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

export class FetchRejected extends Error {}

/**
 * Fetches a user-supplied URL without letting it reach private networks
 * (SSRF). Every redirect hop is re-validated, and the body is size-capped.
 *
 * Known gap: DNS could change between the check and the fetch (rebinding).
 * The function runs on Vercel with no private services behind it, so this
 * is an accepted risk; pin the resolved IP with a custom agent if that changes.
 */
export async function safeFetch(rawUrl: string): Promise<{ url: string; contentType: string; body: string }> {
  let url = await validate(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "SpeedReadIt/1.0 (+reader import)", accept: "text/html,text/plain;q=0.9" },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new FetchRejected("Redirect without a location");
      url = await validate(new URL(location, url).toString());
      continue;
    }
    if (!res.ok) throw new FetchRejected(`The page returned ${res.status}`);

    const contentType = res.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/.test(contentType)) {
      throw new FetchRejected("Only HTML and plain text pages can be imported. Download other files and upload them.");
    }
    return { url: url.toString(), contentType, body: await readCapped(res) };
  }
  throw new FetchRejected("Too many redirects");
}

async function validate(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchRejected("That is not a valid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchRejected("Only http and https URLs work");
  if (url.port && url.port !== "80" && url.port !== "443") throw new FetchRejected("Non-standard ports are not allowed");
  if (url.username || url.password) throw new FetchRejected("URLs with credentials are not allowed");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new FetchRejected("That address is not reachable from here");
  }
  return url;
}

export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("ff");
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new FetchRejected("That page is too large");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
