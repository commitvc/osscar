export function hrefWithQuarter(path: string, quarterId?: string | null): string {
  if (!quarterId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}quarter=${encodeURIComponent(quarterId)}`;
}
