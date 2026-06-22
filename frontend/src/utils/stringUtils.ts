const NEW_DRAWING_BASE = "New drawing";

export function nextDrawingName(existingTitles: string[]): string {
    const titles = new Set(existingTitles);
    if (!titles.has(NEW_DRAWING_BASE)) return NEW_DRAWING_BASE;
    let n = 2;
    while (titles.has(`${NEW_DRAWING_BASE} ${n}`)) n++;
    return `${NEW_DRAWING_BASE} ${n}`;
}

export function getInitials(text: string, max = 2): string {
    return text
        .split(/[ _-]+/)
        .map((w) => /[a-zA-Z0-9]/.exec(w)?.[0] ?? "")
        .filter(Boolean)
        .slice(0, max)
        .map((c) => c.toUpperCase())
        .join("");
}
