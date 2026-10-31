import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Head, router, usePage } from '@inertiajs/react';
import { DndContext, DragOverlay, PointerSensor, closestCorners, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDialog } from '../../components/useDialog';
import { MultiSelectChips } from '../../components/MultiSelectChips';
import { useConfirm } from '../../components/ConfirmProvider';
import { Avatar, Badge, Button, EmptyState, FilePicker, IconTile, PageHeader, Skeleton, Spinner, StatusDot, buttonClasses, cx, inputClasses, tableClasses } from '../../components/ui';
import { Icon } from '../../components/icons';

function dedupeById(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).filter((item) => {
        const key = Number(item?.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function formatDateTime(isoString) {
    if (!isoString) return null;
    try {
        return new Intl.DateTimeFormat('nl-NL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(isoString));
    } catch {
        return String(isoString);
    }
}

function statusLabel(value) {
    if (!value) return '';
    const text = String(value).replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatFileSize(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.xls,.xlsx,.doc,.docx';
const ATTACHMENT_HINT = 'Toegestaan: pdf, afbeeldingen (jpg, png, webp), txt, csv, Excel en Word. Max. 10 MB per bestand.';

function firstError(error, fallback) {
    const errors = error?.response?.data?.errors;
    if (errors && typeof errors === 'object') {
        const first = Object.values(errors).flat()[0];
        if (first) return String(first);
    }
    const status = error?.response?.status;
    if (status === 419) return 'Je sessie is verlopen. Vernieuw de pagina en probeer opnieuw.';
    if (status === 403) return 'Je hebt geen rechten voor deze actie.';
    return fallback;
}

function ErrorList({ errors, exclude = [] }) {
    const entries = Object.entries(errors || {}).filter(([key]) => !exclude.includes(key));
    if (entries.length === 0) return null;
    return (
        <ul className="space-y-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
            {entries.map(([key, messages]) => (
                <li key={key}>{Array.isArray(messages) ? messages[0] : String(messages)}</li>
            ))}
        </ul>
    );
}

// Prioriteit: kleur voor de rand van de kaart en de stip, altijd met zichtbaar label.
const PRIORITY_META = {
    kritiek: { label: 'Kritiek', tone: 'danger', edge: 'bg-rose-500', text: 'text-rose-700' },
    hoog: { label: 'Hoog', tone: 'warning', edge: 'bg-amber-400', text: 'text-amber-800' },
    normaal: { label: 'Normaal', tone: 'brand', edge: 'bg-indigo-300', text: 'text-zinc-600' },
    laag: { label: 'Laag', tone: 'neutral', edge: 'bg-zinc-200', text: 'text-zinc-500' },
};

function priorityMeta(value) {
    return PRIORITY_META[value] ?? PRIORITY_META.normaal;
}

function statusTone(value) {
    return { open: 'neutral', in_behandeling: 'info', wacht_op_klant: 'warning', afgerond: 'success' }[value] ?? 'neutral';
}

// Klantstatus (GarageCompanyStatus) naar badge-kleur.
function customerStatusTone(value) {
    return (
        {
            actief: 'success',
            proefperiode: 'info',
            demo_gepland: 'info',
            demo_aangevraagd: 'brand',
            lead: 'brand',
            gepauzeerd: 'brand',
            opgezegd: 'warning',
            verloren: 'neutral',
        }[value] ?? 'neutral'
    );
}

function countLabel(n, one, many) {
    return `${n} ${n === 1 ? one : many}`;
}

function parseId(value) {
    const n = Number(String(value).replace(/[^\d]/g, ''));
    return Number.isFinite(n) ? n : null;
}

function toLocalInputValue(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (v) => String(v).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isOverdue(task) {
    if (!task?.deadline || task.status === 'afgerond') return false;
    const date = new Date(task.deadline);
    return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

// Korte, menselijke deadline: "Vandaag 17:00", "Morgen 09:00", "12 okt 14:00".
function formatDeadline(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return String(isoString);
    const now = new Date();
    const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round((day(date) - day(now)) / 86400000);
    const time = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' }).format(date);
    if (diff === 0) return `Vandaag ${time}`;
    if (diff === 1) return `Morgen ${time}`;
    if (diff === -1) return `Gisteren ${time}`;
    const datePart = new Intl.DateTimeFormat('nl-NL', {
        day: 'numeric',
        month: 'short',
        ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    })
        .format(date)
        .replace('.', '');
    return `${datePart} ${time}`;
}

function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
}

function safeColor(value) {
    return typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value.trim()) ? value.trim() : null;
}

function OverdueBadge() {
    return (
        <Badge tone="danger" icon="clock">
            Te laat
        </Badge>
    );
}

function PriorityTag({ value, className = '' }) {
    const meta = priorityMeta(value);
    return (
        <span className={cx('inline-flex shrink-0 items-center gap-1.5 text-xs font-medium', meta.text, className)}>
            <StatusDot tone={meta.tone} />
            <span className="sr-only">Prioriteit: </span>
            {meta.label}
        </span>
    );
}

function ProjectDot({ kleur, className = '' }) {
    const color = safeColor(kleur);
    return <span aria-hidden="true" className={cx('inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]', !color && 'bg-zinc-300', className)} style={color ? { backgroundColor: color } : undefined} />;
}

function DeadlineMeta({ deadline, overdue = false, emptyLabel = 'Geen deadline', className = '' }) {
    if (!deadline) {
        return (
            <span className={cx('inline-flex items-center gap-1 whitespace-nowrap text-zinc-400', className)}>
                <Icon name="clock" className="h-3.5 w-3.5" />
                {emptyLabel}
            </span>
        );
    }
    return (
        <span
            className={cx(
                'inline-flex items-center gap-1 whitespace-nowrap',
                overdue ? 'rounded-md bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700 ring-1 ring-inset ring-rose-200' : 'text-zinc-600',
                className,
            )}
            title={formatDateTime(deadline)}
        >
            <Icon name={overdue ? 'alert-circle' : 'clock'} className="h-3.5 w-3.5" />
            {overdue ? <span>Te laat</span> : <span className="sr-only">Deadline: </span>}
            <span className={overdue ? 'font-medium text-rose-600' : undefined}>{formatDeadline(deadline)}</span>
        </span>
    );
}

function CountMeta({ icon, count, one, many }) {
    if (!count) return null;
    return (
        <span className="inline-flex items-center gap-1 tabular-nums text-zinc-500" title={countLabel(count, one, many)}>
            <Icon name={icon} className="h-3.5 w-3.5" />
            {count}
            <span className="sr-only"> {count === 1 ? one : many}</span>
        </span>
    );
}

function AvatarStack({ people = [], max = 3, size = 'xs' }) {
    const list = Array.isArray(people) ? people : [];
    if (list.length === 0) {
        return (
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-300 text-zinc-400" title="Niet toegewezen">
                <Icon name="user" className="h-3 w-3" />
                <span className="sr-only">Niet toegewezen</span>
            </span>
        );
    }
    const shown = list.slice(0, max);
    const rest = list.length - shown.length;
    return (
        <span className="flex shrink-0 items-center -space-x-1">
            <span className="sr-only">Toegewezen aan {list.map((p) => p.name).join(', ')}</span>
            {shown.map((p) => (
                <span key={p.id} className="rounded-full ring-2 ring-white" title={p.name}>
                    <Avatar name={p.name} size={size} />
                </span>
            ))}
            {rest > 0 ? (
                <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-zinc-100 px-1 text-[10px] font-semibold text-zinc-600 ring-2 ring-white" aria-hidden="true">
                    +{rest}
                </span>
            ) : null}
        </span>
    );
}

function CustomerChip({ customer, stopDrag = false, className = '' }) {
    if (!customer) return null;
    return (
        <a
            href={customer.url}
            title={`Klant openen: ${customer.naam}`}
            onPointerDown={stopDrag ? (e) => e.stopPropagation() : undefined}
            className={cx(
                'inline-flex max-w-full items-center gap-1.5 rounded-full bg-white py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200 transition-colors hover:bg-indigo-50 hover:text-indigo-900 hover:ring-indigo-200 focus-ring',
                className,
            )}
        >
            <Avatar name={customer.naam} size="xs" />
            <span className="truncate">{customer.naam}</span>
        </a>
    );
}

const EMPTY_TASK_FORM = {
    titel: '',
    omschrijving: '',
    task_project_id: '',
    status: 'open',
    prioriteit: 'normaal',
    deadline: '',
    labels: '',
    assignees: [],
    customer: null,
};

// Velden van het detailformulier, om niet opgeslagen wijzigingen te herkennen.
function detailSnapshot(task) {
    if (!task) return '';
    return JSON.stringify([
        task.titel ?? '',
        task.omschrijving ?? '',
        task.labels ?? '',
        task.prioriteit ?? '',
        task.task_project_id ?? null,
        toLocalInputValue(task.deadline),
        task.customer?.id ?? null,
        task.status ?? '',
        (task.assignees ?? []).map((a) => Number(a.id)).sort((a, b) => a - b),
    ]);
}

const FILTER_LABEL = 'block text-xs font-medium text-zinc-600';
// Statische klassen zodat Tailwind ze meeneemt.
const BOARD_GRID_COLS = { 1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4' };

const VIEW_TO_URL = { list: 'lijst', board: 'bord', team: 'team' };
const URL_TO_VIEW = { lijst: 'list', bord: 'board', team: 'team' };

// Mobiel (onder md) is een kanbanbord onhandig: standaard de lijst, tenzij de gebruiker op mobiel zelf
// een weergave koos (bewaard in localStorage). Desktop houdt het bord als standaard.
const MOBILE_VIEW_KEY = 'kivii.tasks.mobileView';

function isSmallScreen() {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767.98px)').matches;
}

function initialView(fromUrl) {
    if (fromUrl) return fromUrl;
    if (!isSmallScreen()) return 'board';
    try {
        const stored = window.localStorage.getItem(MOBILE_VIEW_KEY);
        if (stored && VIEW_TO_URL[stored]) return stored;
    } catch {
        // localStorage niet beschikbaar (privémodus): val terug op de lijst.
    }
    return 'list';
}

function rememberMobileView(view) {
    if (!isSmallScreen()) return;
    try {
        window.localStorage.setItem(MOBILE_VIEW_KEY, view);
    } catch {
        // Niet kritiek.
    }
}

function readUrlState() {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const group = params.get('groep');
    return {
        view: URL_TO_VIEW[params.get('weergave')] ?? null,
        group: group === 'project' || group === 'status' ? group : null,
        appointments: params.get('afspraken') === '1',
        taskId: parseId(params.get('taak') ?? '') || null,
        // /taken?nieuw=1&klant=ID opent direct "Nieuwe taak" met die klant ingevuld (link vanaf de klantpagina).
        newTask: params.get('nieuw') === '1',
    };
}

// Snelkeuze-datum. "Vandaag": standaardtijd als die nog moet komen, anders het
// volgende hele uur; valt dat na middernacht, dan morgen 09:00.
function shortcutDate(kind) {
    const date = new Date();
    if (kind === 'vandaag') {
        const now = new Date();
        date.setHours(17, 0, 0, 0);
        if (date <= now) {
            date.setTime(now.getTime());
            date.setHours(now.getHours() + 1, 0, 0, 0);
            if (date.getDate() !== now.getDate()) {
                date.setHours(9, 0, 0, 0);
            }
        }
    } else if (kind === 'morgen') {
        date.setDate(date.getDate() + 1);
        date.setHours(9, 0, 0, 0);
    } else {
        date.setDate(date.getDate() + 7);
        date.setHours(9, 0, 0, 0);
    }
    return toLocalInputValue(date.toISOString());
}

function CustomerPicker({ id, value, onChange, placeholder = 'Zoek een klant...', clearLabel = 'Wijzigen' }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(-1);
    const seqRef = useRef(0);

    useEffect(() => {
        if (!open || value) return undefined;
        const handler = setTimeout(async () => {
            const seq = ++seqRef.current;
            setLoading(true);
            try {
                const response = await axios.get('/taken/klanten', { params: { q: query.trim() || undefined } });
                if (seq === seqRef.current) setResults(response.data.customers ?? []);
            } catch {
                if (seq === seqRef.current) setResults([]);
            } finally {
                if (seq === seqRef.current) setLoading(false);
            }
        }, 200);
        return () => clearTimeout(handler);
    }, [query, open, value]);

    const choose = (customer) => {
        onChange(customer);
        setQuery('');
        setOpen(false);
        setActive(-1);
    };

    if (value) {
        return (
            <div className="mt-1 flex min-h-[2.375rem] items-center justify-between gap-2 rounded-xl border border-zinc-300 bg-white py-1 pl-1.5 pr-3 text-sm shadow-sm">
                <a href={value.url} className="inline-flex min-w-0 items-center gap-2 rounded-full font-semibold text-zinc-900 hover:text-indigo-700 focus-ring">
                    <Avatar name={value.naam} size="xs" />
                    <span className="truncate">{value.naam}</span>
                </a>
                <button
                    type="button"
                    className="shrink-0 rounded text-xs font-semibold text-zinc-600 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    aria-label={`${clearLabel}: klant ${value.naam}`}
                    onClick={() => onChange(null)}
                >
                    {clearLabel}
                </button>
            </div>
        );
    }

    const listId = `${id}-opties`;
    return (
        <div className="relative mt-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
                id={id}
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                autoComplete="off"
                className={cx(inputClasses, 'pl-9')}
                placeholder={placeholder}
                value={query}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                    setActive(-1);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setOpen(true);
                        setActive((i) => Math.min(i + 1, results.length - 1));
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActive((i) => Math.max(i - 1, 0));
                    } else if (e.key === 'Enter' && open && results[active]) {
                        e.preventDefault();
                        choose(results[active]);
                    } else if (e.key === 'Escape' && open) {
                        // Alleen de lijst sluiten, niet de omliggende modal.
                        e.stopPropagation();
                        setOpen(false);
                    }
                }}
            />
            {open ? (
                <ul id={listId} role="listbox" className="menu-panel absolute z-30 mt-1 max-h-60 w-full overflow-y-auto text-sm">
                    {loading && results.length === 0 ? <li className="px-2.5 py-2 text-zinc-500">Zoeken...</li> : null}
                    {!loading && results.length === 0 ? <li className="px-2.5 py-2 text-zinc-500">Geen klanten gevonden.</li> : null}
                    {results.map((customer, idx) => (
                        <li
                            key={customer.id}
                            id={`${listId}-${idx}`}
                            role="option"
                            aria-selected={idx === active}
                            className={cx('flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2', idx === active ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-zinc-50')}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                choose(customer);
                            }}
                        >
                            <Avatar name={customer.naam} size="xs" />
                            <span className="min-w-0 truncate font-semibold">{customer.naam}</span>
                            {customer.plaats ? <span className="ml-auto shrink-0 text-xs text-zinc-500">{customer.plaats}</span> : null}
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

// Inhoud van een taakkaart (bord, mobiele lijst). De titelknop strekt zich over de hele kaart uit,
// zodat de kaart overal klikbaar is; de klantlink ligt erboven (z-10) en blijft apart bereikbaar.
function TaskCardContent({ task, onOpen, stopDrag = false }) {
    const meta = priorityMeta(task.prioriteit);
    const overdue = isOverdue(task);
    return (
        <>
            <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', overdue ? 'bg-rose-500' : meta.edge)} />
            <button
                type="button"
                className="block w-full text-left after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-indigo-600"
                onClick={() => onOpen(task.id)}
                title={task.titel}
            >
                <span className={cx('line-clamp-2 text-sm font-semibold leading-5', task.status === 'afgerond' ? 'text-zinc-500 line-through decoration-zinc-300' : 'text-zinc-900')}>{task.titel}</span>
            </button>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <PriorityTag value={task.prioriteit} />
                {task.project?.naam ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-zinc-500">
                        <ProjectDot kleur={task.project.kleur} className="h-2 w-2" />
                        <span className="truncate">{task.project.naam}</span>
                    </span>
                ) : null}
            </div>
            {task.customer ? (
                <div className="relative z-10 mt-2.5 flex min-w-0">
                    <CustomerChip customer={task.customer} stopDrag={stopDrag} />
                </div>
            ) : null}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <DeadlineMeta deadline={task.deadline} overdue={overdue} />
                    <CountMeta icon="message-square" count={task.counts?.comments} one="reactie" many="reacties" />
                    <CountMeta icon="file-text" count={task.counts?.attachments} one="bijlage" many="bijlagen" />
                </div>
                <AvatarStack people={task.assignees} />
            </div>
        </>
    );
}

const CARD_BASE = 'relative overflow-hidden rounded-xl border bg-white py-3 pl-4 pr-3 shadow-card transition-[box-shadow,border-color] duration-150 hover:shadow-card-hover';

function SortableTaskCard({ task, onOpen }) {
    const id = `task-${task.id}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cx(
                CARD_BASE,
                'cursor-grab touch-manipulation active:cursor-grabbing',
                isOverdue(task) ? 'border-rose-200' : 'border-hairline hover:border-zinc-300',
                isDragging ? 'opacity-40' : 'opacity-100',
            )}
            aria-roledescription={attributes['aria-roledescription']}
            {...listeners}
        >
            {/* Alleen de knop is focusbaar; de kaart zelf is geen extra tab-stop. */}
            <TaskCardContent task={task} onOpen={onOpen} stopDrag />
        </div>
    );
}

function StaticTaskCard({ task, onOpen }) {
    return (
        <div className={cx(CARD_BASE, isOverdue(task) ? 'border-rose-200' : 'border-hairline')}>
            <TaskCardContent task={task} onOpen={onOpen} />
        </div>
    );
}

// Kolominhoud als drop-doel, zodat kaarten ook in een lege of andere kolom kunnen landen.
// Het id is gelijk aan col.id, zodat findContainerId de kolom direct herkent.
function DroppableBody({ id, children }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            className={cx(
                'mx-1.5 min-h-[6rem] flex-1 space-y-2 overflow-y-auto rounded-xl p-1.5 transition-colors lg:max-h-[calc(100vh-22rem)]',
                isOver && 'bg-indigo-50 ring-2 ring-inset ring-indigo-300',
            )}
        >
            {children}
        </div>
    );
}

function Column({ title, subtitle, count, lead, alert, children, footer, droppableId = null, fit = false }) {
    return (
        <div className={cx('flex h-full w-[min(300px,85vw)] flex-col rounded-2xl bg-zinc-200/40 ring-1 ring-inset ring-zinc-200/70', fit && 'xl:w-auto')}>
            <div className="flex items-center gap-2.5 px-3 pb-2 pt-3">
                {lead}
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-zinc-900" title={title}>
                        {title}
                    </h2>
                    {subtitle || alert ? (
                        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs">
                            {alert ? <span className="shrink-0 font-semibold text-rose-700">{alert}</span> : null}
                            {subtitle ? <span className="truncate text-zinc-500">{subtitle}</span> : null}
                        </div>
                    ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-700 shadow-card ring-1 ring-inset ring-black/5" aria-label={countLabel(count, 'taak', 'taken')}>
                    {count}
                </span>
            </div>
            {droppableId ? <DroppableBody id={droppableId}>{children}</DroppableBody> : <div className="flex-1 space-y-2 overflow-y-auto p-3">{children}</div>}
            {footer ? <div className="p-3 pt-2">{footer}</div> : null}
        </div>
    );
}

function columnLead(col, group, projects) {
    if (group === 'status') return <StatusDot tone={statusTone(col.status)} className="ml-1" />;
    if (group === 'project') {
        if (!col.projectId) return <IconTile icon="inbox" tone="neutral" size="sm" className="h-7 w-7" />;
        return (
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-card ring-1 ring-inset ring-black/5" aria-hidden="true">
                <ProjectDot kleur={projects.find((p) => p.id === col.projectId)?.kleur} />
            </span>
        );
    }
    if (!col.assigneeId) return <IconTile icon="user" tone="neutral" size="sm" />;
    return <Avatar name={col.title} size="sm" />;
}

function TaskOverlay({ task }) {
    if (!task) return null;
    const meta = priorityMeta(task.prioriteit);
    return (
        <div className="relative w-[min(300px,80vw)] rotate-1 cursor-grabbing overflow-hidden rounded-xl border border-indigo-200 bg-white py-3 pl-4 pr-3 shadow-pop">
            <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', meta.edge)} />
            <div className="truncate text-sm font-semibold text-zinc-900">{task.titel}</div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <PriorityTag value={task.prioriteit} />
                <DeadlineMeta deadline={task.deadline} overdue={isOverdue(task)} />
            </div>
        </div>
    );
}

function BoardSkeleton({ columns = 4 }) {
    return (
        <div className="flex gap-4 overflow-hidden" aria-hidden="true">
            {Array.from({ length: columns }, (_, i) => (
                <div key={i} className="w-[min(300px,85vw)] shrink-0 rounded-2xl bg-zinc-200/40 p-3 xl:w-auto xl:flex-1">
                    <Skeleton className="h-4 w-24" />
                    <div className="mt-4 space-y-2">
                        {Array.from({ length: 3 - (i % 2) }, (_, j) => (
                            <div key={j} className="rounded-xl bg-white p-3 shadow-card">
                                <Skeleton lines={2} />
                                <div className="mt-4 flex items-center justify-between">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-6 w-6 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ListSkeleton() {
    return (
        <div className="card divide-y divide-zinc-100" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="hidden h-6 w-28 rounded-full sm:block" />
                    <Skeleton className="hidden h-4 w-20 md:block" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                </div>
            ))}
        </div>
    );
}

// Bestandstype voor het icoon en de kleur van een bijlage.
function fileKind(name = '', mime = '') {
    const ext = String(name).split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'pdf' || mime === 'application/pdf') return { label: 'PDF', tone: 'danger' };
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || String(mime).startsWith('image/')) return { label: 'Afbeelding', tone: 'info' };
    if (['xls', 'xlsx', 'csv'].includes(ext)) return { label: ext === 'csv' ? 'CSV' : 'Excel', tone: 'success' };
    if (['doc', 'docx'].includes(ext)) return { label: 'Word', tone: 'brand' };
    return { label: ext ? ext.toUpperCase() : 'Bestand', tone: 'neutral' };
}

function ModalHeader({ id, icon, title, description, onClose }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
                <IconTile icon={icon} tone="brand" />
                <div className="min-w-0">
                    <h2 id={id} className="text-lg font-semibold text-zinc-900">
                        {title}
                    </h2>
                    {description ? <p className="mt-0.5 text-sm text-zinc-500">{description}</p> : null}
                </div>
            </div>
            <Button variant="ghost" size="sm" iconOnly icon="x" type="button" onClick={onClose} aria-label="Venster sluiten" />
        </div>
    );
}

function DrawerSection({ id, icon, title, count, actions, children, className = '' }) {
    return (
        <section className={cx('border-t border-zinc-100 pt-6', className)} aria-labelledby={id}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <h3 id={id} className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <Icon name={icon} className="h-4 w-4 text-zinc-400" />
                    {title}
                    {count ? <span className="rounded-full bg-zinc-100 px-1.5 text-2xs font-semibold tabular-nums text-zinc-600">{count}</span> : null}
                </h3>
                {actions}
            </div>
            {children}
        </section>
    );
}

// Mini-kaart van de gekoppelde klant in het taakdetail. `info` (status, MRR, open klantafspraken)
// komt uit het detail-endpoint; zonder info (net gewijzigde klant) tonen we alleen naam en plaats.
function CustomerMiniCard({ customer, info }) {
    if (!customer) return null;
    const data = info ?? customer;
    const mrr = info?.mrr > 0 ? formatMoney(info.mrr) : null;
    const open = Number(info?.open_appointments ?? 0);
    return (
        <div className="overflow-hidden rounded-2xl border border-hairline bg-gradient-to-b from-zinc-50 to-white">
            <div className="flex items-center gap-3 p-3.5">
                <Avatar name={data.naam} size="md" />
                <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-zinc-500">Klant</div>
                    <a href={data.url} className="block truncate font-semibold text-zinc-900 hover:text-indigo-700 focus-ring rounded">
                        {data.naam}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                        {info?.status_label ? (
                            <Badge tone={customerStatusTone(info.status)} dot>
                                {info.status_label}
                            </Badge>
                        ) : null}
                        {mrr ? (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                                <Icon name="euro" className="h-3.5 w-3.5 text-zinc-400" />
                                {mrr} per maand
                            </span>
                        ) : data.plaats ? (
                            <span className="inline-flex items-center gap-1">
                                <Icon name="map-pin" className="h-3.5 w-3.5 text-zinc-400" />
                                {data.plaats}
                            </span>
                        ) : null}
                    </div>
                </div>
                <a href={data.url} className={buttonClasses({ variant: 'secondary', size: 'sm', iconOnly: true })} aria-label={`Klantpagina van ${data.naam} openen`} title="Klantpagina openen">
                    <Icon name="arrow-up-right" className="h-4 w-4" />
                </a>
            </div>
            {info ? (
                <a
                    href={info.appointments_url}
                    className="flex items-center justify-between gap-3 border-t border-zinc-100 px-3.5 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600"
                >
                    <span className="inline-flex items-center gap-2">
                        <Icon name="calendar" className="h-4 w-4 text-zinc-400" />
                        {open > 0 ? (
                            <span>
                                <span className="font-semibold text-zinc-900">{open}</span> open {open === 1 ? 'klantafspraak' : 'klantafspraken'}
                            </span>
                        ) : (
                            'Geen open klantafspraken'
                        )}
                    </span>
                    <Icon name="chevron-right" className="h-4 w-4 text-zinc-400" />
                </a>
            ) : null}
        </div>
    );
}

function relativeTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'Zojuist';
    if (minutes < 60) return `${minutes} min geleden`;
    return formatDeadline(isoString);
}

function normalizeName(name) {
    return String(name || '').trim().toLowerCase();
}

function buildColumnSpecs({ view, groupBoardBy, projects, users, statusOptions, tasks = [] }) {
    const columns = [];
    // userId -> kolom-userId. Toegewezenen die niet in de keuzelijst staan (dubbele naam of
    // geen CRM-gebruiker) krijgen zo toch een kolom, anders verdwijnt hun taak uit de teamweergave.
    const assigneeAlias = {};
    const group = view === 'team' ? 'assignee' : groupBoardBy;

    if (group === 'project') {
        columns.push({ id: 'col-project-inbox', title: 'Geen project', subtitle: null, projectId: null });
        projects.forEach((p) => {
            columns.push({
                id: `col-project-${p.id}`,
                title: p.naam,
                subtitle: p.deadline ? `Deadline: ${formatDateTime(p.deadline)}` : null,
                projectId: p.id,
            });
        });
    } else if (group === 'status') {
        statusOptions.forEach((s) => columns.push({ id: `col-status-${s}`, title: statusLabel(s), subtitle: null, status: s }));
    } else {
        columns.push({ id: 'col-assignee-unassigned', title: 'Niet toegewezen', subtitle: null, assigneeId: null });
        const byName = new Map();
        users.forEach((u) => {
            assigneeAlias[u.id] = u.id;
            if (!byName.has(normalizeName(u.name))) byName.set(normalizeName(u.name), u.id);
            columns.push({ id: `col-assignee-${u.id}`, title: u.name, subtitle: null, assigneeId: u.id });
        });
        tasks.forEach((task) => {
            (task.assignees ?? []).forEach((a) => {
                const aid = Number(a.id);
                if (!aid || assigneeAlias[aid]) return;
                const sameName = byName.get(normalizeName(a.name));
                if (sameName) {
                    assigneeAlias[aid] = sameName;
                    return;
                }
                assigneeAlias[aid] = aid;
                columns.push({ id: `col-assignee-${aid}`, title: a.name || 'Onbekend', subtitle: 'Niet in de keuzelijst', assigneeId: aid });
            });
        });
    }

    return { group, columns, assigneeAlias };
}

function taskPrimaryAssigneeId(task) {
    const first = task.assignees?.[0]?.id;
    return first ?? null;
}

function columnIdForTask(task, group, assigneeAlias = {}) {
    if (group === 'project') return task.task_project_id ? `col-project-${task.task_project_id}` : 'col-project-inbox';
    if (group === 'status') return `col-status-${task.status}`;
    const assigneeId = taskPrimaryAssigneeId(task);
    if (!assigneeId) return 'col-assignee-unassigned';
    return `col-assignee-${assigneeAlias[assigneeId] ?? assigneeId}`;
}

function buildItemsByColumn(tasks, columns, group, assigneeAlias) {
    const base = Object.fromEntries(columns.map((c) => [c.id, []]));
    const orderById = Object.fromEntries(tasks.map((t) => [t.id, t.sort_order ?? 0]));

    tasks.forEach((task) => {
        const colId = columnIdForTask(task, group, assigneeAlias);
        if (!base[colId]) base[colId] = [];
        base[colId].push(`task-${task.id}`);
    });

    Object.keys(base).forEach((key) => {
        base[key] = base[key]
            .map((id) => ({ id, taskId: parseId(id) }))
            .filter((row) => row.taskId)
            .sort((a, b) => {
                const oa = orderById[a.taskId] ?? 0;
                const ob = orderById[b.taskId] ?? 0;
                if (oa !== ob) return oa - ob;
                return a.taskId - b.taskId;
            })
            .map((row) => row.id);
    });

    return base;
}

function findContainerId(itemsByColumn, id) {
    if (!id) return null;
    if (Object.prototype.hasOwnProperty.call(itemsByColumn, id)) return id;
    return Object.keys(itemsByColumn).find((key) => itemsByColumn[key].includes(id)) ?? null;
}

export default function Tasks({ initial, filters, customerFilter, urls }) {
    const authUser = usePage().props?.auth?.user ?? null;
    const currentUserId = Number(authUser?.id) || null;
    const confirm = useConfirm();
    const detailBaselineRef = useRef('');
    const confirmingRef = useRef(false);
    const [urlInit] = useState(() => readUrlState());
    const [tasks, setTasks] = useState(initial?.tasks ?? []);
    const [projects, setProjects] = useState(initial?.projects ?? []);
    const [users, setUsers] = useState(() => dedupeById(initial?.users));
    const [statusOptions, setStatusOptions] = useState(initial?.statusOptions ?? []);
    const [priorityOptions, setPriorityOptions] = useState(initial?.priorityOptions ?? []);

    const [view, setView] = useState(() => initialView(urlInit.view)); // board | list | team
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [groupBoardBy, setGroupBoardBy] = useState(urlInit.group ?? 'status'); // project | status
    const [filterCustomer, setFilterCustomer] = useState(customerFilter ?? null);
    const [showAppointments, setShowAppointments] = useState(Boolean(urlInit.appointments));
    const [appointments, setAppointments] = useState(Array.isArray(initial?.appointments) ? initial.appointments : []);
    const [appointmentBusy, setAppointmentBusy] = useState({});
    const [sortMode, setSortMode] = useState(filters?.sort ?? 'deadline');
    const [filterProject, setFilterProject] = useState(filters?.project ?? '');
    const [filterAssignee, setFilterAssignee] = useState(filters?.assignee ?? '');
    const [filterStatus, setFilterStatus] = useState(filters?.status ?? '');
    const [filterPriority, setFilterPriority] = useState(filters?.prioriteit ?? filters?.priority ?? '');
    const [search, setSearch] = useState(filters?.search ?? '');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState(null);

    const [showProjectModal, setShowProjectModal] = useState(false);
    const [projectForm, setProjectForm] = useState({ naam: '', omschrijving: '', deadline: '', kleur: '' });
    const [projectErrors, setProjectErrors] = useState({});
    const [projectSaving, setProjectSaving] = useState(false);

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
    const [taskFiles, setTaskFiles] = useState([]);
    const [taskErrors, setTaskErrors] = useState({});
    const [taskSaving, setTaskSaving] = useState(false);

    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailSaving, setDetailSaving] = useState(false);
    const [detailErrors, setDetailErrors] = useState({});
    const [commentBody, setCommentBody] = useState('');
    const [commentSaving, setCommentSaving] = useState(false);
    const [attachmentUploading, setAttachmentUploading] = useState(false);

    const [quickAdd, setQuickAdd] = useState({});
    const [quickAddSaving, setQuickAddSaving] = useState({});
    const fetchSeqRef = useRef(0);
    const dragOriginRef = useRef(null);
    const dragSnapshotRef = useRef(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const fetchTasks = useCallback(async () => {
        const seq = ++fetchSeqRef.current;
        setLoading(true);
        try {
            const response = await axios.get('/taken/data', {
                params: {
                    project: filterProject || undefined,
                    assignee: filterAssignee || undefined,
                    status: filterStatus || undefined,
                    prioriteit: filterPriority || undefined,
                    search: search || undefined,
                    sort: sortMode || undefined,
                    klant: filterCustomer?.id || undefined,
                    afspraken: showAppointments ? 1 : undefined,
                },
            });
            // Negeer verouderde antwoorden als de filters intussen zijn gewijzigd.
            if (seq !== fetchSeqRef.current) return;
            setTasks(response.data.tasks ?? []);
            setProjects(response.data.projects ?? []);
            setUsers(dedupeById(response.data.users));
            setStatusOptions(response.data.statusOptions ?? []);
            setPriorityOptions(response.data.priorityOptions ?? []);
            if (Array.isArray(response.data.appointments)) setAppointments(response.data.appointments);
        } catch {
            if (seq !== fetchSeqRef.current) return;
            setNotice({ tone: 'error', text: 'Taken laden mislukt. Probeer opnieuw.' });
        } finally {
            if (seq === fetchSeqRef.current) setLoading(false);
        }
    }, [filterProject, filterAssignee, filterStatus, filterPriority, search, sortMode, filterCustomer, showAppointments]);

    useEffect(() => {
        const handler = setTimeout(() => fetchTasks(), 250);
        return () => clearTimeout(handler);
    }, [fetchTasks]);

    useEffect(() => {
        if (!notice || notice.tone === 'error') return undefined;
        const handler = setTimeout(() => setNotice(null), 4000);
        return () => clearTimeout(handler);
    }, [notice]);

    const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

    // Alleen de teamweergave leidt kolommen af uit de taken (extra toegewezenen).
    const tasksForColumns = view === 'team' ? tasks : null;
    const { group, columns, assigneeAlias } = useMemo(
        () => buildColumnSpecs({ view, groupBoardBy, projects, users, statusOptions, tasks: tasksForColumns ?? [] }),
        [view, groupBoardBy, projects, users, statusOptions, tasksForColumns],
    );

    const [itemsByColumn, setItemsByColumn] = useState(() => buildItemsByColumn(tasks, columns, group, assigneeAlias));
    const [activeDragId, setActiveDragId] = useState(null);

    useEffect(() => {
        setItemsByColumn(buildItemsByColumn(tasks, columns, group, assigneeAlias));
    }, [tasks, columns, group, assigneeAlias]);

    // Bord: tot 4 kolommen passen vanaf xl in een grid; anders horizontaal scrollen met een vervaagde rand als hint.
    const boardFits = columns.length > 0 && columns.length <= 4;
    const boardScrollRef = useRef(null);
    const [boardScroll, setBoardScroll] = useState({ start: true, end: true });
    const updateBoardScroll = useCallback(() => {
        const el = boardScrollRef.current;
        if (!el) return;
        const start = el.scrollLeft <= 2;
        const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
        setBoardScroll((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    }, []);
    useEffect(() => {
        updateBoardScroll();
        window.addEventListener('resize', updateBoardScroll);
        return () => window.removeEventListener('resize', updateBoardScroll);
    }, [updateBoardScroll, columns.length, view]);

    const activeDragTask = useMemo(() => {
        const tid = parseId(activeDragId);
        return tid ? taskById[tid] : null;
    }, [activeDragId, taskById]);

    const openTaskSeqRef = useRef(0);
    const loadTask = useCallback(async (taskId) => {
        const seq = ++openTaskSeqRef.current;
        setSelectedTaskId(taskId);
        setSelectedTask(null);
        setDetailErrors({});
        setCommentBody('');
        setDetailLoading(true);
        try {
            const response = await axios.get(`/taken/${taskId}`);
            if (seq !== openTaskSeqRef.current) return;
            const loaded = response.data.task ?? null;
            detailBaselineRef.current = detailSnapshot(loaded);
            setSelectedTask(loaded);
        } catch {
            if (seq !== openTaskSeqRef.current) return;
            setNotice({ tone: 'error', text: 'Taak laden mislukt.' });
        } finally {
            if (seq === openTaskSeqRef.current) setDetailLoading(false);
        }
    }, []);

    // Vraagt bevestiging als het detailformulier niet opgeslagen wijzigingen heeft.
    const confirmDiscardDetail = useCallback(async () => {
        if (!selectedTask || detailSnapshot(selectedTask) === detailBaselineRef.current) return true;
        if (confirmingRef.current) return false;
        confirmingRef.current = true;
        try {
            return await confirm({
                title: 'Niet opgeslagen wijzigingen',
                message: 'Je hebt wijzigingen in deze taak die nog niet zijn opgeslagen. Wil je deze verwerpen?',
                confirmText: 'Verwerpen',
                cancelText: 'Blijven',
                tone: 'danger',
            });
        } finally {
            confirmingRef.current = false;
        }
    }, [confirm, selectedTask]);

    const openTask = useCallback(
        async (taskId) => {
            if (selectedTaskId && Number(taskId) !== Number(selectedTaskId) && !(await confirmDiscardDetail())) return;
            loadTask(taskId);
        },
        [confirmDiscardDetail, loadTask, selectedTaskId],
    );

    const closeTask = useCallback(async () => {
        if (!(await confirmDiscardDetail())) return;
        openTaskSeqRef.current += 1;
        detailBaselineRef.current = '';
        setSelectedTaskId(null);
        setSelectedTask(null);
        setDetailLoading(false);
        setDetailErrors({});
    }, [confirmDiscardDetail]);

    // Weergave, filters en open taak in de URL bewaren (deelbaar en herlaadbaar).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams();
        params.set('weergave', VIEW_TO_URL[view] ?? 'bord');
        if (view === 'board') params.set('groep', groupBoardBy);
        if (filterProject) params.set('project', filterProject);
        if (filterAssignee) params.set('assignee', filterAssignee);
        if (filterStatus) params.set('status', filterStatus);
        if (filterPriority) params.set('prioriteit', filterPriority);
        if (search) params.set('search', search);
        if (sortMode && sortMode !== 'deadline') params.set('sort', sortMode);
        if (filterCustomer?.id) params.set('klant', String(filterCustomer.id));
        if (showAppointments) params.set('afspraken', '1');
        if (selectedTaskId) params.set('taak', String(selectedTaskId));
        const qs = params.toString();
        const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
        if (next !== `${window.location.pathname}${window.location.search}`) {
            window.history.replaceState(window.history.state, '', next);
        }
    }, [view, groupBoardBy, filterProject, filterAssignee, filterStatus, filterPriority, search, sortMode, filterCustomer, showAppointments, selectedTaskId]);

    useEffect(() => {
        if (urlInit.taskId) loadTask(urlInit.taskId);
        // Alleen bij het laden van de pagina.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const completeSelectedTask = useCallback(async () => {
        if (!selectedTask || detailSaving) return;
        setDetailSaving(true);
        try {
            const response = await axios.patch(`/taken/tasks/${selectedTask.id}/status`, { status: 'afgerond' });
            const updated = response.data.task;
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
            setSelectedTask((prev) => {
                if (!prev || prev.id !== updated.id) return prev;
                // Alleen de status is opgeslagen; overige niet opgeslagen wijzigingen blijven 'vuil'.
                const base = JSON.parse(detailBaselineRef.current || 'null');
                if (Array.isArray(base)) {
                    base[7] = updated.status;
                    detailBaselineRef.current = JSON.stringify(base);
                }
                return { ...prev, status: updated.status };
            });
            setNotice({ tone: 'success', text: 'Taak afgerond.' });
        } catch (error) {
            setNotice({ tone: 'error', text: firstError(error, 'Afronden mislukt.') });
        } finally {
            setDetailSaving(false);
        }
    }, [selectedTask, detailSaving]);

    const completeAppointment = useCallback((appointment) => {
        if (!appointment?.done_url) return;
        // Hergebruikt de bestaande route op de klantpagina (markTaskDone).
        router.patch(
            appointment.done_url,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setAppointmentBusy((prev) => ({ ...prev, [appointment.id]: true })),
                onSuccess: () => setAppointments((prev) => prev.filter((a) => a.id !== appointment.id)),
                onError: () => setNotice({ tone: 'error', text: 'Afronden mislukt.' }),
                onFinish: () => setAppointmentBusy((prev) => ({ ...prev, [appointment.id]: false })),
            },
        );
    }, []);

    const openNewTaskModal = useCallback(() => {
        setTaskForm((t) => {
            const next = { ...t };
            if (next.assignees.length === 0 && currentUserId && users.some((u) => Number(u.id) === currentUserId)) {
                next.assignees = [currentUserId];
            }
            if (!next.customer && filterCustomer) next.customer = filterCustomer;
            return next;
        });
        setShowTaskModal(true);
    }, [currentUserId, users, filterCustomer]);

    useEffect(() => {
        // Eenmalig bij laden: ?nieuw=1 opent het formulier (klant komt uit ?klant=, via customerFilter).
        if (urlInit.newTask && !urlInit.taskId) openNewTaskModal();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveTaskDetails = useCallback(
        async (event) => {
            event.preventDefault();
            if (!selectedTask || detailSaving) return;
            if (!String(selectedTask.titel ?? '').trim()) {
                setDetailErrors({ titel: ['Titel is verplicht.'] });
                return;
            }
            setDetailSaving(true);
            setDetailErrors({});
            try {
                    const response = await axios.patch(`/taken/tasks/${selectedTask.id}`, {
                        titel: String(selectedTask.titel).trim(),
                        omschrijving: selectedTask.omschrijving ?? null,
                        labels: selectedTask.labels ?? null,
                        prioriteit: selectedTask.prioriteit ?? 'normaal',
                        task_project_id: selectedTask.task_project_id ?? null,
                        // Altijd als lokale datum/tijd versturen (zoals bij aanmaken), zodat een
                        // ongewijzigde deadline niet verschuift door de tijdzone in de ISO-string.
                        deadline: toLocalInputValue(selectedTask.deadline) || null,
                        garage_company_id: selectedTask.customer?.id ?? null,
                        status: selectedTask.status ?? 'open',
                        assignees: (selectedTask.assignees ?? []).map((a) => a.id),
                    });
                const updated = response.data.task;
                setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
                setSelectedTask((prev) => {
                    if (!prev || prev.id !== updated.id) return prev;
                    const merged = { ...prev, ...updated };
                    detailBaselineRef.current = detailSnapshot(merged);
                    return merged;
                });
                setNotice({ tone: 'success', text: 'Taak opgeslagen.' });
            } catch (error) {
                setDetailErrors(error?.response?.data?.errors ?? {});
                setNotice({ tone: 'error', text: firstError(error, 'Opslaan mislukt.') });
            } finally {
                setDetailSaving(false);
            }
        },
        [selectedTask, detailSaving],
    );

    const addComment = useCallback(
        async (event) => {
            event.preventDefault();
            if (!selectedTaskId || !commentBody.trim() || commentSaving) return;
            setCommentSaving(true);
            try {
                const response = await axios.post(`/taken/tasks/${selectedTaskId}/comments`, { body: commentBody.trim() });
                setSelectedTask((prev) => {
                    if (!prev) return prev;
                    return { ...prev, comments: [...(prev.comments ?? []), response.data.comment] };
                });
                setCommentBody('');
                setTasks((prev) =>
                    prev.map((t) =>
                        t.id === selectedTaskId ? { ...t, counts: { ...(t.counts ?? {}), comments: (t.counts?.comments ?? 0) + 1 } } : t,
                    ),
                );
            } catch (error) {
                setNotice({ tone: 'error', text: firstError(error, 'Reactie plaatsen mislukt.') });
            } finally {
                setCommentSaving(false);
            }
        },
        [commentBody, commentSaving, selectedTaskId],
    );

    const uploadAttachments = useCallback(
        async (files) => {
            if (!selectedTaskId || !files || files.length === 0) return;
            setAttachmentUploading(true);
            const failures = [];
            try {
                for (const file of files) {
                    const form = new FormData();
                    form.append('file', file);
                    let response;
                    try {
                        response = await axios.post(`/taken/tasks/${selectedTaskId}/attachments`, form, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                        });
                    } catch (error) {
                        failures.push(`${file.name}: ${firstError(error, 'uploaden mislukt.')}`);
                        continue;
                    }
                    setSelectedTask((prev) => {
                        if (!prev) return prev;
                        return { ...prev, attachments: [...(prev.attachments ?? []), response.data.attachment] };
                    });
                    setTasks((prev) =>
                        prev.map((t) =>
                            t.id === selectedTaskId
                                ? { ...t, counts: { ...(t.counts ?? {}), attachments: (t.counts?.attachments ?? 0) + 1 } }
                                : t,
                        ),
                    );
                }
                if (failures.length > 0) {
                    setNotice({ tone: 'error', text: `Bijlage uploaden mislukt. ${failures.join(' ')}` });
                } else {
                    setNotice({ tone: 'success', text: files.length === 1 ? 'Bijlage geüpload.' : 'Bijlagen geüpload.' });
                }
            } finally {
                setAttachmentUploading(false);
            }
        },
        [selectedTaskId],
    );

    const persistReorder = useCallback(
        async (changes) => {
            if (!changes || changes.length === 0) return;
            try {
                await axios.patch('/taken/tasks/reorder', { changes });
            } catch (error) {
                // Valt de reorder-route weg (bijv. 404 door route-volgorde), sla dan per taak op.
                if (error?.response?.status === 404 || error?.response?.status === 405) {
                    try {
                        for (const row of changes) {
                            await axios.patch(`/taken/tasks/${row.id}`, {
                                task_project_id: row.task_project_id ?? null,
                                ...(row.status ? { status: row.status } : {}),
                                sort_order: row.sort_order,
                            });
                        }
                        return;
                    } catch (fallbackError) {
                        setNotice({ tone: 'error', text: firstError(fallbackError, 'Opslaan van volgorde mislukt. Vernieuw de pagina en probeer opnieuw.') });
                        fetchTasks();
                        return;
                    }
                }
                setNotice({ tone: 'error', text: firstError(error, 'Opslaan van volgorde mislukt. Vernieuw de pagina en probeer opnieuw.') });
                fetchTasks();
            }
        },
        [fetchTasks],
    );

    const applyItemsToState = useCallback(
        ({ nextItems, movedTaskId = null, movedAssignees = null }) => {
            setItemsByColumn(nextItems);
            setTasks((prev) => {
                const next = prev.map((t) => ({ ...t }));
                const byId = Object.fromEntries(next.map((t) => [t.id, t]));

                columns.forEach((col) => {
                    const ids = nextItems[col.id] ?? [];
                    ids.forEach((taskKey, idx) => {
                        const tid = parseId(taskKey);
                        if (!tid || !byId[tid]) return;
                        byId[tid].sort_order = (idx + 1) * 10;
                        if (group === 'project') {
                            byId[tid].task_project_id = col.projectId ?? null;
                            byId[tid].project = col.projectId
                                ? { id: col.projectId, naam: col.title, kleur: projects.find((p) => p.id === col.projectId)?.kleur ?? null }
                                : null;
                        } else if (group === 'status') {
                            byId[tid].status = col.status ?? byId[tid].status;
                        } else if (group === 'assignee' && movedTaskId && tid === movedTaskId && Array.isArray(movedAssignees)) {
                            byId[tid].assignees = movedAssignees;
                        }
                    });
                });

                return next;
            });
        },
        [columns, group, projects],
    );

    const restoreDragSnapshot = useCallback(() => {
        if (dragSnapshotRef.current) setItemsByColumn(dragSnapshotRef.current);
        dragSnapshotRef.current = null;
        dragOriginRef.current = null;
    }, []);

    const onDragStart = useCallback(
        ({ active }) => {
            setActiveDragId(active?.id ?? null);
            dragSnapshotRef.current = itemsByColumn;
            dragOriginRef.current = findContainerId(itemsByColumn, active?.id);
        },
        [itemsByColumn],
    );

    const onDragCancel = useCallback(() => {
        setActiveDragId(null);
        restoreDragSnapshot();
    }, [restoreDragSnapshot]);

    const onDragOver = useCallback(
        ({ active, over }) => {
            const activeId = active?.id;
            const overId = over?.id;
            if (!activeId || !overId) return;

            const fromContainer = findContainerId(itemsByColumn, activeId);
            const toContainer = findContainerId(itemsByColumn, overId);
            if (!fromContainer || !toContainer) return;
            if (fromContainer === toContainer) return;

            setItemsByColumn((prev) => {
                const next = { ...prev };
                const fromItems = [...(next[fromContainer] ?? [])];
                const toItems = [...(next[toContainer] ?? [])];
                const fromIndex = fromItems.indexOf(activeId);
                if (fromIndex === -1) return prev;
                fromItems.splice(fromIndex, 1);

                const overIndex = toItems.indexOf(overId);
                const insertAt = overIndex === -1 ? toItems.length : overIndex;
                toItems.splice(insertAt, 0, activeId);
                next[fromContainer] = fromItems;
                next[toContainer] = toItems;
                return next;
            });
        },
        [itemsByColumn],
    );

    const onDragEnd = useCallback(
        async ({ active, over }) => {
            const activeId = active?.id;
            const overId = over?.id;
            const originContainer = dragOriginRef.current;
            const snapshot = dragSnapshotRef.current;
            setActiveDragId(null);
            dragOriginRef.current = null;
            dragSnapshotRef.current = null;

            if (!activeId || !overId) {
                if (snapshot) setItemsByColumn(snapshot);
                return;
            }

            // onDragOver heeft de kaart mogelijk al naar de doelkolom verplaatst.
            const currentContainer = findContainerId(itemsByColumn, activeId);
            const overContainer = findContainerId(itemsByColumn, overId);
            if (!currentContainer || !overContainer) {
                if (snapshot) setItemsByColumn(snapshot);
                return;
            }

            let nextItems = itemsByColumn;
            let finalContainer = currentContainer;
            if (currentContainer === overContainer) {
                const items = itemsByColumn[currentContainer] ?? [];
                const oldIndex = items.indexOf(activeId);
                const newIndex = items.indexOf(overId);
                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    nextItems = { ...itemsByColumn, [currentContainer]: arrayMove(items, oldIndex, newIndex) };
                }
            } else {
                const fromItems = (itemsByColumn[currentContainer] ?? []).filter((id) => id !== activeId);
                const toItems = [...(itemsByColumn[overContainer] ?? [])];
                const overIndex = toItems.indexOf(overId);
                toItems.splice(overIndex === -1 ? toItems.length : overIndex, 0, activeId);
                nextItems = { ...itemsByColumn, [currentContainer]: fromItems, [overContainer]: toItems };
                finalContainer = overContainer;
            }

            const origin = originContainer ?? finalContainer;
            const movedColumn = origin !== finalContainer;
            if (!movedColumn && nextItems === itemsByColumn && snapshot) {
                const before = snapshot[origin] ?? [];
                const after = nextItems[origin] ?? [];
                if (before.length === after.length && before.every((id, idx) => id === after[idx])) return;
            }

            const movedTaskId = parseId(activeId);
            let movedAssignees = null;

            if (group === 'assignee' && movedColumn && movedTaskId !== null) {
                const fromCol = columns.find((c) => c.id === origin);
                const toCol = columns.find((c) => c.id === finalContainer);
                const toAssigneeId = toCol?.assigneeId ?? null;
                const current = taskById[movedTaskId]?.assignees ?? [];
                if (toAssigneeId) {
                    // Vervang alleen de persoon van de bronkolom; overige toegewezenen blijven behouden.
                    const colOf = (a) => assigneeAlias[a.id] ?? a.id;
                    const others = current.filter((a) => colOf(a) !== fromCol?.assigneeId && colOf(a) !== toAssigneeId);
                    const toUser = users.find((u) => u.id === toAssigneeId);
                    movedAssignees = [{ id: toAssigneeId, name: toUser?.name ?? toCol?.title ?? '' }, ...others];
                } else {
                    movedAssignees = [];
                }
                try {
                    await axios.patch(`/taken/tasks/${movedTaskId}`, {
                        assignees: movedAssignees.map((a) => a.id),
                    });
                } catch (error) {
                    setNotice({ tone: 'error', text: firstError(error, 'Toewijzen mislukt. Probeer opnieuw.') });
                    if (snapshot) setItemsByColumn(snapshot);
                    fetchTasks();
                    return;
                }
            }

            applyItemsToState({ nextItems, movedTaskId, movedAssignees });

            const affectedContainers = Array.from(new Set([origin, finalContainer]));
            const changes = affectedContainers.flatMap((containerId) => {
                const col = columns.find((c) => c.id === containerId);
                return (nextItems[containerId] ?? [])
                    .map((taskKey, idx) => {
                        const tid = parseId(taskKey);
                        if (!tid) return null;
                        const task = taskById[tid] ?? {};
                        return {
                            id: tid,
                            task_project_id: group === 'project' ? col?.projectId ?? null : (task.task_project_id ?? null),
                            status: group === 'status' ? col?.status ?? task.status ?? null : (task.status ?? null),
                            sort_order: (idx + 1) * 10,
                        };
                    })
                    .filter(Boolean);
            });
            await persistReorder(changes);
        },
        [applyItemsToState, assigneeAlias, columns, fetchTasks, group, itemsByColumn, persistReorder, taskById, users],
    );

    const createProject = useCallback(
        async (event) => {
            event.preventDefault();
            if (projectSaving) return;
            if (!projectForm.naam.trim()) {
                setProjectErrors({ naam: ['Naam is verplicht.'] });
                return;
            }
            setProjectSaving(true);
            setProjectErrors({});
            try {
                const response = await axios.post('/taken/projects', projectForm);
                setProjects((prev) => [...prev, response.data.project].sort((a, b) => String(a.naam).localeCompare(String(b.naam))));
                setProjectForm({ naam: '', omschrijving: '', deadline: '', kleur: '' });
                setShowProjectModal(false);
                setNotice({ tone: 'success', text: 'Project toegevoegd.' });
            } catch (error) {
                const errors = error?.response?.data?.errors;
                setProjectErrors(errors ?? {});
                if (!errors) setNotice({ tone: 'error', text: firstError(error, 'Project opslaan mislukt.') });
            } finally {
                setProjectSaving(false);
            }
        },
        [projectForm, projectSaving],
    );

    const quickCreateTask = useCallback(
        async ({ column, title }) => {
            const trimmed = String(title || '').trim();
            if (!trimmed || quickAddSaving[column.id]) return;
            setQuickAddSaving((prev) => ({ ...prev, [column.id]: true }));
            try {
                const payload = {
                    titel: trimmed,
                    omschrijving: null,
                    // Neem actieve filters over, anders verdwijnt de nieuwe taak bij de volgende verversing.
                    task_project_id: group === 'project' ? column.projectId : (filterProject ? Number(filterProject) : null),
                    status: group === 'status' ? column.status : (filterStatus || 'open'),
                    prioriteit: filterPriority || 'normaal',
                    deadline: null,
                    labels: null,
                    assignees:
                        view === 'team'
                            ? (column.assigneeId ? [column.assigneeId] : [])
                            : (filterAssignee ? [Number(filterAssignee)] : []),
                    garage_company_id: filterCustomer?.id ?? null,
                };
                const response = await axios.post('/taken/tasks', payload);
                const created = response.data.task;
                setTasks((prev) => [created, ...prev]);
                setQuickAdd((prev) => ({ ...prev, [column.id]: '' }));
            } catch (error) {
                setNotice({ tone: 'error', text: firstError(error, 'Taak aanmaken mislukt.') });
            } finally {
                setQuickAddSaving((prev) => ({ ...prev, [column.id]: false }));
            }
        },
        [filterAssignee, filterCustomer, filterPriority, filterProject, filterStatus, group, quickAddSaving, view],
    );

    const createTask = useCallback(
        async (event) => {
            event.preventDefault();
            if (taskSaving) return;
            if (!taskForm.titel.trim()) {
                setTaskErrors({ titel: ['Titel is verplicht.'] });
                return;
            }
            setTaskSaving(true);
            setTaskErrors({});
            try {
                const form = new FormData();
                form.append('titel', taskForm.titel.trim());
                if (taskForm.omschrijving) form.append('omschrijving', taskForm.omschrijving);
                if (taskForm.task_project_id) form.append('task_project_id', taskForm.task_project_id);
                form.append('status', taskForm.status);
                form.append('prioriteit', taskForm.prioriteit);
                if (taskForm.deadline) form.append('deadline', taskForm.deadline);
                if (taskForm.labels) form.append('labels', taskForm.labels);
                if (taskForm.customer?.id) form.append('garage_company_id', taskForm.customer.id);
                taskForm.assignees.forEach((id) => form.append('assignees[]', id));
                taskFiles.forEach((file) => form.append('attachments[]', file));

                await axios.post('/taken/tasks', form);
                setTaskForm(EMPTY_TASK_FORM);
                setTaskFiles([]);
                setShowTaskModal(false);
                setNotice({ tone: 'success', text: 'Taak toegevoegd.' });
                fetchTasks();
            } catch (error) {
                const errors = error?.response?.data?.errors;
                setTaskErrors(errors ?? {});
                if (!errors) setNotice({ tone: 'error', text: firstError(error, 'Taak opslaan mislukt.') });
            } finally {
                setTaskSaving(false);
            }
        },
        [taskForm, taskFiles, taskSaving, fetchTasks],
    );

    // De server sorteert al volgens de gekozen sortering; niet opnieuw sorteren.
    const listRows = tasks;

    const hasActiveFilters = Boolean(filterProject || filterAssignee || filterStatus || filterPriority || search.trim() || filterCustomer);
    const activeFilterCount = [filterProject, filterAssignee, filterStatus, filterPriority, search.trim(), filterCustomer].filter(Boolean).length;
    const resetFilters = useCallback(() => {
        setFilterProject('');
        setFilterAssignee('');
        setFilterStatus('');
        setFilterPriority('');
        setSearch('');
        setFilterCustomer(null);
    }, []);

    const emptyTasksState = hasActiveFilters ? (
        <EmptyState
            illustration="search"
            title="Geen taken gevonden"
            description="Geen enkele taak past bij deze filters. Wis de filters of zoek op iets anders."
            action={
                <Button variant="secondary" icon="x" onClick={resetFilters}>
                    Filters wissen
                </Button>
            }
        />
    ) : (
        <EmptyState
            illustration="tasks"
            title="Nog geen taken"
            description="Maak een taak aan en verdeel het werk over je team. Koppel een klant om alles bij elkaar te houden."
            action={
                <Button icon="plus" onClick={openNewTaskModal}>
                    Nieuwe taak
                </Button>
            }
        />
    );

    // Detailformulier: niet opgeslagen wijzigingen zichtbaar maken.
    const detailDirty = Boolean(selectedTask) && detailSnapshot(selectedTask) !== detailBaselineRef.current;
    const currentUserName = authUser?.name ?? '';
    const customerInfo = selectedTask?.customer_info && selectedTask.customer_info.id === selectedTask?.customer?.id ? selectedTask.customer_info : null;
    const boardInitialLoading = loading && tasks.length === 0;

    const closeProjectModal = useCallback(() => setShowProjectModal(false), []);
    const closeTaskModal = useCallback(() => setShowTaskModal(false), []);
    const projectDialogRef = useDialog(showProjectModal, closeProjectModal);
    const taskDialogRef = useDialog(showTaskModal, closeTaskModal);
    const detailDialogRef = useDialog(Boolean(selectedTaskId), closeTask);

    return (
        <>
            <Head title="Taken" />
            <div className="pb-16">
                <PageHeader
                    title="Taken"
                    description="Plan, verdeel en volg taken per status, project of collega."
                    actions={
                        <>
                            <Button variant="secondary" icon="layers" onClick={() => setShowProjectModal(true)}>
                                Nieuw project
                            </Button>
                            <Button icon="plus" onClick={openNewTaskModal}>
                                Nieuwe taak
                            </Button>
                        </>
                    }
                />

                {notice ? (
                    <div
                        role={notice.tone === 'error' ? 'alert' : 'status'}
                        aria-live={notice.tone === 'error' ? 'assertive' : 'polite'}
                        className={cx(
                            'fixed bottom-[calc(1rem+var(--kivii-bottom-offset,0px))] left-4 right-4 z-[60] rounded-2xl border bg-white p-4 text-sm shadow-pop sm:left-auto sm:w-96',
                            notice.tone === 'error' ? 'border-rose-200' : 'border-emerald-200',
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <IconTile icon={notice.tone === 'error' ? 'alert-circle' : 'check-circle'} tone={notice.tone === 'error' ? 'danger' : 'success'} size="sm" />
                            <div className="min-w-0 flex-1 pt-1.5 text-zinc-800">{notice.text}</div>
                            <Button variant="ghost" size="xs" iconOnly icon="x" aria-label="Melding sluiten" onClick={() => setNotice(null)} />
                        </div>
                    </div>
                ) : null}

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-xl bg-zinc-200/50 p-1 ring-1 ring-inset ring-zinc-200/70" role="group" aria-label="Weergave">
                        {[
                            ['board', 'Bord', 'grid'],
                            ['list', 'Lijst', 'list'],
                            ['team', 'Team', 'users'],
                        ].map(([key, label, icon]) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={view === key}
                                className={cx(
                                    'tap-target inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                                    view === key ? 'bg-white text-zinc-900 shadow-card ring-1 ring-black/5' : 'text-zinc-600 hover:text-zinc-900',
                                )}
                                onClick={() => {
                                    setView(key);
                                    rememberMobileView(key);
                                }}
                            >
                                <Icon name={icon} className={cx('h-4 w-4', view === key ? 'text-indigo-600' : 'text-zinc-400')} />
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {view === 'board' ? (
                            <label htmlFor="tasks-filter-groepeer" className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-zinc-600">
                                Groepeer op
                                <select id="tasks-filter-groepeer" className={cx(inputClasses, 'w-auto py-1.5')} value={groupBoardBy} onChange={(e) => setGroupBoardBy(e.target.value)}>
                                    <option value="status">Status</option>
                                    <option value="project">Project</option>
                                </select>
                            </label>
                        ) : null}
                        {view === 'list' ? (
                            <label htmlFor="tasks-filter-sorteren" className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-zinc-600">
                                Sorteren op
                                <select id="tasks-filter-sorteren" className={cx(inputClasses, 'w-auto py-1.5')} value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                                    <option value="deadline">Deadline</option>
                                    <option value="prioriteit">Prioriteit</option>
                                    <option value="nieuwste">Nieuwste</option>
                                </select>
                            </label>
                        ) : null}
                    </div>
                </div>

                <div className="md:hidden">
                    <Button variant="secondary" className="w-full justify-between" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} aria-controls="tasks-filters">
                        <span className="inline-flex items-center gap-2">
                            <Icon name="filter" className="h-4 w-4 text-zinc-500" />
                            Zoeken en filters
                            {activeFilterCount > 0 && (
                                <span className="rounded-full bg-indigo-600 px-2 text-xs text-white">
                                    {activeFilterCount}
                                    <span className="sr-only"> actief</span>
                                </span>
                            )}
                        </span>
                        <Icon name={filtersOpen ? 'chevron-up' : 'chevron-down'} className="h-4 w-4 text-zinc-500" />
                    </Button>
                </div>

                <div id="tasks-filters" role="search" className={cx('card mt-3 p-4 md:mt-0 md:block', filtersOpen ? 'block' : 'hidden')}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <div className="sm:col-span-2">
                            <label htmlFor="tasks-filter-zoeken" className={FILTER_LABEL}>
                                Zoeken
                            </label>
                            <div className="relative mt-1">
                                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    id="tasks-filter-zoeken"
                                    type="search"
                                    className={cx(inputClasses, 'pl-9')}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Titel, omschrijving, label of klant"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="tasks-filter-klant" className={FILTER_LABEL}>
                                Klant
                            </label>
                            <CustomerPicker id="tasks-filter-klant" value={filterCustomer} onChange={setFilterCustomer} placeholder="Alle klanten" clearLabel="Wissen" />
                        </div>
                        <div>
                            <label htmlFor="tasks-filter-toegewezen-aan" className={FILTER_LABEL}>
                                Toegewezen aan
                            </label>
                            <select id="tasks-filter-toegewezen-aan" className={cx(inputClasses, 'mt-1')} value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
                                <option value="">Iedereen</option>
                                {currentUserId && users.some((u) => Number(u.id) === currentUserId) ? <option value={String(currentUserId)}>Mijn taken</option> : null}
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tasks-filter-status" className={FILTER_LABEL}>
                                Status
                            </label>
                            <select id="tasks-filter-status" className={cx(inputClasses, 'mt-1')} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="">Alle statussen</option>
                                {statusOptions.map((s) => (
                                    <option key={s} value={s}>
                                        {statusLabel(s)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tasks-filter-prioriteit" className={FILTER_LABEL}>
                                Prioriteit
                            </label>
                            <select id="tasks-filter-prioriteit" className={cx(inputClasses, 'mt-1')} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                                <option value="">Alle prioriteiten</option>
                                {priorityOptions.map((p) => (
                                    <option key={p} value={p}>
                                        {priorityMeta(p).label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-2">
                            <label htmlFor="tasks-filter-project" className={FILTER_LABEL}>
                                Project
                            </label>
                            <select id="tasks-filter-project" className={cx(inputClasses, 'mt-1')} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
                                <option value="">Alle projecten</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.naam}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-600">
                            <span className="inline-flex items-center gap-2 tabular-nums" aria-live="polite">
                                {loading ? <Spinner className="h-4 w-4 text-indigo-600" /> : <Icon name="check-square" className="h-4 w-4 text-zinc-400" />}
                                {loading ? 'Laden...' : countLabel(tasks.length, 'taak', 'taken')}
                            </span>
                            <label className="inline-flex items-center gap-2 font-medium text-zinc-700">
                                <input type="checkbox" className="checkbox" checked={showAppointments} onChange={(e) => setShowAppointments(e.target.checked)} />
                                Toon klantafspraken
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasActiveFilters ? (
                                <Button variant="ghost" size="sm" icon="x" onClick={resetFilters}>
                                    Filters wissen
                                </Button>
                            ) : null}
                            <Button variant="secondary" size="sm" icon="refresh" onClick={() => fetchTasks()} disabled={loading}>
                                Vernieuwen
                            </Button>
                        </div>
                    </div>
                </div>

                {filterCustomer ? (
                    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={filterCustomer.naam} size="md" />
                            <div className="min-w-0">
                                <div className="text-xs font-medium text-zinc-600">Taken van klant</div>
                                <a href={filterCustomer.url} className="block truncate font-semibold text-zinc-900 hover:text-indigo-700 focus-ring rounded">
                                    {filterCustomer.naam}
                                </a>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="ghost" size="sm" icon="x" onClick={() => setFilterCustomer(null)}>
                                Alle klanten
                            </Button>
                            <Button size="sm" icon="plus" onClick={openNewTaskModal}>
                                Nieuwe taak voor {filterCustomer.naam}
                            </Button>
                        </div>
                    </div>
                ) : null}

                {showAppointments ? (
                    <section className="card mt-6 overflow-hidden" aria-labelledby="tasks-klantafspraken-title">
                        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
                            <div className="flex min-w-0 items-center gap-3">
                                <IconTile icon="calendar" tone="info" size="sm" />
                                <div className="min-w-0">
                                    <h2 id="tasks-klantafspraken-title" className="section-heading">
                                        Klantafspraken
                                    </h2>
                                    <p className="text-sm text-zinc-500">Open taken en afspraken vanaf de klantpagina's.</p>
                                </div>
                            </div>
                            <Badge tone="info">{appointments.length}</Badge>
                        </div>
                        {appointments.length === 0 ? (
                            loading ? (
                                <div className="space-y-3 p-4" aria-hidden="true">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : (
                                <EmptyState bare compact icon="check-circle" title="Geen open klantafspraken" description="Alles is afgehandeld voor de huidige filters." />
                            )
                        ) : (
                            <ul className="divide-y divide-zinc-100 text-sm">
                                {appointments.map((a) => (
                                    <li key={a.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <IconTile icon={a.type === 'afspraak' ? 'calendar' : 'check-square'} tone={a.type === 'afspraak' ? 'info' : 'neutral'} size="sm" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-zinc-900">{a.titel || 'Zonder titel'}</span>
                                                    <span className="text-xs text-zinc-500">{a.type === 'afspraak' ? 'Afspraak' : 'Taak'}</span>
                                                </div>
                                                {a.inhoud ? <div className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{a.inhoud}</div> : null}
                                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                                                    {a.customer ? <CustomerChip customer={{ ...a.customer, url: `${a.customer.url}?tab=taken_afspraken` }} /> : null}
                                                    <DeadlineMeta deadline={a.due_at} overdue={Boolean(a.overdue)} emptyLabel="Geen datum" />
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            icon="check"
                                            className="self-start sm:self-center"
                                            loading={Boolean(appointmentBusy[a.id])}
                                            aria-label={`${a.titel || 'Klantafspraak'} afronden`}
                                            onClick={() => completeAppointment(a)}
                                        >
                                            Afronden
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                ) : null}

                {view === 'list' ? (
                    boardInitialLoading ? (
                        <div className="mt-6" aria-busy="true">
                            <span className="sr-only" role="status">
                                Taken laden...
                            </span>
                            <ListSkeleton />
                        </div>
                    ) : listRows.length === 0 ? (
                        <div className="mt-6">{emptyTasksState}</div>
                    ) : (
                        <div className={cx('mt-6 transition-opacity', loading && 'opacity-60')} aria-busy={loading || undefined}>
                            <ul className="space-y-2 md:hidden" aria-label="Taken">
                                {listRows.map((task) => (
                                    <li key={task.id}>
                                        <StaticTaskCard task={task} onOpen={openTask} />
                                    </li>
                                ))}
                            </ul>
                            <div className={cx(tableClasses.wrapper, 'hidden md:block')}>
                                <table className={tableClasses.table}>
                                    <thead className={tableClasses.thead}>
                                        <tr>
                                            <th scope="col" className={tableClasses.th}>
                                                Taak
                                            </th>
                                            <th scope="col" className={tableClasses.th}>
                                                Klant
                                            </th>
                                            <th scope="col" className={tableClasses.th}>
                                                Status
                                            </th>
                                            <th scope="col" className={tableClasses.th}>
                                                Deadline
                                            </th>
                                            <th scope="col" className={tableClasses.th}>
                                                Team
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className={tableClasses.tbody}>
                                        {listRows.map((task) => {
                                            const overdue = isOverdue(task);
                                            const meta = priorityMeta(task.prioriteit);
                                            return (
                                                <tr key={task.id} className={cx(tableClasses.tr, 'group/row', overdue && 'bg-rose-50/40')}>
                                                    <td className={cx(tableClasses.td, 'relative')}>
                                                        <span aria-hidden="true" className={cx('absolute inset-y-2 left-0 w-1 rounded-r-full', overdue ? 'bg-rose-500' : meta.edge)} />
                                                        <button
                                                            type="button"
                                                            className={cx(
                                                                'block max-w-xs truncate rounded text-left font-semibold hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                                                                task.status === 'afgerond' ? 'text-zinc-500 line-through decoration-zinc-300' : 'text-zinc-900',
                                                            )}
                                                            title={task.titel}
                                                            onClick={() => openTask(task.id)}
                                                        >
                                                            {task.titel}
                                                        </button>
                                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                                            <PriorityTag value={task.prioriteit} />
                                                            {task.project?.naam ? (
                                                                <span className="inline-flex min-w-0 items-center gap-1.5 text-zinc-500">
                                                                    <ProjectDot kleur={task.project.kleur} className="h-2 w-2" />
                                                                    <span className="max-w-[12rem] truncate">{task.project.naam}</span>
                                                                </span>
                                                            ) : null}
                                                            <CountMeta icon="message-square" count={task.counts?.comments} one="reactie" many="reacties" />
                                                            <CountMeta icon="file-text" count={task.counts?.attachments} one="bijlage" many="bijlagen" />
                                                        </div>
                                                    </td>
                                                    <td className={tableClasses.td}>{task.customer ? <CustomerChip customer={task.customer} /> : <span className="text-zinc-400">Geen klant</span>}</td>
                                                    <td className={tableClasses.td}>
                                                        <Badge tone={statusTone(task.status)} dot>
                                                            {statusLabel(task.status)}
                                                        </Badge>
                                                    </td>
                                                    <td className={cx(tableClasses.td, 'whitespace-nowrap text-xs')}>
                                                        <DeadlineMeta deadline={task.deadline} overdue={overdue} />
                                                    </td>
                                                    <td className={tableClasses.td}>
                                                        <div className="flex items-center gap-2">
                                                            <AvatarStack people={task.assignees} />
                                                            {task.assignees?.length === 1 ? <span className="max-w-[9rem] truncate text-xs text-zinc-600">{task.assignees[0].name}</span> : null}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ) : boardInitialLoading ? (
                    <div className="mt-6" aria-busy="true">
                        <span className="sr-only" role="status">
                            Taken laden...
                        </span>
                        <BoardSkeleton columns={Math.min(Math.max(columns.length, 3), 4)} />
                    </div>
                ) : (
                    <div className={cx('mt-6', loading && 'opacity-70 transition-opacity')} aria-busy={loading || undefined}>
                        {tasks.length === 0 && !loading ? <div className="mb-4">{emptyTasksState}</div> : null}
                        <p className="mb-3 flex items-start gap-1.5 text-xs text-zinc-500">
                            <Icon name="info" className="mt-px h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            <span>
                                Sleep kaarten om de volgorde of {view === 'team' ? 'de toegewezen persoon' : group === 'project' ? 'het project' : 'de status'} te wijzigen. Open een kaart om dit met het toetsenbord te doen.
                                {!boardScroll.end || !boardScroll.start ? ' Scroll horizontaal voor meer kolommen.' : ''}
                            </span>
                        </p>
                        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
                            <div className="relative">
                                <div
                                    ref={boardScrollRef}
                                    onScroll={updateBoardScroll}
                                    className={cx(
                                        '-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pb-4 sm:mx-0 sm:snap-none sm:scroll-px-0 sm:px-0',
                                        boardFits && 'xl:grid xl:overflow-x-visible',
                                        boardFits && BOARD_GRID_COLS[columns.length],
                                    )}
                                    role="list"
                                    aria-label="Kolommen"
                                >
                                    {columns.map((col) => {
                                        const taskIds = itemsByColumn[col.id] ?? [];
                                        const quickValue = quickAdd[col.id] ?? '';
                                        const quickBusy = Boolean(quickAddSaving[col.id]);
                                        const overdueCount = taskIds.filter((key) => isOverdue(taskById[parseId(key)])).length;
                                        return (
                                            <div key={col.id} className="shrink-0 snap-start" role="listitem">
                                                <Column
                                                    fit={boardFits}
                                                    droppableId={col.id}
                                                    title={col.title}
                                                    subtitle={col.subtitle}
                                                    alert={overdueCount > 0 ? `${overdueCount} te laat` : null}
                                                    lead={columnLead(col, group, projects)}
                                                    count={taskIds.length}
                                                    footer={
                                                        <form
                                                            className="flex items-center gap-2"
                                                            onSubmit={(e) => {
                                                                e.preventDefault();
                                                                quickCreateTask({ column: col, title: quickValue });
                                                            }}
                                                        >
                                                            <input
                                                                className={cx(inputClasses, 'h-9 bg-white/80 py-1.5 shadow-none')}
                                                                placeholder="Snel een taak toevoegen"
                                                                aria-label={`Taak toevoegen aan ${col.title}`}
                                                                readOnly={quickBusy}
                                                                maxLength={255}
                                                                value={quickValue}
                                                                onChange={(e) => setQuickAdd((prev) => ({ ...prev, [col.id]: e.target.value }))}
                                                            />
                                                            <Button
                                                                type="submit"
                                                                variant="secondary"
                                                                iconOnly
                                                                icon="plus"
                                                                className="shrink-0"
                                                                aria-label={`Taak toevoegen aan ${col.title}`}
                                                                loading={quickBusy}
                                                                disabled={!quickValue.trim()}
                                                            />
                                                        </form>
                                                    }
                                                >
                                                    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                                                        {taskIds.length === 0 ? (
                                                            <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-xs text-zinc-500">
                                                                <Icon name="inbox" className="h-5 w-5 text-zinc-400" />
                                                                Sleep een taak hierheen
                                                            </div>
                                                        ) : null}
                                                        {taskIds.map((taskKey) => {
                                                            const tid = parseId(taskKey);
                                                            const task = tid ? taskById[tid] : null;
                                                            if (!task) return null;
                                                            return <SortableTaskCard key={taskKey} task={task} onOpen={openTask} />;
                                                        })}
                                                    </SortableContext>
                                                </Column>
                                            </div>
                                        );
                                    })}
                                </div>
                                {!boardScroll.start ? <div aria-hidden="true" className={cx('pointer-events-none absolute inset-y-0 bottom-4 left-0 w-8 bg-gradient-to-r from-[#f5f6f1] to-transparent', boardFits && 'xl:hidden')} /> : null}
                                {!boardScroll.end ? <div aria-hidden="true" className={cx('pointer-events-none absolute inset-y-0 bottom-4 right-0 w-10 bg-gradient-to-l from-[#f5f6f1] to-transparent', boardFits && 'xl:hidden')} /> : null}
                            </div>
                            <DragOverlay>{activeDragTask ? <TaskOverlay task={activeDragTask} /> : null}</DragOverlay>
                        </DndContext>
                    </div>
                )}
            </div>

            {showProjectModal ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-[2px]"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeProjectModal();
                    }}
                >
                    <div ref={projectDialogRef} role="dialog" aria-modal="true" aria-labelledby="project-modal-title" tabIndex={-1} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-pop sm:p-6">
                        <ModalHeader id="project-modal-title" icon="layers" title="Nieuw project" description="Een project wordt een eigen kolom op je bord." onClose={closeProjectModal} />
                        <form className="mt-6 space-y-4" onSubmit={createProject}>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-project-naam" className="label">
                                        Naam
                                        <span className="ml-0.5 text-rose-600" aria-hidden="true">
                                            *
                                        </span>
                                    </label>
                                    <input
                                        id="tasks-project-naam"
                                        data-autofocus
                                        required
                                        maxLength={255}
                                        aria-invalid={projectErrors.naam ? true : undefined}
                                        className={cx(inputClasses, 'mt-1.5')}
                                        value={projectForm.naam}
                                        onChange={(e) => setProjectForm((p) => ({ ...p, naam: e.target.value }))}
                                    />
                                    {projectErrors.naam ? (
                                        <div className="field-error" role="alert">
                                            {projectErrors.naam?.[0]}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-project-omschrijving" className="label">
                                        Omschrijving
                                    </label>
                                    <textarea id="tasks-project-omschrijving" className={cx(inputClasses, 'mt-1.5')} rows={3} value={projectForm.omschrijving} onChange={(e) => setProjectForm((p) => ({ ...p, omschrijving: e.target.value }))} />
                                </div>
                                <div>
                                    <label htmlFor="tasks-project-deadline" className="label">
                                        Deadline
                                    </label>
                                    <input id="tasks-project-deadline" type="datetime-local" className={cx(inputClasses, 'mt-1.5')} value={projectForm.deadline} onChange={(e) => setProjectForm((p) => ({ ...p, deadline: e.target.value }))} />
                                </div>
                                <div>
                                    <label htmlFor="tasks-project-kleur-optioneel" className="label">
                                        Kleur (optioneel)
                                    </label>
                                    <div className="relative mt-1.5">
                                        <ProjectDot kleur={projectForm.kleur} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input id="tasks-project-kleur-optioneel" className={cx(inputClasses, 'pl-8')} placeholder="#aabbcc" value={projectForm.kleur} onChange={(e) => setProjectForm((p) => ({ ...p, kleur: e.target.value }))} />
                                    </div>
                                </div>
                            </div>
                            <ErrorList errors={projectErrors} exclude={['naam']} />
                            <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
                                <Button variant="secondary" type="button" onClick={closeProjectModal}>
                                    Annuleren
                                </Button>
                                <Button type="submit" icon="plus" loading={projectSaving}>
                                    {projectSaving ? 'Opslaan...' : 'Project toevoegen'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
            {showTaskModal ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-[2px]"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeTaskModal();
                    }}
                >
                    <div ref={taskDialogRef} role="dialog" aria-modal="true" aria-labelledby="task-modal-title" tabIndex={-1} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-pop sm:p-6">
                        <ModalHeader
                            id="task-modal-title"
                            icon="check-square"
                            title="Nieuwe taak"
                            description={taskForm.customer ? `Voor ${taskForm.customer.naam}. Wijs collega's toe en zet een deadline.` : 'Maak een taak aan, wijs collega\'s toe en koppel eventueel een klant.'}
                            onClose={closeTaskModal}
                        />
                        <form className="mt-6 space-y-4" onSubmit={createTask}>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-task-titel" className="label">
                                        Titel
                                        <span className="ml-0.5 text-rose-600" aria-hidden="true">
                                            *
                                        </span>
                                    </label>
                                    <input
                                        id="tasks-task-titel"
                                        data-autofocus
                                        required
                                        maxLength={255}
                                        aria-invalid={taskErrors.titel ? true : undefined}
                                        className={cx(inputClasses, 'mt-1.5')}
                                        value={taskForm.titel}
                                        onChange={(e) => setTaskForm((t) => ({ ...t, titel: e.target.value }))}
                                    />
                                    {taskErrors.titel ? (
                                        <div className="field-error" role="alert">
                                            {taskErrors.titel?.[0]}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-task-omschrijving" className="label">
                                        Omschrijving
                                    </label>
                                    <textarea id="tasks-task-omschrijving" className={cx(inputClasses, 'mt-1.5')} rows={3} value={taskForm.omschrijving} onChange={(e) => setTaskForm((t) => ({ ...t, omschrijving: e.target.value }))} />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-task-klant" className="label">
                                        Klant
                                    </label>
                                    <CustomerPicker id="tasks-task-klant" value={taskForm.customer} onChange={(customer) => setTaskForm((t) => ({ ...t, customer }))} />
                                </div>
                                <div>
                                    <label htmlFor="tasks-task-project" className="label">
                                        Project
                                    </label>
                                    <select id="tasks-task-project" className={cx(inputClasses, 'mt-1.5')} value={taskForm.task_project_id} onChange={(e) => setTaskForm((t) => ({ ...t, task_project_id: e.target.value }))}>
                                        <option value="">Geen</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.naam}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="tasks-task-status" className="label">
                                        Status
                                    </label>
                                    <select id="tasks-task-status" className={cx(inputClasses, 'mt-1.5')} value={taskForm.status} onChange={(e) => setTaskForm((t) => ({ ...t, status: e.target.value }))}>
                                        {statusOptions.map((s) => (
                                            <option key={s} value={s}>
                                                {statusLabel(s)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="tasks-task-prioriteit" className="label">
                                        Prioriteit
                                    </label>
                                    <select id="tasks-task-prioriteit" className={cx(inputClasses, 'mt-1.5')} value={taskForm.prioriteit} onChange={(e) => setTaskForm((t) => ({ ...t, prioriteit: e.target.value }))}>
                                        {priorityOptions.map((p) => (
                                            <option key={p} value={p}>
                                                {priorityMeta(p).label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="tasks-task-deadline" className="label">
                                        Deadline
                                    </label>
                                    <input id="tasks-task-deadline" type="datetime-local" className={cx(inputClasses, 'mt-1.5')} value={taskForm.deadline} onChange={(e) => setTaskForm((t) => ({ ...t, deadline: e.target.value }))} />
                                    <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label="Snelle deadline">
                                        {[
                                            ['vandaag', 'Vandaag'],
                                            ['morgen', 'Morgen'],
                                            ['week', 'Volgende week'],
                                        ].map(([kind, label]) => (
                                            <button
                                                key={kind}
                                                type="button"
                                                className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                                onClick={() => setTaskForm((t) => ({ ...t, deadline: shortcutDate(kind) }))}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-task-labels" className="label">
                                        Labels
                                    </label>
                                    <input id="tasks-task-labels" className={cx(inputClasses, 'mt-1.5')} placeholder="bijv. lead, demo, urgent" value={taskForm.labels} onChange={(e) => setTaskForm((t) => ({ ...t, labels: e.target.value }))} />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-task-toegewezen-aan" className="label">
                                        Toegewezen aan
                                    </label>
                                    <MultiSelectChips id="tasks-task-toegewezen-aan" options={users} value={taskForm.assignees} placeholder="Zoek een collega..." onChange={(ids) => setTaskForm((t) => ({ ...t, assignees: ids }))} />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-task-bijlagen" className="label">
                                        Bijlagen
                                    </label>
                                    <FilePicker
                                        id="tasks-task-bijlagen"
                                        className="mt-1.5"
                                        files={taskFiles}
                                        multiple
                                        accept={ATTACHMENT_ACCEPT}
                                        onChange={(e) => {
                                            const picked = Array.from(e.target.files ?? []);
                                            // Leegmaken, zodat hetzelfde bestand opnieuw gekozen kan worden.
                                            e.target.value = '';
                                            setTaskFiles((prev) => [...prev, ...picked]);
                                        }}
                                    />
                                    <div className="field-hint">{ATTACHMENT_HINT}</div>
                                    {taskFiles.length > 0 ? (
                                        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Gekozen bestanden">
                                            {taskFiles.map((file, idx) => {
                                                const kind = fileKind(file.name, file.type);
                                                return (
                                                    <li key={`${file.name}-${idx}`} className="flex max-w-full items-center gap-2 rounded-xl border border-hairline bg-zinc-50/60 py-1.5 pl-1.5 pr-1 text-sm">
                                                        <IconTile icon="file-text" tone={kind.tone} size="sm" className="h-7 w-7" />
                                                        <span className="min-w-0 truncate text-zinc-800">{file.name}</span>
                                                        {formatFileSize(file.size) ? <span className="shrink-0 text-xs text-zinc-500">{formatFileSize(file.size)}</span> : null}
                                                        <Button variant="ghost" size="xs" iconOnly icon="x" aria-label={`${file.name} verwijderen`} onClick={() => setTaskFiles((prev) => prev.filter((_, i) => i !== idx))} />
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : null}
                                </div>
                            </div>
                            <ErrorList errors={taskErrors} exclude={['titel']} />
                            <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
                                <Button variant="secondary" type="button" onClick={closeTaskModal}>
                                    Annuleren
                                </Button>
                                <Button type="submit" icon="plus" loading={taskSaving}>
                                    {taskSaving ? 'Opslaan...' : 'Taak toevoegen'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
            {selectedTaskId ? (
                <div
                    className="fixed inset-0 z-50 flex justify-end bg-zinc-900/40 backdrop-blur-[2px]"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeTask();
                    }}
                >
                    <div ref={detailDialogRef} role="dialog" aria-modal="true" aria-labelledby="task-detail-title" tabIndex={-1} className="h-full w-full max-w-xl overflow-y-auto overscroll-contain bg-white shadow-pop sm:rounded-l-2xl">
                        <div className="sticky top-0 z-20 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex min-h-[1.375rem] flex-wrap items-center gap-2">
                                        {selectedTask ? (
                                            <>
                                                <Badge tone={statusTone(selectedTask.status)} dot>
                                                    {statusLabel(selectedTask.status)}
                                                </Badge>
                                                <PriorityTag value={selectedTask.prioriteit} />
                                                {isOverdue(selectedTask) ? <OverdueBadge /> : null}
                                            </>
                                        ) : (
                                            <Skeleton className="h-5 w-32 rounded-full" />
                                        )}
                                    </div>
                                    <h2 id="task-detail-title" className="mt-2 line-clamp-2 text-lg font-semibold leading-6 text-zinc-900">
                                        {selectedTask?.titel?.trim() || 'Taak'}
                                    </h2>
                                    {selectedTask ? (
                                        <p className="mt-1 inline-flex min-w-0 items-center gap-1.5 text-sm text-zinc-500">
                                            <ProjectDot kleur={selectedTask.project?.kleur} className="h-2 w-2" />
                                            <span className="truncate">{selectedTask.project?.naam ?? 'Geen project'}</span>
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    {selectedTask && selectedTask.status !== 'afgerond' ? (
                                        <Button variant="secondary" size="sm" icon="check" onClick={completeSelectedTask} disabled={detailSaving}>
                                            Afronden
                                        </Button>
                                    ) : null}
                                    <Button variant="ghost" size="sm" iconOnly icon="x" onClick={closeTask} aria-label="Taakdetails sluiten" />
                                </div>
                            </div>
                        </div>
                        {detailLoading ? (
                            <div className="space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
                                <span className="sr-only" role="status">
                                    Taak laden...
                                </span>
                                <Skeleton className="h-20 w-full rounded-2xl" />
                                <Skeleton lines={3} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="h-10" />
                                    <Skeleton className="h-10" />
                                    <Skeleton className="h-10" />
                                    <Skeleton className="h-10" />
                                </div>
                            </div>
                        ) : !selectedTask ? (
                            <div className="p-6">
                                <EmptyState
                                    icon="alert-circle"
                                    title="Taak niet gevonden"
                                    description="Deze taak bestaat niet (meer) of kon niet worden geladen."
                                    action={
                                        <Button variant="secondary" icon="refresh" onClick={() => loadTask(selectedTaskId)}>
                                            Opnieuw proberen
                                        </Button>
                                    }
                                />
                            </div>
                        ) : (
                            <div className="space-y-6 px-4 py-6 sm:px-6">
                                {selectedTask.customer ? <CustomerMiniCard customer={selectedTask.customer} info={customerInfo} /> : null}

                                <form className="space-y-5" onSubmit={saveTaskDetails}>
                                    <div>
                                        <label htmlFor="tasks-detail-titel" className="label">
                                            Titel
                                            <span className="ml-0.5 text-rose-600" aria-hidden="true">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            id="tasks-detail-titel"
                                            maxLength={255}
                                            aria-invalid={detailErrors.titel ? true : undefined}
                                            className={cx(inputClasses, 'mt-1.5')}
                                            value={selectedTask.titel ?? ''}
                                            onChange={(e) => setSelectedTask((t) => ({ ...t, titel: e.target.value }))}
                                            required
                                        />
                                        {detailErrors.titel ? (
                                            <div className="field-error" role="alert">
                                                {detailErrors.titel?.[0]}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div>
                                        <label htmlFor="tasks-detail-omschrijving" className="label">
                                            Omschrijving
                                        </label>
                                        <textarea id="tasks-detail-omschrijving" className={cx(inputClasses, 'mt-1.5')} rows={4} value={selectedTask.omschrijving ?? ''} onChange={(e) => setSelectedTask((t) => ({ ...t, omschrijving: e.target.value }))} />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="tasks-detail-status" className="label">
                                                Status
                                            </label>
                                            <select id="tasks-detail-status" className={cx(inputClasses, 'mt-1.5')} value={selectedTask.status ?? 'open'} onChange={(e) => setSelectedTask((t) => ({ ...t, status: e.target.value }))}>
                                                {statusOptions.map((s) => (
                                                    <option key={s} value={s}>
                                                        {statusLabel(s)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="tasks-detail-prioriteit" className="label">
                                                Prioriteit
                                            </label>
                                            <select id="tasks-detail-prioriteit" className={cx(inputClasses, 'mt-1.5')} value={selectedTask.prioriteit ?? 'normaal'} onChange={(e) => setSelectedTask((t) => ({ ...t, prioriteit: e.target.value }))}>
                                                {priorityOptions.map((p) => (
                                                    <option key={p} value={p}>
                                                        {priorityMeta(p).label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="tasks-detail-project" className="label">
                                                Project
                                            </label>
                                            <select
                                                id="tasks-detail-project"
                                                className={cx(inputClasses, 'mt-1.5')}
                                                value={selectedTask.task_project_id ?? ''}
                                                onChange={(e) => setSelectedTask((t) => ({ ...t, task_project_id: e.target.value ? Number(e.target.value) : null }))}
                                            >
                                                <option value="">Geen</option>
                                                {projects.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.naam}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="tasks-detail-deadline" className="label flex items-center gap-2">
                                                Deadline {isOverdue(selectedTask) ? <OverdueBadge /> : null}
                                            </label>
                                            <input
                                                id="tasks-detail-deadline"
                                                type="datetime-local"
                                                className={cx(inputClasses, 'mt-1.5')}
                                                value={toLocalInputValue(selectedTask.deadline)}
                                                aria-invalid={isOverdue(selectedTask) || undefined}
                                                onChange={(e) => setSelectedTask((t) => ({ ...t, deadline: e.target.value || null }))}
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label htmlFor="tasks-detail-klant" className="label">
                                                Klant
                                            </label>
                                            <CustomerPicker id="tasks-detail-klant" value={selectedTask.customer ?? null} onChange={(customer) => setSelectedTask((t) => ({ ...t, customer, garage_company_id: customer?.id ?? null }))} />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label htmlFor="tasks-detail-toegewezen-aan" className="label">
                                                Toegewezen aan
                                            </label>
                                            <MultiSelectChips
                                                id="tasks-detail-toegewezen-aan"
                                                options={users}
                                                value={(selectedTask.assignees ?? []).map((a) => Number(a.id))}
                                                placeholder="Zoek een collega..."
                                                onChange={(ids) => {
                                                    const mapped = ids
                                                        .map((sid) => users.find((u) => Number(u.id) === sid))
                                                        .filter(Boolean)
                                                        .map((u) => ({ id: u.id, name: u.name }));
                                                    setSelectedTask((t) => ({ ...t, assignees: mapped }));
                                                }}
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label htmlFor="tasks-detail-labels" className="label">
                                                Labels
                                            </label>
                                            <input id="tasks-detail-labels" className={cx(inputClasses, 'mt-1.5')} placeholder="bijv. lead, demo, urgent" value={selectedTask.labels ?? ''} onChange={(e) => setSelectedTask((t) => ({ ...t, labels: e.target.value }))} />
                                        </div>
                                    </div>

                                    <ErrorList errors={detailErrors} exclude={['titel']} />
                                    <div className={cx('flex flex-col-reverse gap-3 rounded-2xl p-3 transition-colors sm:flex-row sm:items-center sm:justify-between', detailDirty ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : 'bg-zinc-50')}>
                                        <span className={cx('inline-flex items-center gap-2 text-sm', detailDirty ? 'font-medium text-amber-900' : 'text-zinc-500')} aria-live="polite">
                                            <Icon name={detailDirty ? 'alert-circle' : 'check-circle'} className={cx('h-4 w-4', detailDirty ? 'text-amber-600' : 'text-emerald-600')} />
                                            {detailDirty ? 'Niet opgeslagen wijzigingen' : 'Alles is opgeslagen'}
                                        </span>
                                        <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                            <Button variant="secondary" type="button" onClick={closeTask}>
                                                Sluiten
                                            </Button>
                                            <Button type="submit" icon="check" loading={detailSaving} disabled={!detailDirty && !detailSaving}>
                                                {detailSaving ? 'Opslaan...' : 'Opslaan'}
                                            </Button>
                                        </div>
                                    </div>
                                </form>

                                <DrawerSection id="task-detail-reacties" icon="message-square" title="Reacties" count={selectedTask.comments?.length}>
                                    {selectedTask.comments?.length ? (
                                        <ul className="space-y-4">
                                            {selectedTask.comments.map((c) => {
                                                const mine = currentUserId && Number(c.author?.id) === currentUserId;
                                                const name = c.author?.name ?? 'Onbekend';
                                                return (
                                                    <li key={c.id} className={cx('flex items-start gap-2.5', mine && 'flex-row-reverse')}>
                                                        <Avatar name={name} size="sm" />
                                                        <div className={cx('flex min-w-0 max-w-[85%] flex-col', mine ? 'items-end' : 'items-start')}>
                                                            <div className="flex items-baseline gap-2 text-xs">
                                                                <span className="font-semibold text-zinc-800">{mine ? 'Jij' : name}</span>
                                                                <time dateTime={c.created_at ?? undefined} title={formatDateTime(c.created_at) ?? undefined} className="text-zinc-400">
                                                                    {relativeTime(c.created_at)}
                                                                </time>
                                                            </div>
                                                            <div className={cx('mt-1 whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-6', mine ? 'rounded-tr-md bg-indigo-100/70 text-zinc-900' : 'rounded-tl-md bg-zinc-100 text-zinc-800')}>{c.body}</div>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">Nog geen reacties. Stel een vraag of geef een update; tag een collega met @naam.</p>
                                    )}
                                    <form className="mt-4 flex items-start gap-2.5" onSubmit={addComment}>
                                        <Avatar name={currentUserName || 'Jij'} size="sm" className="mt-1" />
                                        <div className="min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-white shadow-sm transition-colors focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                                            <textarea
                                                className="block w-full resize-none rounded-t-2xl border-0 bg-transparent px-3.5 pt-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:ring-0"
                                                rows={2}
                                                aria-label="Reactie"
                                                maxLength={5000}
                                                value={commentBody}
                                                onChange={(e) => setCommentBody(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                        e.preventDefault();
                                                        e.currentTarget.form?.requestSubmit();
                                                    }
                                                }}
                                                placeholder="Schrijf een reactie en tag met @naam"
                                            />
                                            <div className="flex items-center justify-between gap-2 px-2 pb-2">
                                                <span className="pl-1.5 text-2xs text-zinc-400">Ctrl + Enter om te plaatsen</span>
                                                <Button type="submit" size="sm" loading={commentSaving} disabled={!commentBody.trim()}>
                                                    {commentSaving ? 'Plaatsen...' : 'Plaatsen'}
                                                </Button>
                                            </div>
                                        </div>
                                    </form>
                                </DrawerSection>

                                <DrawerSection
                                    id="task-detail-bijlagen"
                                    icon="file-text"
                                    title="Bijlagen"
                                    count={selectedTask.attachments?.length}
                                    actions={
                                        <label className={cx(buttonClasses({ variant: 'secondary', size: 'sm' }), 'focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2', attachmentUploading ? 'cursor-wait opacity-60' : 'cursor-pointer')}>
                                            <input
                                                type="file"
                                                className="sr-only"
                                                multiple
                                                accept={ATTACHMENT_ACCEPT}
                                                disabled={attachmentUploading}
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files ?? []);
                                                    e.target.value = '';
                                                    uploadAttachments(files);
                                                }}
                                            />
                                            {attachmentUploading ? <Spinner className="h-4 w-4" /> : <Icon name="upload" className="h-4 w-4 text-zinc-500" />}
                                            {attachmentUploading ? 'Uploaden...' : 'Bestand uploaden'}
                                        </label>
                                    }
                                >
                                    {selectedTask.attachments?.length ? (
                                        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {selectedTask.attachments.map((file) => {
                                                const kind = fileKind(file.original_name, file.mime);
                                                return (
                                                    <li key={file.id} className="min-w-0">
                                                        <a
                                                            href={file.url}
                                                            download
                                                            aria-label={`${file.original_name} downloaden`}
                                                            className="group flex min-w-0 items-center gap-3 rounded-xl border border-hairline bg-white p-2.5 transition-[box-shadow,border-color] hover:border-zinc-300 hover:shadow-card-hover focus-ring"
                                                        >
                                                            <IconTile icon="file-text" tone={kind.tone} size="sm" />
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block truncate text-sm font-medium text-zinc-900">{file.original_name}</span>
                                                                <span className="block text-xs text-zinc-500">{[kind.label, formatFileSize(file.size)].filter(Boolean).join(', ')}</span>
                                                            </span>
                                                            <Icon name="download" className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-indigo-700" />
                                                        </a>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-5 text-center text-sm text-zinc-500">Nog geen bijlagen. Upload offertes, foto's of andere documenten bij deze taak.</p>
                                    )}
                                    <p className="field-hint">{ATTACHMENT_HINT}</p>
                                </DrawerSection>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </>
    );
}
