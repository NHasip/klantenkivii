import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Head } from '@inertiajs/react';

function formatDateTime(isoString) {
    if (!isoString) return '-';
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
    return String(value).replace(/_/g, ' ');
}

function AssigneeBadge({ name }) {
    const initials = String(name || '')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((part) => part.slice(0, 1))
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold">{initials || '--'}</span>;
}

export default function Tasks({ initial, filters, urls }) {
    const [tasks, setTasks] = useState(initial?.tasks ?? []);
    const [projects, setProjects] = useState(initial?.projects ?? []);
    const [users, setUsers] = useState(initial?.users ?? []);
    const [statusOptions, setStatusOptions] = useState(initial?.statusOptions ?? []);
    const [priorityOptions, setPriorityOptions] = useState(initial?.priorityOptions ?? []);

    const [view, setView] = useState('list');
    const [filterProject, setFilterProject] = useState(filters?.project ?? '');
    const [filterAssignee, setFilterAssignee] = useState(filters?.assignee ?? '');
    const [filterStatus, setFilterStatus] = useState(filters?.status ?? '');
    const [filterPriority, setFilterPriority] = useState(filters?.priority ?? '');
    const [search, setSearch] = useState(filters?.search ?? '');
    const [loading, setLoading] = useState(false);

    const [projectForm, setProjectForm] = useState({
        naam: '',
        omschrijving: '',
        deadline: '',
        kleur: '',
    });
    const [projectErrors, setProjectErrors] = useState({});
    const [projectSaving, setProjectSaving] = useState(false);

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
    const [commentBody, setCommentBody] = useState('');
    const [commentSaving, setCommentSaving] = useState(false);

    const [notice, setNotice] = useState(null);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get('/taken/data', {
                params: {
                    project: filterProject || undefined,
                    assignee: filterAssignee || undefined,
                    status: filterStatus || undefined,
                    priority: filterPriority || undefined,
                    search: search || undefined,
                },
            });
            setTasks(response.data.tasks ?? []);
            setProjects(response.data.projects ?? []);
            setUsers(response.data.users ?? []);
            setStatusOptions(response.data.statusOptions ?? []);
            setPriorityOptions(response.data.priorityOptions ?? []);
        } catch {
            setNotice({ tone: 'error', text: 'Taken laden mislukt. Probeer opnieuw.' });
        } finally {
            setLoading(false);
        }
    }, [filterProject, filterAssignee, filterStatus, filterPriority, search]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchTasks();
        }, 250);
        return () => clearTimeout(handler);
    }, [fetchTasks]);

    const tasksByStatus = useMemo(() => {
        const grouped = {};
        statusOptions.forEach((status) => {
            grouped[status] = [];
        });
        tasks.forEach((task) => {
            if (!grouped[task.status]) grouped[task.status] = [];
            grouped[task.status].push(task);
        });
        return grouped;
    }, [tasks, statusOptions]);

    const tasksByUser = useMemo(() => {
        const grouped = {};
        users.forEach((user) => {
            grouped[user.id] = [];
        });
        tasks.forEach((task) => {
            if (!task.assignees || task.assignees.length === 0) return;
            task.assignees.forEach((assignee) => {
                if (!grouped[assignee.id]) grouped[assignee.id] = [];
                grouped[assignee.id].push(task);
            });
        });
        return grouped;
    }, [tasks, users]);

    const unassigned = useMemo(() => tasks.filter((task) => !task.assignees || task.assignees.length === 0), [tasks]);

    const updateTaskInState = useCallback((updated) => {
        setTasks((prev) => prev.map((task) => (task.id === updated.id ? { ...task, ...updated } : task)));
        setSelectedTask((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    }, []);

    const handleCreateProject = async (event) => {
        event.preventDefault();
        setProjectSaving(true);
        setProjectErrors({});
        try {
            const response = await axios.post('/taken/projects', projectForm);
            setProjects((prev) => [...prev, response.data.project]);
            setProjectForm({ naam: '', omschrijving: '', deadline: '', kleur: '' });
            setNotice({ tone: 'success', text: 'Project toegevoegd.' });
        } catch (error) {
            if (error?.response?.status === 422) {
                setProjectErrors(error.response.data.errors ?? {});
            } else {
                setNotice({ tone: 'error', text: 'Project toevoegen mislukt.' });
            }
        } finally {
            setProjectSaving(false);
        }
    };

    const handleCreateTask = async (event) => {
        event.preventDefault();
        setTaskSaving(true);
        setTaskErrors({});
        try {
            const formData = new FormData();
            formData.append('titel', taskForm.titel);
            if (taskForm.omschrijving) formData.append('omschrijving', taskForm.omschrijving);
            if (taskForm.task_project_id) formData.append('task_project_id', taskForm.task_project_id);
            formData.append('status', taskForm.status);
            formData.append('prioriteit', taskForm.prioriteit);
            if (taskForm.deadline) formData.append('deadline', taskForm.deadline);
            if (taskForm.labels) formData.append('labels', taskForm.labels);
            taskForm.assignees.forEach((assigneeId) => {
                formData.append('assignees[]', assigneeId);
            });
            taskFiles.forEach((file) => {
                formData.append('attachments[]', file);
            });

            await axios.post('/taken/tasks', formData);
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
            setNotice({ tone: 'success', text: 'Taak toegevoegd.' });
            await fetchTasks();
        } catch (error) {
            if (error?.response?.status === 422) {
                setTaskErrors(error.response.data.errors ?? {});
            } else {
                setNotice({ tone: 'error', text: 'Taak toevoegen mislukt.' });
            }
        } finally {
            setTaskSaving(false);
        }
    };

    const handleStatusChange = async (taskId, status) => {
        try {
            const response = await axios.patch(`/taken/tasks/${taskId}/status`, { status });
            updateTaskInState(response.data.task);
        } catch {
            setNotice({ tone: 'error', text: 'Status bijwerken mislukt.' });
        }
    };

    const handleSelectTask = async (taskId) => {
        setSelectedTaskId(taskId);
        setSelectedTask(null);
        try {
            const response = await axios.get(`/taken/${taskId}`);
            setSelectedTask(response.data.task);
        } catch {
            setNotice({ tone: 'error', text: 'Taakdetails laden mislukt.' });
        }
    };

    const handleAddComment = async (event) => {
        event.preventDefault();
        if (!selectedTaskId || !commentBody.trim()) return;
        setCommentSaving(true);
        try {
            const response = await axios.post(`/taken/tasks/${selectedTaskId}/comments`, { body: commentBody });
            setSelectedTask((prev) =>
                prev
                    ? {
                          ...prev,
                          comments: [...(prev.comments ?? []), response.data.comment],
                      }
                    : prev
            );
            setCommentBody('');
            setNotice({ tone: 'success', text: 'Reactie geplaatst.' });
        } catch {
            setNotice({ tone: 'error', text: 'Reactie plaatsen mislukt.' });
        } finally {
            setCommentSaving(false);
        }
    };

    const handleDrop = async (event, status) => {
        event.preventDefault();
        const taskId = event.dataTransfer?.getData('text/task-id');
        if (!taskId || !status) return;
        await handleStatusChange(taskId, status);
    };

    return (
        <>
            <Head title="Taken" />

            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Taken</h1>
                        <div className="mt-1 text-sm text-zinc-600">Overzicht per taak, project en team.</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setView('list')}
                            className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                                view === 'list' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:bg-zinc-50'
                            }`}
                        >
                            Lijst
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('board')}
                            className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                                view === 'board' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:bg-zinc-50'
                            }`}
                        >
                            Board
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('team')}
                            className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                                view === 'team' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:bg-zinc-50'
                            }`}
                        >
                            Team
                        </button>
                        {urls?.tasks_old ? (
                            <a
                                href={urls.tasks_old}
                                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-500 hover:bg-zinc-50"
                            >
                                Taken (old)
                            </a>
                        ) : null}
                    </div>
                </div>

                {notice ? (
                    <div
                        className={`rounded-lg border px-4 py-3 text-sm ${
                            notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>{notice.text}</div>
                            <button type="button" className="text-xs font-semibold" onClick={() => setNotice(null)}>
                                Sluiten
                            </button>
                        </div>
                    </div>
                ) : null}
                {view === 'board' ? (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                        {statusOptions.map((status) => (
                            <div
                                key={status}
                                className="rounded-xl border border-zinc-200 bg-white p-4"
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => handleDrop(event, status)}
                            >
                                <div className="text-sm font-semibold">{statusLabel(status)}</div>
                                <div className="mt-3 space-y-3">
                                    {(tasksByStatus[status] ?? []).map((task) => (
                                        <div
                                            key={task.id}
                                            className="cursor-move rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                                            draggable
                                            onDragStart={(event) => event.dataTransfer?.setData('text/task-id', String(task.id))}
                                            onClick={() => handleSelectTask(task.id)}
                                        >
                                            <div className="text-sm font-semibold">{task.titel}</div>
                                            <div className="mt-1 text-xs text-zinc-500">{task.project?.naam ?? 'Geen project'}</div>
                                            {task.deadline ? <div className="mt-2 text-xs text-zinc-500">Deadline: {formatDateTime(task.deadline)}</div> : null}
                                        </div>
                                    ))}
                                    {(tasksByStatus[status] ?? []).length === 0 ? <div className="text-xs text-zinc-400">Geen taken.</div> : null}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}

                {view === 'team' ? (
                    <div className="space-y-4">
                        {users.map((user) => (
                            <div key={user.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                                <div className="text-sm font-semibold">{user.name}</div>
                                <div className="mt-3 space-y-2">
                                    {(tasksByUser[user.id] ?? []).length === 0 ? (
                                        <div className="text-xs text-zinc-400">Geen taken.</div>
                                    ) : (
                                        (tasksByUser[user.id] ?? []).map((task) => (
                                            <div key={task.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                                                <button type="button" onClick={() => handleSelectTask(task.id)} className="text-left hover:text-zinc-700">
                                                    {task.titel}
                                                </button>
                                                <span className="text-xs text-zinc-500">{statusLabel(task.status)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="rounded-xl border border-zinc-200 bg-white p-4">
                            <div className="text-sm font-semibold">Niet toegewezen</div>
                            <div className="mt-3 space-y-2">
                                {unassigned.length === 0 ? (
                                    <div className="text-xs text-zinc-400">Geen taken.</div>
                                ) : (
                                    unassigned.map((task) => (
                                        <div key={task.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                                            <button type="button" onClick={() => handleSelectTask(task.id)} className="text-left hover:text-zinc-700">
                                                {task.titel}
                                            </button>
                                            <span className="text-xs text-zinc-500">{statusLabel(task.status)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                {selectedTask ? (
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold">{selectedTask.titel}</div>
                                <div className="text-xs text-zinc-500">{selectedTask.project?.naam ?? 'Geen project'}</div>
                            </div>
                            <button
                                type="button"
                                className="text-xs text-zinc-500 hover:text-zinc-700"
                                onClick={() => {
                                    setSelectedTaskId(null);
                                    setSelectedTask(null);
                                }}
                            >
                                Sluiten
                            </button>
                        </div>
                        {selectedTask.omschrijving ? <div className="mt-3 text-sm text-zinc-700">{selectedTask.omschrijving}</div> : null}

                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div>
                                <div className="text-xs font-semibold text-zinc-500">Assignees</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedTask.assignees && selectedTask.assignees.length > 0 ? (
                                        selectedTask.assignees.map((assignee) => (
                                            <span key={assignee.id} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold">
                                                {assignee.name}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-zinc-400">Geen</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-zinc-500">Deadline</div>
                                <div className="mt-2 text-sm">{selectedTask.deadline ? formatDateTime(selectedTask.deadline) : 'Geen'}</div>
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-zinc-500">Prioriteit</div>
                                <div className="mt-2 text-sm">{selectedTask.prioriteit}</div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="text-sm font-semibold">Reacties</div>
                            <ul className="mt-3 space-y-3">
                                {selectedTask.comments && selectedTask.comments.length > 0 ? (
                                    selectedTask.comments.map((comment) => (
                                        <li key={comment.id} className="rounded-lg border border-zinc-200 p-3">
                                            <div className="text-xs font-semibold text-zinc-500">
                                                {comment.author?.name ?? 'Onbekend'} - {formatDateTime(comment.created_at)}
                                            </div>
                                            <div className="mt-2 text-sm text-zinc-700">{comment.body}</div>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-xs text-zinc-400">Nog geen reacties.</li>
                                )}
                            </ul>
                            <form className="mt-4 space-y-2" onSubmit={handleAddComment}>
                                <textarea
                                    className="w-full rounded-md border-zinc-300 text-sm"
                                    rows="3"
                                    value={commentBody}
                                    onChange={(event) => setCommentBody(event.target.value)}
                                    placeholder="Schrijf een reactie en tag met @naam"
                                />
                                <div className="flex justify-end">
                                    <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white" disabled={commentSaving}>
                                        {commentSaving ? 'Plaatsen...' : 'Plaatsen'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                            <div className="mt-6">
                                <div className="text-sm font-semibold">Bijlagen</div>
                                <ul className="mt-3 space-y-2 text-sm">
                                    {selectedTask.attachments.map((file) => (
                                        <li key={file.id} className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                                            <span className="truncate">{file.original_name}</span>
                                            <a className="text-xs font-semibold text-indigo-700 hover:text-indigo-900" href={file.url} target="_blank" rel="noopener">
                                                Open
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </>
    );
}
