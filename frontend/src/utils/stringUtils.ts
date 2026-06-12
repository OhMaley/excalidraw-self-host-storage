export function getInitials(text: string, max = 2): string {
    return text
        .split(/[ _-]+/)
        .map((w) => /[a-zA-Z0-9]/.exec(w)?.[0] ?? "")
        .filter(Boolean)
        .slice(0, max)
        .map((c) => c.toUpperCase())
        .join("");
}
