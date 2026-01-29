<div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight">Taken</h1>
            <div class="mt-1 text-sm text-zinc-600">Overzicht per taak, project en team.</div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <button type="button" wire:click="$set('view', 'list')" class="rounded-md border px-3 py-1.5 text-sm font-semibold @if($view === 'list') bg-zinc-900 text-white border-zinc-900 @else border-zinc-200 hover:bg-zinc-50 @endif">Lijst</button>
            <button type="button" wire:click="$set('view', 'board')" class="rounded-md border px-3 py-1.5 text-sm font-semibold @if($view === 'board') bg-zinc-900 text-white border-zinc-900 @else border-zinc-200 hover:bg-zinc-50 @endif">Board</button>
            <button type="button" wire:click="$set('view', 'team')" class="rounded-md border px-3 py-1.5 text-sm font-semibold @if($view === 'team') bg-zinc-900 text-white border-zinc-900 @else border-zinc-200 hover:bg-zinc-50 @endif">Team</button>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div class="rounded-xl border border-zinc-200 bg-white p-4 lg:col-span-3">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-zinc-600">Zoek</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="search" placeholder="Zoek op titel, omschrijving of labels">
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Project</label>
                    <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="filterProject">
                        <option value="">Alle</option>
                        @foreach($projects as $project)
                            <option value="{{ $project->id }}">{{ $project->naam }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Assignee</label>
                    <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="filterAssignee">
                        <option value="">Iedereen</option>
                        @foreach($users as $user)
                            <option value="{{ $user->id }}">{{ $user->name }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Status</label>
                    <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="filterStatus">
                        <option value="">Alle</option>
                        @foreach($statusOptions as $status)
                            <option value="{{ $status->value }}">{{ str_replace('_', ' ', $status->value) }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Prioriteit</label>
                    <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="filterPriority">
                        <option value="">Alle</option>
                        @foreach($priorityOptions as $priority)
                            <option value="{{ $priority->value }}">{{ $priority->value }}</option>
                        @endforeach
                    </select>
                </div>
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-4">
            <details class="group">
                <summary class="cursor-pointer list-none text-sm font-semibold">Nieuw project</summary>
                <form wire:submit="createProject" class="mt-3 space-y-3">
                    <div>
                        <label class="block text-xs font-medium text-zinc-600">Naam *</label>
                        <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="projectNaam">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-zinc-600">Omschrijving</label>
                        <textarea class="mt-1 w-full rounded-md border-zinc-300 text-sm" rows="2" wire:model.live="projectOmschrijving"></textarea>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-zinc-600">Deadline</label>
                        <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="projectDeadline">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-zinc-600">Kleur (hex)</label>
                        <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="projectKleur" placeholder="#AEC22B">
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white">Opslaan</button>
                    </div>
                </form>
            </details>
        </div>
    </div>

    <details class="rounded-xl border border-zinc-200 bg-white p-5">
        <summary class="cursor-pointer list-none text-sm font-semibold">Nieuwe taak</summary>
        <form wire:submit="createTask" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div class="sm:col-span-3">
                <label class="block text-xs font-medium text-zinc-600">Titel *</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="taskTitel" placeholder="Bijv. Demo nabellen">
            </div>
            <div class="sm:col-span-3">
                <label class="block text-xs font-medium text-zinc-600">Project</label>
                <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="taskProjectId">
                    <option value="">Geen</option>
                    @foreach($projects as $project)
                        <option value="{{ $project->id }}">{{ $project->naam }}</option>
                    @endforeach
                </select>
            </div>
            <div class="sm:col-span-6">
                <label class="block text-xs font-medium text-zinc-600">Omschrijving</label>
                <textarea class="mt-1 w-full rounded-md border-zinc-300 text-sm" rows="3" wire:model.live="taskOmschrijving"></textarea>
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Status</label>
                <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="taskStatus">
                    @foreach($statusOptions as $status)
                        <option value="{{ $status->value }}">{{ str_replace('_', ' ', $status->value) }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Prioriteit</label>
                <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="taskPrioriteit">
                    @foreach($priorityOptions as $priority)
                        <option value="{{ $priority->value }}">{{ $priority->value }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Deadline</label>
                <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="taskDeadline">
            </div>
            <div class="sm:col-span-3">
                <label class="block text-xs font-medium text-zinc-600">Labels (comma)</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="taskLabels" placeholder="urgent, klant, demo">
            </div>
            <div class="sm:col-span-3">
                <label class="block text-xs font-medium text-zinc-600">Assignees</label>
                <select multiple class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="taskAssignees">
                    @foreach($users as $user)
                        <option value="{{ $user->id }}">{{ $user->name }}</option>
                    @endforeach
                </select>
            </div>
            <div class="sm:col-span-6">
                <label class="block text-xs font-medium text-zinc-600">Bijlagen</label>
                <input type="file" multiple class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="taskAttachments">
                <div class="mt-1 text-xs text-zinc-500">Max 10MB per bestand.</div>
            </div>
            <div class="sm:col-span-6 flex justify-end">
                <button type="submit" class="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">Taak toevoegen</button>
            </div>
        </form>
    </details>

    @if($view === 'list')
        <div class="rounded-xl border border-zinc-200 bg-white">
            <div class="grid grid-cols-12 gap-2 border-b border-zinc-200 px-4 py-3 text-xs font-semibold text-zinc-500">
                <div class="col-span-4">Taak</div>
                <div class="col-span-2">Project</div>
                <div class="col-span-2">Assignees</div>
                <div class="col-span-2">Status</div>
                <div class="col-span-2">Deadline</div>
            </div>
            <div class="divide-y divide-zinc-100">
                @forelse($tasks as $task)
                    <div class="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                        <div class="col-span-4">
                            <button type="button" wire:click="selectTask({{ $task->id }})" class="font-semibold text-zinc-900 hover:text-zinc-700">{{ $task->titel }}</button>
                            @if($task->labels)
                                <div class="mt-1 text-xs text-zinc-500">{{ $task->labels }}</div>
                            @endif
                        </div>
                        <div class="col-span-2 text-sm text-zinc-600">
                            {{ $task->project?->naam ?? '-' }}
                        </div>
                        <div class="col-span-2 flex flex-wrap gap-1">
                            @forelse($task->assignees as $assignee)
                                <span class="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold">{{ \Illuminate\Support\Str::of($assignee->name)->before(' ')->substr(0, 2) }}</span>
                            @empty
                                <span class="text-xs text-zinc-400">—</span>
                            @endforelse
                        </div>
                        <div class="col-span-2">
                            <select class="w-full rounded-md border-zinc-200 text-xs" wire:change="updateTaskStatus({{ $task->id }}, $event.target.value)">
                                @foreach($statusOptions as $status)
                                    <option value="{{ $status->value }}" @selected($task->status->value === $status->value)>
                                        {{ str_replace('_', ' ', $status->value) }}
                                    </option>
                                @endforeach
                            </select>
                        </div>
                        <div class="col-span-2 text-xs text-zinc-500">
                            {{ $task->deadline ? $task->deadline->format('d-m H:i') : 'Geen' }}
                        </div>
                    </div>
                @empty
                    <div class="px-4 py-6 text-sm text-zinc-500">Geen taken gevonden.</div>
                @endforelse
            </div>
        </div>
    @endif

    @if($view === 'board')
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-4" id="task-board">
            @foreach($statusOptions as $status)
                @php($statusKey = $status->value)
                <div class="rounded-xl border border-zinc-200 bg-white p-4" data-task-column data-status="{{ $statusKey }}">
                    <div class="text-sm font-semibold">{{ str_replace('_', ' ', $statusKey) }}</div>
                    <div class="mt-3 space-y-3">
                        @foreach($tasksByStatus[$statusKey] ?? [] as $task)
                            <div class="cursor-move rounded-lg border border-zinc-200 bg-zinc-50 p-3" draggable="true" data-task-card data-task-id="{{ $task->id }}">
                                <div class="text-sm font-semibold">{{ $task->titel }}</div>
                                <div class="mt-1 text-xs text-zinc-500">{{ $task->project?->naam ?? 'Geen project' }}</div>
                                @if($task->deadline)
                                    <div class="mt-2 text-xs text-zinc-500">Deadline: {{ $task->deadline->format('d-m H:i') }}</div>
                                @endif
                            </div>
                        @endforeach
                        @if(! isset($tasksByStatus[$statusKey]) || $tasksByStatus[$statusKey]->isEmpty())
                            <div class="text-xs text-zinc-400">Geen taken.</div>
                        @endif
                    </div>
                </div>
            @endforeach
        </div>
    @endif

    @if($view === 'team')
        <div class="space-y-4">
            @foreach($tasksByUser as $userId => $userTasks)
                @php($user = $users->firstWhere('id', $userId))
                <div class="rounded-xl border border-zinc-200 bg-white p-4">
                    <div class="text-sm font-semibold">{{ $user?->name ?? 'Onbekend' }}</div>
                    <div class="mt-3 space-y-2">
                        @forelse($userTasks as $task)
                            <div class="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                                <span>{{ $task->titel }}</span>
                                <span class="text-xs text-zinc-500">{{ str_replace('_', ' ', $task->status->value) }}</span>
                            </div>
                        @empty
                            <div class="text-xs text-zinc-400">Geen taken.</div>
                        @endforelse
                    </div>
                </div>
            @endforeach

            <div class="rounded-xl border border-zinc-200 bg-white p-4">
                <div class="text-sm font-semibold">Niet toegewezen</div>
                <div class="mt-3 space-y-2">
                    @forelse($unassigned as $task)
                        <div class="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                            <span>{{ $task->titel }}</span>
                            <span class="text-xs text-zinc-500">{{ str_replace('_', ' ', $task->status->value) }}</span>
                        </div>
                    @empty
                        <div class="text-xs text-zinc-400">Geen taken.</div>
                    @endforelse
                </div>
            </div>
        </div>
    @endif

    @if($selectedTask)
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-sm font-semibold">{{ $selectedTask->titel }}</div>
                    <div class="text-xs text-zinc-500">{{ $selectedTask->project?->naam ?? 'Geen project' }}</div>
                </div>
                <button type="button" class="text-xs text-zinc-500 hover:text-zinc-700" wire:click="$set('selectedTaskId', null)">Sluiten</button>
            </div>
            @if($selectedTask->omschrijving)
                <div class="mt-3 text-sm text-zinc-700">{{ $selectedTask->omschrijving }}</div>
            @endif

            <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div>
                    <div class="text-xs font-semibold text-zinc-500">Assignees</div>
                    <div class="mt-2 flex flex-wrap gap-2">
                        @forelse($selectedTask->assignees as $assignee)
                            <span class="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold">{{ $assignee->name }}</span>
                        @empty
                            <span class="text-xs text-zinc-400">Geen</span>
                        @endforelse
                    </div>
                </div>
                <div>
                    <div class="text-xs font-semibold text-zinc-500">Deadline</div>
                    <div class="mt-2 text-sm">{{ $selectedTask->deadline ? $selectedTask->deadline->format('d-m-Y H:i') : 'Geen' }}</div>
                </div>
                <div>
                    <div class="text-xs font-semibold text-zinc-500">Prioriteit</div>
                    <div class="mt-2 text-sm">{{ $selectedTask->prioriteit->value }}</div>
                </div>
            </div>

            <div class="mt-6">
                <div class="text-sm font-semibold">Reacties</div>
                <ul class="mt-3 space-y-3">
                    @forelse($selectedTask->comments as $comment)
                        <li class="rounded-lg border border-zinc-200 p-3">
                            <div class="text-xs font-semibold text-zinc-500">{{ $comment->author?->name ?? 'Onbekend' }} · {{ $comment->created_at->format('d-m H:i') }}</div>
                            <div class="mt-2 text-sm text-zinc-700">{{ $comment->body }}</div>
                        </li>
                    @empty
                        <li class="text-xs text-zinc-400">Nog geen reacties.</li>
                    @endforelse
                </ul>
                <form wire:submit="addComment" class="mt-4 space-y-2">
                    <textarea class="w-full rounded-md border-zinc-300 text-sm" rows="3" wire:model.live="commentBody" placeholder="Schrijf een reactie en tag met @naam"></textarea>
                    <div class="flex justify-end">
                        <button type="submit" class="rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white">Plaatsen</button>
                    </div>
                </form>
            </div>

            @if($selectedTask->attachments->isNotEmpty())
                <div class="mt-6">
                    <div class="text-sm font-semibold">Bijlagen</div>
                    <ul class="mt-3 space-y-2 text-sm">
                        @foreach($selectedTask->attachments as $file)
                            <li class="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                                <span class="truncate">{{ $file->original_name }}</span>
                                <a class="text-xs font-semibold text-indigo-700 hover:text-indigo-900" href="{{ asset('storage/'.$file->path) }}" target="_blank" rel="noopener">Open</a>
                            </li>
                        @endforeach
                    </ul>
                </div>
            @endif
        </div>
    @endif

    <script data-navigate-once>
        document.addEventListener('dragstart', (event) => {
            const card = event.target.closest('[data-task-card]');
            if (!card) return;
            event.dataTransfer?.setData('text/task-id', card.dataset.taskId || '');
        });

        document.addEventListener('dragover', (event) => {
            const column = event.target.closest('[data-task-column]');
            if (!column) return;
            event.preventDefault();
        });

        document.addEventListener('drop', (event) => {
            const column = event.target.closest('[data-task-column]');
            if (!column) return;
            event.preventDefault();
            const taskId = event.dataTransfer?.getData('text/task-id');
            const status = column.dataset.status;
            if (!taskId || !status || !window.Livewire) return;
            window.Livewire.dispatch('task-drop', { taskId: Number(taskId), status });
        });
    </script>
</div>
