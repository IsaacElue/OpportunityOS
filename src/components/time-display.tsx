"use client";

import { useSyncExternalStore } from "react";

import { formatRelativeTime } from "@/lib/formatRelativeTime";

const emptySubscribe = () => () => {};

// True only after hydration completes. useSyncExternalStore renders the server
// snapshot during hydration, so server and client HTML always match, then React
// re-renders with the client snapshot — no hydration mismatch.
export function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

// Locale and timezone are pinned so server and hydration output are identical
// regardless of where the server runs or where the user is.
const utcShortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const utcTime = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const utcDateTime = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" });

type TimeDisplayProps = { value: string | null | undefined; className?: string; fallback?: string };

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Just now" / "5m ago" / "3h ago" / "Yesterday" / "Jul 27". */
export function RelativeTime({ value, className, fallback = "Recently" }: TimeDisplayProps) {
  const hydrated = useHydrated();
  const date = parseDate(value);
  if (!date) return <span className={className}>{fallback}</span>;
  return <time dateTime={date.toISOString()} className={className}>{hydrated ? formatRelativeTime(date.toISOString()) : utcShortDate.format(date)}</time>;
}

/** Clock time in the viewer's locale/timezone, e.g. "9:14 AM". */
export function LocalTime({ value, className, fallback = "Recently" }: TimeDisplayProps) {
  const hydrated = useHydrated();
  const date = parseDate(value);
  if (!date) return <span className={className}>{fallback}</span>;
  return <time dateTime={date.toISOString()} className={className}>{hydrated ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date) : utcTime.format(date)}</time>;
}

/** Date plus clock time in the viewer's locale/timezone, e.g. "Jul 27, 9:14 AM". */
export function LocalDateTime({ value, className, fallback = "Recently" }: TimeDisplayProps) {
  const hydrated = useHydrated();
  const date = parseDate(value);
  if (!date) return <span className={className}>{fallback}</span>;
  return <time dateTime={date.toISOString()} className={className}>{hydrated ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date) : utcDateTime.format(date)}</time>;
}
