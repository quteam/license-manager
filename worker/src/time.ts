export function nowIso(): string {
  return new Date().toISOString();
}

export function addDaysIso(baseIso: string, days: number): string {
  const base = new Date(baseIso);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

export function addMonthsIso(baseIso: string, months: number): string {
  const base = new Date(baseIso);
  const targetFirstDay = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth() + months,
      1,
      base.getUTCHours(),
      base.getUTCMinutes(),
      base.getUTCSeconds(),
      base.getUTCMilliseconds()
    )
  );
  const targetMonthLastDate = new Date(
    Date.UTC(targetFirstDay.getUTCFullYear(), targetFirstDay.getUTCMonth() + 1, 0)
  ).getUTCDate();

  targetFirstDay.setUTCDate(Math.min(base.getUTCDate(), targetMonthLastDate));
  return targetFirstDay.toISOString();
}

export function addYearsIso(baseIso: string, years: number): string {
  return addMonthsIso(baseIso, years * 12);
}

export function isExpired(expiresAt: string | null, now = new Date()): boolean {
  return expiresAt !== null && new Date(expiresAt).getTime() <= now.getTime();
}

export function secondsUntil(expiresAt: string, now = new Date()): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000));
}
