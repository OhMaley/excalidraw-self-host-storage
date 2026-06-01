export function getInitialFromFullName(fullName: string, maxInitials = 2): string {
    return fullName
        .split(" ")
        .slice(0, maxInitials)
        .map((w) => w[0].toUpperCase())
        .join("");
}
