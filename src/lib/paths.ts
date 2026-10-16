/** Keep Next router paths unprefixed; prefix only browser URLs and public assets. */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(
  /\/+$/,
  "",
);
export function publicAsset(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (BASE_PATH && (path === BASE_PATH || path.startsWith(BASE_PATH + "/")))
    return path;
  return BASE_PATH + path;
}
export function isAppPath(pathname: string): boolean {
  return (
    !BASE_PATH || pathname === BASE_PATH || pathname.startsWith(BASE_PATH + "/")
  );
}
export function routePath(pathname: string): string {
  const path =
    BASE_PATH && isAppPath(pathname)
      ? pathname.slice(BASE_PATH.length)
      : pathname;
  return path.replace(/\/+$/, "") || "/";
}
