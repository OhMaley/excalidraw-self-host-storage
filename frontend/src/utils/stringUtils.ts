function nextName(base: string, existing: Set<string>): string {
    if (!existing.has(base)) return base;
    let n = 2;
    while (existing.has(`${base} ${n}`)) n++;
    return `${base} ${n}`;
}

export function nextDrawingName(existingTitles: string[]): string {
    return nextName("New drawing", new Set(existingTitles));
}

export function nextCollectionName(existingNames: string[]): string {
    return nextName("New collection", new Set(existingNames));
}

export function nextWorkspaceName(existingNames: string[]): string {
    return nextName("New workspace", new Set(existingNames));
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
