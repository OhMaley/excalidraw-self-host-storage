import { Select } from "radix-ui";
import SearchIcon from "@assets/icons/search.svg?react";
import styles from "./SearchSortToolbar.module.scss";

interface SortOption<T extends string> {
    readonly value: T;
    readonly label: string;
}

interface SearchSortToolbarProps<T extends string> {
    readonly searchQuery: string;
    readonly searchPlaceholder: string;
    readonly sortValue: T;
    readonly sortOptions: readonly SortOption<T>[];
    readonly sortDir: "asc" | "desc";
    readonly onSearchChange: (q: string) => void;
    readonly onSortValueChange: (value: T) => void;
    readonly onSortDirToggle: () => void;
    readonly className?: string;
}

export function SearchSortToolbar<T extends string>({
    searchQuery,
    searchPlaceholder,
    sortValue,
    sortOptions,
    sortDir,
    onSearchChange,
    onSortValueChange,
    onSortDirToggle,
    className,
}: SearchSortToolbarProps<T>) {
    const currentLabel = sortOptions.find((o) => o.value === sortValue)?.label ?? "";
    return (
        <div className={className ? `${styles.toolbar} ${className}` : styles.toolbar}>
            <div className={styles.searchBar}>
                <input
                    className={styles.searchInput}
                    type="search"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                <span className={styles.searchIcon} aria-hidden>
                    <SearchIcon />
                </span>
            </div>
            <div className={styles.sortControls}>
                <Select.Root value={sortValue} onValueChange={(v) => onSortValueChange(v as T)}>
                    <Select.Trigger className={styles.sortTrigger} aria-label="Sort by">
                        <Select.Value>{currentLabel}</Select.Value>
                        <Select.Icon className={styles.sortChevron}>▾</Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                        <Select.Content
                            className={styles.selectContent}
                            position="popper"
                            sideOffset={4}
                        >
                            <Select.Viewport>
                                {sortOptions.map(({ value, label }) => (
                                    <Select.Item
                                        key={value}
                                        value={value}
                                        className={styles.selectItem}
                                    >
                                        <Select.ItemText>{label}</Select.ItemText>
                                    </Select.Item>
                                ))}
                            </Select.Viewport>
                        </Select.Content>
                    </Select.Portal>
                </Select.Root>
                <button
                    type="button"
                    className={styles.sortDirButton}
                    onClick={onSortDirToggle}
                    aria-label={sortDir === "asc" ? "Sort ascending" : "Sort descending"}
                    title={sortDir === "asc" ? "Ascending" : "Descending"}
                >
                    {sortDir === "asc" ? "↑" : "↓"}
                </button>
            </div>
        </div>
    );
}
