import { useState, useRef, useCallback, useId } from "react";

// Utils
import { getColorFromId } from "@utils/colorUtils";

// Styles
import styles from "./TagsInput.module.scss";

const BLUR_DELAY = 150;

type SuggestionItem = { type: "existing"; tag: string } | { type: "create"; tag: string };

interface SuggestionListProps {
    readonly listId: string;
    readonly items: SuggestionItem[];
    readonly activeIndex: number;
    readonly onSelect: (tag: string) => void;
    readonly onHover: (i: number) => void;
}

interface TagChipProps {
    readonly tag: string;
    readonly disabled?: boolean;
    readonly onRemove: (tag: string) => void;
}

interface TagsInputProps {
    readonly value: string[];
    readonly onChange: (tags: string[]) => void;
    readonly suggestions: string[];
    readonly disabled?: boolean;
    readonly placeholder?: string;
    readonly inputId?: string;
}

function tagColor(tag: string): string {
    return getColorFromId(tag);
}

function buildListItems(
    inputValue: string,
    value: string[],
    suggestions: string[]
): SuggestionItem[] {
    const trimmed = inputValue.trim();
    const available = suggestions.filter(
        (s) => !value.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
    );
    const showCreate =
        trimmed.length > 0 &&
        !value.includes(trimmed) &&
        !suggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    return [
        ...(showCreate ? [{ type: "create" as const, tag: trimmed }] : []),
        ...available.map((t) => ({ type: "existing" as const, tag: t })),
    ];
}

function TagChip({ tag, disabled, onRemove }: TagChipProps) {
    return (
        <span
            className={styles.chip}
            style={{ "--tag-color": tagColor(tag) } as React.CSSProperties}
        >
            {tag}
            {!disabled && (
                <button
                    type="button"
                    className={styles.chipRemove}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(tag);
                    }}
                    aria-label={`Remove tag ${tag}`}
                >
                    x
                </button>
            )}
        </span>
    );
}

function SuggestionList({ listId, items, activeIndex, onSelect, onHover }: SuggestionListProps) {
    return (
        <ul id={listId} className={styles.dropdown} role="listbox" aria-label="Tag suggestions">
            {items.map((item, i) => (
                <li
                    key={item.tag + item.type}
                    id={`${listId}-item-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    className={`${styles.listItem} ${i === activeIndex ? styles.listItemActive : ""}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onSelect(item.tag);
                    }}
                    onMouseEnter={() => onHover(i)}
                >
                    {item.type === "create" ? (
                        <span className={styles.createLabel}>
                            Add <strong>&ldquo;{item.tag}&rdquo;</strong>
                        </span>
                    ) : (
                        <>
                            <span
                                className={styles.tagDot}
                                style={{ "--tag-color": tagColor(item.tag) } as React.CSSProperties}
                            />
                            {item.tag}
                        </>
                    )}
                </li>
            ))}
        </ul>
    );
}

function useTagsInputState(
    value: string[],
    onChange: (tags: string[]) => void,
    suggestions: string[]
) {
    const [inputValue, setInputValue] = useState("");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();
    const listItems = buildListItems(inputValue, value, suggestions);
    const isOpen = open && listItems.length > 0;

    function addTag(tag: string) {
        const trimmed = tag.trim();
        if (!trimmed || value.includes(trimmed)) return;
        onChange([...value, trimmed]);
        setInputValue("");
        setActiveIndex(-1);
        inputRef.current?.focus();
    }

    function removeTag(tag: string) {
        onChange(value.filter((t) => t !== tag));
    }

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            function handleEnterKey() {
                if (activeIndex >= 0 && listItems[activeIndex]) addTag(listItems[activeIndex].tag);
                else if (inputValue.trim()) addTag(inputValue.trim());
            }
            if (e.key === "Enter") {
                e.preventDefault();
                handleEnterKey();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, listItems.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, -1));
            } else if (e.key === "Backspace" && inputValue === "") {
                onChange(value.slice(0, -1));
            } else if (e.key === "Escape") {
                setOpen(false);
                inputRef.current?.blur();
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activeIndex, listItems, inputValue, value, onChange]
    );

    return {
        inputValue,
        setInputValue,
        setOpen,
        activeIndex,
        setActiveIndex,
        inputRef,
        listId,
        listItems,
        isOpen,
        addTag,
        removeTag,
        handleKeyDown,
    };
}

export function TagsInput({
    value,
    onChange,
    suggestions,
    disabled,
    placeholder,
    inputId,
}: TagsInputProps) {
    const {
        inputValue,
        setInputValue,
        setOpen,
        activeIndex,
        setActiveIndex,
        inputRef,
        listId,
        listItems,
        isOpen,
        addTag,
        removeTag,
        handleKeyDown,
    } = useTagsInputState(value, onChange, suggestions);

    return (
        <div className={styles.wrapper}>
            <div className={styles.container} data-disabled={disabled ? true : undefined}>
                {value.map((tag) => (
                    <TagChip key={tag} tag={tag} onRemove={removeTag} disabled={disabled} />
                ))}
                <input
                    id={inputId}
                    ref={inputRef}
                    className={styles.input}
                    type="text"
                    value={inputValue}
                    placeholder={value.length === 0 ? placeholder : undefined}
                    disabled={disabled}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setActiveIndex(-1);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => {
                        setTimeout(() => setOpen(false), BLUR_DELAY);
                    }}
                    onKeyDown={handleKeyDown}
                    aria-autocomplete="list"
                    aria-controls={listId}
                    aria-activedescendant={
                        activeIndex >= 0 ? `${listId}-item-${activeIndex}` : undefined
                    }
                />
            </div>
            {isOpen && (
                <SuggestionList
                    listId={listId}
                    items={listItems}
                    activeIndex={activeIndex}
                    onSelect={addTag}
                    onHover={setActiveIndex}
                />
            )}
        </div>
    );
}
