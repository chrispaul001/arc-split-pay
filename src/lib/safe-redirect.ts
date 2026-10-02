/** Accept only same-origin relative paths (e.g. "/.lovable/oauth/consent?x=1"). */
export function safeRedirect(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}
