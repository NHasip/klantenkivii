import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * Doorzoekbare meervoudige keuze met verwijderbare chips.
 * Toetsenbord: pijltjes kiezen, Enter (de)selecteert, Escape sluit de lijst,
 * Backspace in een leeg zoekveld verwijdert de laatste keuze.
 */
export function MultiSelectChips({ id, options = [], value = [], onChange, placeholder = 'Zoek en kies...', emptyText = 'Geen resultaten' }) {
    const reactId = useId();
    const inputId = id || `msc-${reactId}`;
    const listId = `${inputId}-lijst`;
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    const uniqueOptions = useMemo(() => {
        const seen = new Set();
        return options.filter((o) => {
            const key = Number(o.id);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [options]);

    const selectedIds = useMemo(() => Array.from(new Set((value ?? []).map(Number))), [value]);
    const selected = selectedIds.map((sid) => uniqueOptions.find((o) => Number(o.id) === sid)).filter(Boolean);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? uniqueOptions.filter((o) => String(o.name ?? '').toLowerCase().includes(q)) : uniqueOptions;
    }, [uniqueOptions, query]);

    useEffect(() => {
        if (active >= filtered.length) setActive(Math.max(0, filtered.length - 1));
    }, [filtered.length, active]);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const toggle = (optionId) => {
        const n = Number(optionId);
        const next = selectedIds.includes(n) ? selectedIds.filter((x) => x !== n) : [...selectedIds, n];
        onChange?.(next);
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!open) setOpen(true);
            else setActive((i) => Math.min(filtered.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter') {
            if (open && filtered[active]) {
                e.preventDefault();
                toggle(filtered[active].id);
            }
        } else if (e.key === 'Escape') {
            if (open) {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
            }
        } else if (e.key === 'Backspace' && query === '' && selectedIds.length > 0) {
            onChange?.(selectedIds.slice(0, -1));
        }
    };

    const activeOptionId = open && filtered[active] ? `${listId}-${filtered[active].id}` : undefined;

    return (
        <div ref={wrapperRef} className="relative mt-1">
            <div
                className="flex min-h-[38px] w-full flex-wrap items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600"
                onClick={() => inputRef.current?.focus()}
            >
                {selected.map((o) => (
                    <span key={o.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-0.5 pl-2 pr-1 text-xs font-semibold text-indigo-800">
                        {o.name}
                        <button
                            type="button"
                            className="rounded-full px-1 leading-none text-indigo-800 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                            aria-label={`Verwijder ${o.name}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggle(o.id);
                            }}
                        >
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    id={inputId}
                    type="text"
                    role="combobox"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-activedescendant={activeOptionId}
                    className="min-w-[8rem] flex-1 border-0 p-1 text-sm focus:outline-none focus:ring-0"
                    placeholder={selected.length ? '' : placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        setActive(0);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                />
            </div>
            {open ? (
                <ul
                    id={listId}
                    role="listbox"
                    aria-multiselectable="true"
                    className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 text-sm shadow-lg"
                >
                    {filtered.length === 0 ? (
                        <li className="px-3 py-2 text-zinc-500">{emptyText}</li>
                    ) : (
                        filtered.map((o, i) => {
                            const isSelected = selectedIds.includes(Number(o.id));
                            return (
                                <li
                                    key={o.id}
                                    id={`${listId}-${o.id}`}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`flex cursor-pointer items-center justify-between px-3 py-2 ${i === active ? 'bg-zinc-100' : ''}`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => toggle(o.id)}
                                >
                                    <span>{o.name}</span>
                                    {isSelected ? (
                                        <svg className="h-4 w-4 text-indigo-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : null}
                                </li>
                            );
                        })
                    )}
                </ul>
            ) : null}
        </div>
    );
}

export default MultiSelectChips;
