/**
 * The address in `request.url` is the host the Node process is bound to.
 * Behind a reverse proxy that is localhost, even when the browser asked for
 * the public domain. Redirects must use the host the visitor actually used.
 */
export function publicUrl(request: Request, path: string): URL {
  return new URL(path, publicOrigin(request));
}

function publicOrigin(request: Request): string {
  const forwardedHost = firstHeader(request.headers.get("x-forwarded-host"));
  const host =
    forwardedHost || firstHeader(request.headers.get("host")) || new URL(request.url).host;
  const forwardedProto = firstHeader(request.headers.get("x-forwarded-proto"));
  const proto = forwardedProto || new URL(request.url).protocol.replace(":", "") || "http";
  return `${proto}://${host}`;
}

function firstHeader(value: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}
