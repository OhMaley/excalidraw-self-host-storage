const AVATAR_COLORS = [
    "#5C6BC0",
    "#00897B",
    "#AB47BC",
    "#E53935",
    "#FB8C00",
    "#43A047",
    "#1E88E5",
    "#D81B60",
];

export function getColorFromId(id: string): string {
    const hash = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
