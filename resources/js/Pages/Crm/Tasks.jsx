import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Head } from '@inertiajs/react';
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDialog } from '../../components/useDialog';

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

function priorityMeta(value) {
    switch (value) {
        case 'kritiek':
            return { label: 'Kritiek', className: 'bg-rose-600 text-white' };
        case 'hoog':
            return { label: 'Hoog', className: 'bg-amber-500 text-white' };
        case 'laag':
            return { label: 'Laag', className: 'bg-zinc-200 text-zinc-800' };
        default:
            return { label: 'Normaal', className: 'bg-indigo-50 text-indigo-700' };
    }
}

function initials(name) {
    return String(name || '')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((part) => part.slice(0, 1))
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function cx(...parts) {
    return parts.filter(Boolean).join(' ');
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

function Button({ tone = 'primary', className = '', ...props }) {
    const base =
        'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60';
    const tones = {
        primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
        secondary: 'bg-white text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50',
        ghost: 'bg-transparent text-zinc-700 hover:bg-zinc-100',
        danger: 'bg-rose-600 text-white hover:bg-rose-500',
    };
    return <button type="button" className={cx(base, tones[tone], className)} {...props} />;
}

function Pill({ children, className = '' }) {
    return (
        <span className={cx('inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700', className)}>
            {children}
        </span>
    );
}

function SortableTaskCard({ task, onOpen }) {
    const id = `task-${task.id}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cx('cursor-grab rounded-xl border bg-white p-3 shadow-sm', isDragging ? 'opacity-60' : 'opacity-100')}
            aria-roledescription={attributes['aria-roledescription']}
            {...listeners}
        >
            {/* Alleen de knop is focusbaar; de kaart zelf is geen extra tab-stop. */}
            <button type="button" className="w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400" onClick={() => onOpen(task.id)} title={task.titel}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-900">{task.titel}</div>
                        {task.project?.naam ? <div className="mt-1 truncate text-xs text-zinc-500">{task.project.naam}</div> : null}
                    </div>
                    <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', priorityMeta(task.prioriteit).className)}>
                        {priorityMeta(task.prioriteit).label}
                    </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {task.deadline ? <Pill>{formatDateTime(task.deadline)}</Pill> : <Pill className="text-zinc-400">Geen deadline</Pill>}
                        {task.counts?.comments ? <Pill>{task.counts.comments} reacties</Pill> : null}
                        {task.counts?.attachments ? <Pill>{task.counts.attachments} bijlagen</Pill> : null}
                    </div>
                    <div className="flex items-center gap-1">
                        {task.assignees?.slice(0, 2).map((a) => (
                            <span
                                key={a.id}
                                className="grid h-7 w-7 place-items-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700"
                                title={a.name}
                            >
                                {initials(a.name) || '--'}
                            </span>
                        ))}
                        {task.assignees?.length > 2 ? (
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700" title="Meer">
                                +{task.assignees.length - 2}
                            </span>
                        ) : null}
                    </div>
                </div>
            </button>
        </div>
    );
}

function Column({ title, subtitle, count, children, footer }) {
    return (
        <div className="flex w-[min(340px,85vw)] flex-col rounded-2xl border border-zinc-200 bg-zinc-50/60">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-900">{title}</div>
                    {subtitle ? <div className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</div> : null}
                </div>
                <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700">{count}</span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">{children}</div>
            {footer ? <div className="border-t border-zinc-200 px-4 py-3">{footer}</div> : null}
        </div>
    );
}

function TaskOverlay({ task }) {
    if (!task) return null;
    return (
        <div className="w-[min(330px,80vw)] rounded-xl border bg-white p-3 shadow-lg">
            <div className="truncate text-sm font-semibold text-zinc-900">{task.titel}</div>
            <div className="mt-2 flex items-center justify-between">
                <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', priorityMeta(task.prioriteit).className)}>
                    {priorityMeta(task.prioriteit).label}
                </span>
                {task.deadline ? <Pill>{formatDateTime(task.deadline)}</Pill> : <Pill className="text-zinc-400">Geen deadline</Pill>}
            </div>
        </div>
    );
}

function buildColumnSpecs({ view, groupBoardBy, projects, users, statusOptions }) {
    const columns = [];
    const group = view === 'team' ? 'assignee' : groupBoardBy;

    if (group === 'project') {
        columns.push({ id: 'col-project-inbox', title: 'Inbox', subtitle: 'Geen project', projectId: null });
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
        users.forEach((u) => columns.push({ id: `col-assignee-${u.id}`, title: u.name, subtitle: null, assigneeId: u.id }));
    }

    return { group, columns };
}

function taskPrimaryAssigneeId(task) {
    const first = task.assignees?.[0]?.id;
    return first ?? null;
}

function columnIdForTask(task, group) {
    if (group === 'project') return task.task_project_id ? `col-project-${task.task_project_id}` : 'col-project-inbox';
    if (group === 'status') return `col-status-${task.status}`;
    const assigneeId = taskPrimaryAssigneeId(task);
    return assigneeId ? `col-assignee-${assigneeId}` : 'col-assignee-unassigned';
}

function buildItemsByColumn(tasks, columns, group) {
    const base = Object.fromEntries(columns.map((c) => [c.id, []]));

    tasks.forEach((task) => {
        const colId = columnIdForTask(task, group);
        if (!base[colId]) base[colId] = [];
        base[colId].push(`task-${task.id}`);
    });

    Object.keys(base).forEach((key) => {
        base[key] = base[key]
            .map((id) => ({ id, taskId: parseId(id) }))
            .filter((row) => row.taskId)
            .sort((a, b) => {
                const ta = tasks.find((t) => t.id === a.taskId);
                const tb = tasks.find((t) => t.id === b.taskId);
                const oa = ta?.sort_order ?? 0;
                const ob = tb?.sort_order ?? 0;
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

export default function Tasks({ initial, filters, urls }) {
    const [tasks, setTasks] = useState(initial?.tasks ?? []);
    const [projects, setProjects] = useState(initial?.projects ?? []);
    const [users, setUsers] = useState(initial?.users ?? []);
    const [statusOptions, setStatusOptions] = useState(initial?.statusOptions ?? []);
    const [priorityOptions, setPriorityOptions] = useState(initial?.priorityOptions ?? []);

    const [view, setView] = useState('board'); // board | list | team
    const [groupBoardBy, setGroupBoardBy] = useState('project'); // project | status
    const [sortMode, setSortMode] = useState(filters?.sort ?? 'deadline');
    const [filterProject, setFilterProject] = useState(filters?.project ?? '');
    const [filterAssignee, setFilterAssignee] = useState(filters?.assignee ?? '');
    const [filterStatus, setFilterStatus] = useState(filters?.status ?? '');
    const [filterPriority, setFilterPriority] = useState(filters?.priority ?? '');
    const [search, setSearch] = useState(filters?.search ?? '');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState(null);

    const [showProjectModal, setShowProjectModal] = useState(false);
    const [projectForm, setProjectForm] = useState({ naam: '', omschrijving: '', deadline: '', kleur: '' });
    const [projectErrors, setProjectErrors] = useState({});
    const [projectSaving, setProjectSaving] = useState(false);

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskForm, setTaskForm] = useState({
        titel: '',
        omschrijving: '',
        task_project_id: '',
        status: 'open',
        prioriteit: 'normaal',
        deadline: '',
        labels: '',
        assignees: [],
    });
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
                    priority: filterPriority || undefined,
                    search: search || undefined,
                    sort: sortMode || undefined,
                },
            });
            // Negeer verouderde antwoorden als de filters intussen zijn gewijzigd.
            if (seq !== fetchSeqRef.current) return;
            setTasks(response.data.tasks ?? []);
            setProjects(response.data.projects ?? []);
            setUsers(response.data.users ?? []);
            setStatusOptions(response.data.statusOptions ?? []);
            setPriorityOptions(response.data.priorityOptions ?? []);
        } catch {
            if (seq !== fetchSeqRef.current) return;
            setNotice({ tone: 'error', text: 'Taken laden mislukt. Probeer opnieuw.' });
        } finally {
            if (seq === fetchSeqRef.current) setLoading(false);
        }
    }, [filterProject, filterAssignee, filterStatus, filterPriority, search, sortMode]);

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

    const { group, columns } = useMemo(
        () => buildColumnSpecs({ view, groupBoardBy, projects, users, statusOptions }),
        [view, groupBoardBy, projects, users, statusOptions],
    );

    const [itemsByColumn, setItemsByColumn] = useState(() => buildItemsByColumn(tasks, columns, group));
    const [activeDragId, setActiveDragId] = useState(null);

    useEffect(() => {
        setItemsByColumn(buildItemsByColumn(tasks, columns, group));
    }, [tasks, columns, group]);

    const activeDragTask = useMemo(() => {
        const tid = parseId(activeDragId);
        return tid ? taskById[tid] : null;
    }, [activeDragId, taskById]);

    const openTaskSeqRef = useRef(0);
    const openTask = useCallback(async (taskId) => {
        const seq = ++openTaskSeqRef.current;
        setSelectedTaskId(taskId);
        setSelectedTask(null);
        setDetailErrors({});
        setCommentBody('');
        setDetailLoading(true);
        try {
            const response = await axios.get(`/taken/${taskId}`);
            if (seq !== openTaskSeqRef.current) return;
            setSelectedTask(response.data.task ?? null);
        } catch {
            if (seq !== openTaskSeqRef.current) return;
            setNotice({ tone: 'error', text: 'Taak laden mislukt.' });
        } finally {
            if (seq === openTaskSeqRef.current) setDetailLoading(false);
        }
    }, []);

    const closeTask = useCallback(() => {
        openTaskSeqRef.current += 1;
        setSelectedTaskId(null);
        setSelectedTask(null);
        setDetailLoading(false);
        setDetailErrors({});
    }, []);

    const saveTaskDetails = useCallback(
        async (event) => {
            event.preventDefault();
            if (!selectedTask) return;
            if (!String(selectedTask.titel ?? '').trim()) {
                setDetailErrors({ titel: ['Titel is verplicht.'] });
                return;
            }
            setDetailSaving(true);
            setDetailErrors({});
            try {
                    const response = await axios.patch(`/taken/tasks/${selectedTask.id}`, {
                        titel: selectedTask.titel,
                        omschrijving: selectedTask.omschrijving ?? null,
                        labels: selectedTask.labels ?? null,
                        prioriteit: selectedTask.prioriteit ?? 'normaal',
                        task_project_id: selectedTask.task_project_id ?? null,
                        deadline: selectedTask.deadline ?? null,
                        status: selectedTask.status ?? 'open',
                        assignees: (selectedTask.assignees ?? []).map((a) => a.id),
                    });
                const updated = response.data.task;
                setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
                setSelectedTask((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
                setNotice({ tone: 'success', text: 'Taak opgeslagen.' });
            } catch (error) {
                setDetailErrors(error?.response?.data?.errors ?? {});
                setNotice({ tone: 'error', text: firstError(error, 'Opslaan mislukt.') });
            } finally {
                setDetailSaving(false);
            }
        },
        [selectedTask],
    );

    const addComment = useCallback(
        async (event) => {
            event.preventDefault();
            if (!selectedTaskId || !commentBody.trim()) return;
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
        [commentBody, selectedTaskId],
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
                    const others = current.filter((a) => a.id !== fromCol?.assigneeId && a.id !== toAssigneeId);
                    const toUser = users.find((u) => u.id === toAssigneeId);
                    movedAssignees = [{ id: toAssigneeId, name: toUser?.name ?? '' }, ...others];
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
        [applyItemsToState, columns, fetchTasks, group, itemsByColumn, persistReorder, taskById, users],
    );

    const createProject = useCallback(
        async (event) => {
            event.preventDefault();
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
        [projectForm],
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
                    task_project_id: group === 'project' ? column.projectId : (filterProject ? Number(filterProject) : null),
                    status: group === 'status' ? column.status : 'open',
                    prioriteit: 'normaal',
                    deadline: null,
                    labels: null,
                    assignees: view === 'team' ? (column.assigneeId ? [column.assigneeId] : []) : [],
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
        [filterProject, group, quickAddSaving, view],
    );

    const createTask = useCallback(
        async (event) => {
            event.preventDefault();
            setTaskSaving(true);
            setTaskErrors({});
            try {
                const form = new FormData();
                form.append('titel', taskForm.titel);
                if (taskForm.omschrijving) form.append('omschrijving', taskForm.omschrijving);
                if (taskForm.task_project_id) form.append('task_project_id', taskForm.task_project_id);
                form.append('status', taskForm.status);
                form.append('prioriteit', taskForm.prioriteit);
                if (taskForm.deadline) form.append('deadline', taskForm.deadline);
                if (taskForm.labels) form.append('labels', taskForm.labels);
                taskForm.assignees.forEach((id) => form.append('assignees[]', id));
                taskFiles.forEach((file) => form.append('attachments[]', file));

                await axios.post('/taken/tasks', form);
                setTaskForm({
                    titel: '',
                    omschrijving: '',
                    task_project_id: '',
                    status: 'open',
                    prioriteit: 'normaal',
                    deadline: '',
                    labels: '',
                    assignees: [],
                });
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
        [taskForm, taskFiles, fetchTasks],
    );

    // De server sorteert al volgens de gekozen sortering; niet opnieuw sorteren.
    const listRows = tasks;

    const closeProjectModal = useCallback(() => setShowProjectModal(false), []);
    const closeTaskModal = useCallback(() => setShowTaskModal(false), []);
    const projectDialogRef = useDialog(showProjectModal, closeProjectModal);
    const taskDialogRef = useDialog(showTaskModal, closeTaskModal);
    const detailDialogRef = useDialog(Boolean(selectedTaskId), closeTask);

    return (
        <>
            <Head title="Taken" />
            <div className="pb-16">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Taken</h1>
                        <p className="mt-1 text-sm text-zinc-500">Overzicht per taak, project en team.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-lg bg-white p-1 ring-1 ring-zinc-200" role="group" aria-label="Weergave">
                            <button
                                type="button"
                                aria-pressed={view === 'list'}
                                className={cx('rounded-md px-3 py-2 text-sm font-semibold', view === 'list' ? 'bg-zinc-900 text-white' : 'text-zinc-700')}
                                onClick={() => setView('list')}
                            >
                                Lijst
                            </button>
                            <button
                                type="button"
                                aria-pressed={view === 'board'}
                                className={cx('rounded-md px-3 py-2 text-sm font-semibold', view === 'board' ? 'bg-zinc-900 text-white' : 'text-zinc-700')}
                                onClick={() => setView('board')}
                            >
                                Board
                            </button>
                            <button
                                type="button"
                                aria-pressed={view === 'team'}
                                className={cx('rounded-md px-3 py-2 text-sm font-semibold', view === 'team' ? 'bg-zinc-900 text-white' : 'text-zinc-700')}
                                onClick={() => setView('team')}
                            >
                                Team
                            </button>
                        </div>
                        <Button onClick={() => setShowTaskModal(true)}>Nieuwe taak</Button>
                        <Button tone="secondary" onClick={() => setShowProjectModal(true)}>
                            Nieuw project
                        </Button>
                    </div>
                </div>

                {notice ? (
                    <div
                        role={notice.tone === 'error' ? 'alert' : 'status'}
                        aria-live={notice.tone === 'error' ? 'assertive' : 'polite'}
                        className={cx(
                            'fixed bottom-4 left-4 right-4 z-[60] rounded-xl border p-4 text-sm shadow-lg sm:left-auto sm:w-96',
                            notice.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900',
                        )}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>{notice.text}</div>
                            <button type="button" className="text-xs font-semibold" onClick={() => setNotice(null)}>
                                Sluiten
                            </button>
                        </div>
                    </div>
                ) : null}

                <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label htmlFor="tasks-filter-zoeken" className="block text-xs font-semibold text-zinc-500">Zoeken</label>
                            <input
                                id="tasks-filter-zoeken"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Zoek op titel, omschrijving, labels"
                            />
                        </div>
                        <div>
                            <label htmlFor="tasks-filter-project" className="block text-xs font-semibold text-zinc-500">Project</label>
                            <select id="tasks-filter-project" className="mt-1 w-full rounded-md border-zinc-300 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
                                <option value="">Alle projecten</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.naam}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tasks-filter-status" className="block text-xs font-semibold text-zinc-500">Status</label>
                            <select id="tasks-filter-status" className="mt-1 w-full rounded-md border-zinc-300 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="">Alle statussen</option>
                                {statusOptions.map((s) => (
                                    <option key={s} value={s}>
                                        {statusLabel(s)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tasks-filter-prioriteit" className="block text-xs font-semibold text-zinc-500">Prioriteit</label>
                            <select id="tasks-filter-prioriteit" className="mt-1 w-full rounded-md border-zinc-300 text-sm" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                                <option value="">Alle prioriteiten</option>
                                {priorityOptions.map((p) => (
                                    <option key={p} value={p}>
                                        {priorityMeta(p).label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 lg:col-span-2">
                            <label htmlFor="tasks-filter-toegewezen-aan" className="block text-xs font-semibold text-zinc-500">Toegewezen aan</label>
                            <select id="tasks-filter-toegewezen-aan" className="mt-1 w-full rounded-md border-zinc-300 text-sm" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
                                <option value="">Iedereen</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tasks-filter-sorteren" className="block text-xs font-semibold text-zinc-500">Sorteren</label>
                            <select id="tasks-filter-sorteren" className="mt-1 w-full rounded-md border-zinc-300 text-sm" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                                <option value="deadline">Deadline</option>
                                <option value="prioriteit">Prioriteit</option>
                                <option value="nieuwste">Nieuwste</option>
                            </select>
                        </div>
                        {view === 'board' ? (
                            <div>
                                <label htmlFor="tasks-filter-groepeer" className="block text-xs font-semibold text-zinc-500">Groepeer</label>
                                <select id="tasks-filter-groepeer" className="mt-1 w-full rounded-md border-zinc-300 text-sm" value={groupBoardBy} onChange={(e) => setGroupBoardBy(e.target.value)}>
                                    <option value="project">Project</option>
                                    <option value="status">Status</option>
                                </select>
                            </div>
                        ) : null}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                        <div className="flex items-center gap-2">
                            {loading ? <span className="font-semibold text-zinc-700" role="status">Laden...</span> : null}
                            <span>{tasks.length === 1 ? '1 taak' : `${tasks.length} taken`}</span>
                        </div>
                        <Button tone="ghost" onClick={() => fetchTasks()} disabled={loading}>
                            Vernieuwen
                        </Button>
                    </div>
                </div>

                {view === 'list' ? (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-zinc-200 text-sm">
                                <thead className="bg-zinc-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Taak</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Project</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Prioriteit</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Deadline</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Toegewezen aan</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Info</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200">
                                    {listRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                                                {loading ? 'Laden...' : 'Geen taken gevonden.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        listRows.map((task) => (
                                            <tr key={task.id} className="hover:bg-zinc-50">
                                                <td className="px-4 py-3">
                                                    <button type="button" className="font-semibold text-zinc-900 hover:underline" onClick={() => openTask(task.id)}>
                                                        {task.titel}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-zinc-600">{task.project?.naam ?? '-'}</td>
                                                <td className="px-4 py-3 text-zinc-600">{statusLabel(task.status)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', priorityMeta(task.prioriteit).className)}>
                                                        {priorityMeta(task.prioriteit).label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-zinc-600">{task.deadline ? formatDateTime(task.deadline) : '-'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {task.assignees?.length ? task.assignees.map((a) => <Pill key={a.id}>{a.name}</Pill>) : <span className="text-zinc-400">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-zinc-600">
                                                    <div className="flex items-center gap-2">
                                                        {task.counts?.comments ? <Pill>{task.counts.comments} reacties</Pill> : null}
                                                        {task.counts?.attachments ? <Pill>{task.counts.attachments} bijlagen</Pill> : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="mt-6">
                        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
                            <div className="flex gap-4 overflow-x-auto pb-4">
                                {columns.map((col) => {
                                    const taskIds = itemsByColumn[col.id] ?? [];
                                    return (
                                        <div key={col.id} className="shrink-0">
                                            <Column
                                                title={col.title}
                                                subtitle={col.subtitle}
                                                count={taskIds.length}
                                                footer={
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className="w-full rounded-md border-zinc-300 bg-white text-sm"
                                                            placeholder="Taak toevoegen..."
                                                            aria-label={`Taak toevoegen aan ${col.title}`}
                                                            disabled={Boolean(quickAddSaving[col.id])}
                                                            value={quickAdd[col.id] ?? ''}
                                                            onChange={(e) => setQuickAdd((prev) => ({ ...prev, [col.id]: e.target.value }))}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    quickCreateTask({ column: col, title: quickAdd[col.id] ?? '' });
                                                                }
                                                            }}
                                                        />
                                                        <Button
                                                            tone="secondary"
                                                            aria-label={`Taak toevoegen aan ${col.title}`}
                                                            disabled={Boolean(quickAddSaving[col.id]) || !String(quickAdd[col.id] ?? '').trim()}
                                                            onClick={() => quickCreateTask({ column: col, title: quickAdd[col.id] ?? '' })}
                                                        >
                                                            {quickAddSaving[col.id] ? '...' : '+'}
                                                        </Button>
                                                    </div>
                                                }
                                            >
                                                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                                                    {taskIds.length === 0 ? (
                                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-500">Geen taken.</div>
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
                            <DragOverlay>{activeDragTask ? <TaskOverlay task={activeDragTask} /> : null}</DragOverlay>
                        </DndContext>
                    </div>
                )}
            </div>

            {showProjectModal ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeProjectModal();
                    }}
                >
                    <div
                        ref={projectDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="project-modal-title"
                        tabIndex={-1}
                        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div id="project-modal-title" className="text-lg font-bold text-zinc-900">Nieuw project</div>
                                <div className="mt-1 text-sm text-zinc-500">Maak een nieuwe projectkolom voor je board.</div>
                            </div>
                            <Button tone="ghost" type="button" onClick={closeProjectModal}>
                                Sluiten
                            </Button>
                        </div>
                        <form className="mt-6 space-y-4" onSubmit={createProject}>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-project-naam" className="block text-xs font-semibold text-zinc-500">Naam</label>
                                    <input
                                        id="tasks-project-naam"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={projectForm.naam}
                                        onChange={(e) => setProjectForm((p) => ({ ...p, naam: e.target.value }))}
                                    />
                                    {projectErrors.naam ? <div className="mt-1 text-xs text-rose-600" role="alert">{projectErrors.naam?.[0]}</div> : null}
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-project-omschrijving" className="block text-xs font-semibold text-zinc-500">Omschrijving</label>
                                    <textarea
                                        id="tasks-project-omschrijving"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        rows={3}
                                        value={projectForm.omschrijving}
                                        onChange={(e) => setProjectForm((p) => ({ ...p, omschrijving: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="tasks-project-deadline" className="block text-xs font-semibold text-zinc-500">Deadline</label>
                                    <input
                                        id="tasks-project-deadline"
                                        type="datetime-local"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={projectForm.deadline}
                                        onChange={(e) => setProjectForm((p) => ({ ...p, deadline: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="tasks-project-kleur-optioneel" className="block text-xs font-semibold text-zinc-500">Kleur (optioneel)</label>
                                    <input
                                        id="tasks-project-kleur-optioneel"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        placeholder="#aabbcc"
                                        value={projectForm.kleur}
                                        onChange={(e) => setProjectForm((p) => ({ ...p, kleur: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <ErrorList errors={projectErrors} exclude={['naam']} />
                            <div className="flex items-center justify-end gap-2">
                                <Button tone="secondary" type="button" onClick={closeProjectModal}>
                                    Annuleren
                                </Button>
                                <Button type="submit" disabled={projectSaving}>
                                    {projectSaving ? 'Opslaan...' : 'Opslaan'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
            {showTaskModal ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeTaskModal();
                    }}
                >
                    <div
                        ref={taskDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="task-modal-title"
                        tabIndex={-1}
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div id="task-modal-title" className="text-lg font-bold text-zinc-900">Nieuwe taak</div>
                                <div className="mt-1 text-sm text-zinc-500">Maak snel een taak aan en koppel deze aan een project.</div>
                            </div>
                            <Button tone="ghost" type="button" onClick={closeTaskModal}>
                                Sluiten
                            </Button>
                        </div>
                        <form className="mt-6 space-y-4" onSubmit={createTask}>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-task-titel" className="block text-xs font-semibold text-zinc-500">Titel</label>
                                    <input
                                        id="tasks-task-titel"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={taskForm.titel}
                                        onChange={(e) => setTaskForm((t) => ({ ...t, titel: e.target.value }))}
                                    />
                                    {taskErrors.titel ? <div className="mt-1 text-xs text-rose-600" role="alert">{taskErrors.titel?.[0]}</div> : null}
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-task-omschrijving" className="block text-xs font-semibold text-zinc-500">Omschrijving</label>
                                    <textarea
                                        id="tasks-task-omschrijving"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        rows={3}
                                        value={taskForm.omschrijving}
                                        onChange={(e) => setTaskForm((t) => ({ ...t, omschrijving: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="tasks-task-project" className="block text-xs font-semibold text-zinc-500">Project</label>
                                    <select
                                        id="tasks-task-project"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={taskForm.task_project_id}
                                        onChange={(e) => setTaskForm((t) => ({ ...t, task_project_id: e.target.value }))}
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
                                    <label htmlFor="tasks-task-status" className="block text-xs font-semibold text-zinc-500">Status</label>
                                    <select
                                        id="tasks-task-status"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={taskForm.status}
                                        onChange={(e) => setTaskForm((t) => ({ ...t, status: e.target.value }))}
                                    >
                                        {statusOptions.map((s) => (
                                            <option key={s} value={s}>
                                                {statusLabel(s)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="tasks-task-prioriteit" className="block text-xs font-semibold text-zinc-500">Prioriteit</label>
                                    <select
                                        id="tasks-task-prioriteit"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={taskForm.prioriteit}
                                        onChange={(e) => setTaskForm((t) => ({ ...t, prioriteit: e.target.value }))}
                                    >
                                        {priorityOptions.map((p) => (
                                            <option key={p} value={p}>
                                                {priorityMeta(p).label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="tasks-task-deadline" className="block text-xs font-semibold text-zinc-500">Deadline</label>
                                    <input
                                        id="tasks-task-deadline"
                                        type="datetime-local"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={taskForm.deadline}
                                        onChange={(e) => setTaskForm((t) => ({ ...t, deadline: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-task-labels" className="block text-xs font-semibold text-zinc-500">Labels</label>
                                    <input
                                        id="tasks-task-labels"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        placeholder="bijv. lead, demo, urgent"
                                        value={taskForm.labels}
                                        onChange={(e) => setTaskForm((t) => ({ ...t, labels: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-task-toegewezen-aan" className="block text-xs font-semibold text-zinc-500">Toegewezen aan</label>
                                    <select
                                        id="tasks-task-toegewezen-aan"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        multiple
                                        value={taskForm.assignees.map(String)}
                                        onChange={(e) => {
                                            const selected = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                                            setTaskForm((t) => ({ ...t, assignees: selected }));
                                        }}
                                    >
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="tasks-task-bijlagen" className="block text-xs font-semibold text-zinc-500">Bijlagen</label>
                                    <input
                                        id="tasks-task-bijlagen"
                                        type="file"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        multiple
                                        accept={ATTACHMENT_ACCEPT}
                                        onChange={(e) => setTaskFiles(Array.from(e.target.files ?? []))}
                                    />
                                    <div className="mt-1 text-xs text-zinc-500">{ATTACHMENT_HINT}</div>
                                    {taskFiles.length > 0 ? (
                                        <div className="mt-1 text-xs text-zinc-600">
                                            {taskFiles.length === 1 ? '1 bestand gekozen' : `${taskFiles.length} bestanden gekozen`}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            <ErrorList errors={taskErrors} exclude={['titel']} />
                            <div className="flex items-center justify-end gap-2">
                                <Button tone="secondary" type="button" onClick={closeTaskModal}>
                                    Annuleren
                                </Button>
                                <Button type="submit" disabled={taskSaving}>
                                    {taskSaving ? 'Opslaan...' : 'Taak toevoegen'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
            {selectedTaskId ? (
                <div
                    className="fixed inset-0 z-50 flex justify-end bg-zinc-900/40"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeTask();
                    }}
                >
                    <div
                        ref={detailDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="task-detail-title"
                        tabIndex={-1}
                        className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-6">
                            <div>
                                <div id="task-detail-title" className="text-lg font-bold text-zinc-900">Taak</div>
                                <div className="mt-1 text-sm text-zinc-500">{selectedTask?.project?.naam ?? 'Geen project'}</div>
                            </div>
                            <Button tone="ghost" onClick={closeTask}>
                                Sluiten
                            </Button>
                        </div>
                        {detailLoading ? (
                            <div className="p-6 text-sm text-zinc-600">Laden...</div>
                        ) : !selectedTask ? (
                            <div className="p-6 text-sm text-zinc-600">Taak niet gevonden.</div>
                        ) : (
                            <div className="p-6">
                                <form className="space-y-6" onSubmit={saveTaskDetails}>
                                    <div>
                                        <label htmlFor="tasks-detail-titel" className="block text-xs font-semibold text-zinc-500">Titel</label>
                                        <input
                                            id="tasks-detail-titel"
                                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                            value={selectedTask.titel ?? ''}
                                            onChange={(e) => setSelectedTask((t) => ({ ...t, titel: e.target.value }))}
                                            required
                                        />
                                        {detailErrors.titel ? <div className="mt-1 text-xs text-rose-600" role="alert">{detailErrors.titel?.[0]}</div> : null}
                                    </div>
                                    <div>
                                        <label htmlFor="tasks-detail-omschrijving" className="block text-xs font-semibold text-zinc-500">Omschrijving</label>
                                        <textarea
                                            id="tasks-detail-omschrijving"
                                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                            rows={4}
                                            value={selectedTask.omschrijving ?? ''}
                                            onChange={(e) => setSelectedTask((t) => ({ ...t, omschrijving: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label htmlFor="tasks-detail-project" className="block text-xs font-semibold text-zinc-500">Project</label>
                                            <select
                                                id="tasks-detail-project"
                                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                                value={selectedTask.task_project_id ?? ''}
                                                onChange={(e) =>
                                                    setSelectedTask((t) => ({ ...t, task_project_id: e.target.value ? Number(e.target.value) : null }))
                                                }
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
                                            <label htmlFor="tasks-detail-status" className="block text-xs font-semibold text-zinc-500">Status</label>
                                            <select
                                                id="tasks-detail-status"
                                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                                value={selectedTask.status ?? 'open'}
                                                onChange={(e) => setSelectedTask((t) => ({ ...t, status: e.target.value }))}
                                            >
                                                {statusOptions.map((s) => (
                                                    <option key={s} value={s}>
                                                        {statusLabel(s)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="tasks-detail-prioriteit" className="block text-xs font-semibold text-zinc-500">Prioriteit</label>
                                            <select
                                                id="tasks-detail-prioriteit"
                                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                                value={selectedTask.prioriteit ?? 'normaal'}
                                                onChange={(e) => setSelectedTask((t) => ({ ...t, prioriteit: e.target.value }))}
                                            >
                                                {priorityOptions.map((p) => (
                                                    <option key={p} value={p}>
                                                        {priorityMeta(p).label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="tasks-detail-deadline" className="block text-xs font-semibold text-zinc-500">Deadline</label>
                                            <input
                                                id="tasks-detail-deadline"
                                                type="datetime-local"
                                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                                value={toLocalInputValue(selectedTask.deadline)}
                                                onChange={(e) =>
                                                    setSelectedTask((t) => ({
                                                        ...t,
                                                        deadline: e.target.value || null,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="tasks-detail-labels" className="block text-xs font-semibold text-zinc-500">Labels</label>
                                            <input
                                                id="tasks-detail-labels"
                                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                                placeholder="bijv. lead, demo, urgent"
                                                value={selectedTask.labels ?? ''}
                                                onChange={(e) => setSelectedTask((t) => ({ ...t, labels: e.target.value }))}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="tasks-detail-toegewezen-aan" className="block text-xs font-semibold text-zinc-500">Toegewezen aan</label>
                                            <select
                                                id="tasks-detail-toegewezen-aan"
                                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                                multiple
                                                value={(selectedTask.assignees ?? []).map((a) => String(a.id))}
                                                onChange={(e) => {
                                                    const selected = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                                                    const mapped = users.filter((u) => selected.includes(u.id)).map((u) => ({ id: u.id, name: u.name }));
                                                    setSelectedTask((t) => ({ ...t, assignees: mapped }));
                                                }}
                                            >
                                                {users.map((u) => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="mt-1 text-xs text-zinc-500">Tip: houd Ctrl (Mac: Cmd) ingedrukt om meerdere te kiezen.</div>
                                        </div>
                                    </div>

                                    <ErrorList errors={detailErrors} exclude={['titel']} />
                                    <div className="flex items-center justify-end gap-2">
                                        <Button tone="secondary" type="button" onClick={closeTask}>
                                            Sluiten
                                        </Button>
                                        <Button type="submit" disabled={detailSaving}>
                                            {detailSaving ? 'Opslaan...' : 'Opslaan'}
                                        </Button>
                                    </div>
                                </form>

                                <div className="mt-10 border-t border-zinc-200 pt-6">
                                    <div className="text-sm font-bold text-zinc-900">Reacties</div>
                                    <ul className="mt-4 space-y-3">
                                        {selectedTask.comments?.length ? (
                                            selectedTask.comments.map((c) => (
                                                <li key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                                                    <div className="text-xs font-semibold text-zinc-500">
                                                        {c.author?.name ?? 'Onbekend'} · {c.created_at ? formatDateTime(c.created_at) : '-'}
                                                    </div>
                                                    <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{c.body}</div>
                                                </li>
                                            ))
                                        ) : (
                                            <li className="text-sm text-zinc-500">Nog geen reacties.</li>
                                        )}
                                    </ul>
                                    <form className="mt-4 space-y-2" onSubmit={addComment}>
                                        <textarea
                                            className="w-full rounded-md border-zinc-300 text-sm"
                                            rows={3}
                                            aria-label="Reactie"
                                            maxLength={5000}
                                            value={commentBody}
                                            onChange={(e) => setCommentBody(e.target.value)}
                                            placeholder="Schrijf een reactie en tag met @naam"
                                        />
                                        <div className="flex justify-end">
                                            <Button type="submit" disabled={commentSaving || !commentBody.trim()}>
                                                {commentSaving ? 'Plaatsen...' : 'Plaatsen'}
                                            </Button>
                                        </div>
                                    </form>
                                </div>

                                <div className="mt-10 border-t border-zinc-200 pt-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-bold text-zinc-900">Bijlagen</div>
                                        <label
                                            className={cx(
                                                'inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 focus-within:ring-2 focus-within:ring-zinc-400 hover:bg-zinc-50',
                                                attachmentUploading ? 'cursor-wait opacity-60' : 'cursor-pointer',
                                            )}
                                        >
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
                                            {attachmentUploading ? 'Uploaden...' : 'Bestand uploaden'}
                                        </label>
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-500">{ATTACHMENT_HINT}</div>

                                    {selectedTask.attachments?.length ? (
                                        <ul className="mt-4 space-y-2">
                                            {selectedTask.attachments.map((file) => (
                                                <li key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-semibold text-zinc-900">{file.original_name}</div>
                                                        <div className="mt-1 text-xs text-zinc-500">
                                                            {[formatFileSize(file.size), file.mime].filter(Boolean).join(' · ') || 'Bestand'}
                                                        </div>
                                                    </div>
                                                    <a
                                                        className="shrink-0 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                                                        href={file.url}
                                                        download
                                                        aria-label={`${file.original_name} downloaden`}
                                                    >
                                                        Downloaden
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="mt-4 text-sm text-zinc-500">Nog geen bijlagen.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </>
    );
}
