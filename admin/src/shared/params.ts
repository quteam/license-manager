export function normalizeParams(params: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));
}
