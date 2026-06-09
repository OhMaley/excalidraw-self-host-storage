const SECS_PER_MIN = 60;
const MINS_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_SEC = 1000;

export function relativeTime(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < SECS_PER_MIN) return "just now";
    const m = Math.floor(s / SECS_PER_MIN);
    if (m < MINS_PER_HOUR) return `${m}m ago`;
    const h = Math.floor(m / MINS_PER_HOUR);
    if (h < HOURS_PER_DAY) return `${h}h ago`;
    const d = Math.floor(h / HOURS_PER_DAY);
    return `${d}d ago`;
}

export function daysToMs(days: number): number {
    return days * HOURS_PER_DAY * MINS_PER_HOUR * SECS_PER_MIN * MS_PER_SEC;
}
