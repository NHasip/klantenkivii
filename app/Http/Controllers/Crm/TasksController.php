<?php

namespace App\Http\Controllers\Crm;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\TaskComment;
use App\Models\TaskProject;
use App\Models\User;
use App\Notifications\TaskAssigned;
use App\Notifications\TaskCommented;
use App\Notifications\TaskMentioned;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TasksController
{
    public function index(Request $request): Response
    {
        return Inertia::render('Crm/Tasks', [
            'initial' => $this->buildTasksPayload($request),
            'filters' => $this->filtersFromRequest($request),
            'urls' => [
                'tasks_old' => route('crm.tasks.old'),
            ],
        ]);
    }

    public function data(Request $request): JsonResponse
    {
        return response()->json($this->buildTasksPayload($request));
    }

    public function show(Task $task): JsonResponse
    {
        $task->load([
            'project:id,naam,kleur',
            'assignees:id,name',
            'attachments',
            'comments.author:id,name',
        ]);
        $task->loadCount(['comments', 'attachments']);

        return response()->json([
            'task' => $this->taskDetails($task),
        ]);
    }

    public function storeProject(Request $request): JsonResponse
    {
        $data = $request->validate([
            'naam' => ['required', 'string', 'max:255'],
            'omschrijving' => ['nullable', 'string', 'max:2000'],
            'deadline' => ['nullable', 'date'],
            'kleur' => ['nullable', 'string', 'max:20'],
        ]);

        $project = TaskProject::create([
            'naam' => $data['naam'],
            'omschrijving' => $data['omschrijving'] ?? null,
            'deadline' => $data['deadline'] ?? null,
            'kleur' => $data['kleur'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'project' => [
                'id' => $project->id,
                'naam' => $project->naam,
                'kleur' => $project->kleur,
                'deadline' => $project->deadline?->toIso8601String(),
            ],
        ]);
    }

    public function storeTask(Request $request): JsonResponse
    {
        $data = $request->validate([
            'titel' => ['required', 'string', 'max:255'],
            'omschrijving' => ['nullable', 'string'],
            'task_project_id' => ['nullable', 'integer', 'exists:task_projects,id'],
            'status' => ['required', Rule::enum(TaskStatus::class)],
            'prioriteit' => ['required', Rule::enum(TaskPriority::class)],
            'deadline' => ['nullable', 'date'],
            'labels' => ['nullable', 'string', 'max:1000'],
            'assignees' => ['array'],
            'assignees.*' => ['integer', 'exists:users,id'],
            'attachments.*' => ['file', 'max:10240'],
        ]);

        $sortOrder = $this->nextSortOrder(
            taskProjectId: $data['task_project_id'] ?? null,
            status: $data['status'],
        );

        $task = Task::create([
            'task_project_id' => $data['task_project_id'] ?? null,
            'titel' => $data['titel'],
            'omschrijving' => $data['omschrijving'] ?? null,
            'status' => TaskStatus::from($data['status']),
            'prioriteit' => TaskPriority::from($data['prioriteit']),
            'deadline' => $data['deadline'] ?? null,
            'labels' => $data['labels'] ?? null,
            'created_by' => $request->user()->id,
            'sort_order' => $sortOrder,
        ]);

        if (! empty($data['assignees'])) {
            $task->assignees()->sync($data['assignees']);
            $assignees = User::query()->whereIn('id', $data['assignees'])->get();
            Notification::send($assignees, new TaskAssigned($task));
        }

        foreach ($request->file('attachments', []) as $file) {
            $path = $file->store("tasks/{$task->id}", 'public');
            TaskAttachment::create([
                'task_id' => $task->id,
                'user_id' => $request->user()->id,
                'original_name' => $file->getClientOriginalName(),
                'path' => $path,
                'size' => $file->getSize() ?? 0,
                'mime' => $file->getMimeType(),
            ]);
        }

        $task->load(['project:id,naam,kleur', 'assignees:id,name']);
        $task->loadCount(['comments', 'attachments']);

        return response()->json([
            'task' => $this->taskSummary($task),
        ]);
    }

    public function updateStatus(Request $request, Task $task): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(TaskStatus::class)],
        ]);

        $task->status = TaskStatus::from($data['status']);
        $task->afgerond_op = $task->status === TaskStatus::Afgerond ? now() : null;
        $task->save();
        $task->loadCount(['comments', 'attachments']);

        return response()->json([
            'task' => $this->taskSummary($task->load(['project:id,naam,kleur', 'assignees:id,name'])),
        ]);
    }

    public function updateTask(Request $request, Task $task): JsonResponse
    {
        $data = $request->validate([
            'titel' => ['nullable', 'string', 'max:255'],
            'omschrijving' => ['nullable', 'string'],
            'labels' => ['nullable', 'string', 'max:1000'],
            'prioriteit' => ['nullable', Rule::enum(TaskPriority::class)],
            'task_project_id' => ['nullable', 'integer', 'exists:task_projects,id'],
            'deadline' => ['nullable', 'date'],
            'status' => ['nullable', Rule::enum(TaskStatus::class)],
            'assignees' => ['nullable', 'array'],
            'assignees.*' => ['integer', 'exists:users,id'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (array_key_exists('titel', $data) && $data['titel'] !== null) {
            $task->titel = $data['titel'];
        }

        if (array_key_exists('omschrijving', $data)) {
            $task->omschrijving = $data['omschrijving'] ?: null;
        }

        if (array_key_exists('labels', $data)) {
            $task->labels = $data['labels'] ?: null;
        }

        if (array_key_exists('prioriteit', $data) && $data['prioriteit'] !== null) {
            $task->prioriteit = TaskPriority::from($data['prioriteit']);
        }

        if (array_key_exists('task_project_id', $data)) {
            $task->task_project_id = $data['task_project_id'] ?: null;
        }

        if (array_key_exists('deadline', $data)) {
            $task->deadline = $data['deadline'] ?: null;
        }

        if (array_key_exists('status', $data) && $data['status'] !== null) {
            $task->status = TaskStatus::from($data['status']);
            $task->afgerond_op = $task->status === TaskStatus::Afgerond ? now() : null;
        }

        if (array_key_exists('sort_order', $data) && $data['sort_order'] !== null) {
            $task->sort_order = (int) $data['sort_order'];
        }

        $task->save();

        if (array_key_exists('assignees', $data) && is_array($data['assignees'])) {
            $existing = $task->assignees()->pluck('users.id')->all();
            $task->assignees()->sync($data['assignees']);
            $newIds = array_values(array_diff($data['assignees'], $existing));
            if (count($newIds) > 0) {
                $assignees = User::query()->whereIn('id', $newIds)->get();
                Notification::send($assignees, new TaskAssigned($task));
            }
        }

        $task->loadCount(['comments', 'attachments']);

        return response()->json([
            'task' => $this->taskSummary($task->load(['project:id,naam,kleur', 'assignees:id,name'])),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'changes' => ['required', 'array', 'min:1'],
            'changes.*.id' => ['required', 'integer', 'exists:tasks,id'],
            'changes.*.task_project_id' => ['nullable', 'integer', 'exists:task_projects,id'],
            'changes.*.status' => ['nullable', Rule::enum(TaskStatus::class)],
            'changes.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['changes'] as $row) {
                $task = Task::find($row['id']);
                if (! $task) {
                    continue;
                }

                $task->task_project_id = $row['task_project_id'] ?? null;
                if (! empty($row['status'])) {
                    $task->status = TaskStatus::from($row['status']);
                    $task->afgerond_op = $task->status === TaskStatus::Afgerond ? now() : null;
                }
                $task->sort_order = (int) $row['sort_order'];
                $task->save();
            }
        });

        return response()->json(['ok' => true]);
    }

    public function storeAttachment(Request $request, Task $task): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $data['file'];
        $path = $file->store("tasks/{$task->id}", 'public');

        $attachment = TaskAttachment::create([
            'task_id' => $task->id,
            'user_id' => $request->user()->id,
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'size' => $file->getSize() ?? 0,
            'mime' => $file->getMimeType(),
        ]);

        return response()->json([
            'attachment' => [
                'id' => $attachment->id,
                'original_name' => $attachment->original_name,
                'size' => $attachment->size,
                'mime' => $attachment->mime,
                'url' => asset('storage/'.$attachment->path),
            ],
        ]);
    }

    public function storeComment(Request $request, Task $task): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        $task->load('assignees');
        $assignees = $task->assignees->where('id', '!=', $request->user()->id);
        if ($assignees->isNotEmpty()) {
            Notification::send($assignees, new TaskCommented($task, $comment));
        }

        $mentioned = $this->extractMentions($data['body'], $this->users());
        if ($mentioned->isNotEmpty()) {
            Notification::send($mentioned, new TaskMentioned($task, $comment));
        }

        $comment->load('author:id,name');

        return response()->json([
            'comment' => [
                'id' => $comment->id,
                'body' => $comment->body,
                'created_at' => $comment->created_at?->toIso8601String(),
                'author' => $comment->author ? [
                    'id' => $comment->author->id,
                    'name' => $comment->author->name,
                ] : null,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildTasksPayload(Request $request): array
    {
        $tasks = $this->filteredTasks($request);

        return [
            'projects' => TaskProject::query()
                ->orderBy('naam')
                ->get(['id', 'naam', 'kleur', 'deadline'])
                ->map(fn (TaskProject $project) => [
                    'id' => $project->id,
                    'naam' => $project->naam,
                    'kleur' => $project->kleur,
                    'deadline' => $project->deadline?->toIso8601String(),
                ])
                ->values(),
            'users' => $this->users()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                ])
                ->values(),
            'tasks' => $tasks->map(fn (Task $task) => $this->taskSummary($task))->values(),
            'statusOptions' => collect(TaskStatus::cases())->map(fn (TaskStatus $status) => $status->value)->values(),
            'priorityOptions' => collect(TaskPriority::cases())->map(fn (TaskPriority $priority) => $priority->value)->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function filtersFromRequest(Request $request): array
    {
        return [
            'project' => $request->query('project'),
            'assignee' => $request->query('assignee'),
            'status' => $request->query('status'),
            'priority' => $request->query('priority'),
            'search' => $request->query('search', ''),
            'sort' => $request->query('sort', 'deadline'),
        ];
    }

    /**
     * @return Collection<int, Task>
     */
    private function filteredTasks(Request $request): Collection
    {
        $sort = (string) $request->query('sort', 'deadline');

        $query = Task::query()
            ->with(['project:id,naam,kleur', 'assignees:id,name'])
            ->withCount(['comments', 'attachments'])
            ->when($request->query('project'), fn ($q, $project) => $q->where('task_project_id', $project))
            ->when($request->query('assignee'), fn ($q, $assignee) => $q->whereHas('assignees', fn ($sub) => $sub->where('users.id', $assignee)))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('priority'), fn ($q, $priority) => $q->where('prioriteit', $priority))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.trim((string) $request->query('search')).'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('titel', 'like', $term)
                        ->orWhere('omschrijving', 'like', $term)
                        ->orWhere('labels', 'like', $term);
                });
            })
            ->when($sort === 'nieuwste', fn ($q) => $q->orderByDesc('created_at'))
            ->when($sort === 'prioriteit', fn ($q) => $q->orderByRaw("FIELD(prioriteit,'kritiek','hoog','normaal','laag')"))
            ->when($sort === 'deadline', fn ($q) => $q->orderByRaw('case when deadline is null then 1 else 0 end, deadline asc'))
            ->orderBy('sort_order')
            ->orderBy('id');

        return $query->get();
    }

    /**
     * @return Collection<int, User>
     */
    private function users(): Collection
    {
        return User::query()->orderBy('name')->get(['id', 'name']);
    }

    /**
     * @param  Collection<int, User>  $users
     * @return Collection<int, User>
     */
    private function extractMentions(string $text, Collection $users): Collection
    {
        $lower = Str::lower($text);
        $hits = collect();

        foreach ($users as $user) {
            $name = Str::lower($user->name);
            $first = Str::lower(Str::before($user->name, ' '));
            $compact = Str::lower(Str::replace(' ', '', $user->name));

            $needles = array_filter([
                '@'.$name,
                '@'.$first,
                '@'.$compact,
            ]);

            foreach ($needles as $needle) {
                if ($needle !== '@' && str_contains($lower, $needle)) {
                    $hits->push($user);
                    break;
                }
            }
        }

        return $hits->unique('id')->where('id', '!=', auth()->id());
    }

    /**
     * @return array<string, mixed>
     */
    private function taskSummary(Task $task): array
    {
        return [
            'id' => $task->id,
            'titel' => $task->titel,
            'omschrijving' => $task->omschrijving,
            'status' => $task->status?->value,
            'prioriteit' => $task->prioriteit?->value,
            'deadline' => $task->deadline?->toIso8601String(),
            'labels' => $task->labels,
            'task_project_id' => $task->task_project_id,
            'sort_order' => (int) $task->sort_order,
            'created_at' => $task->created_at?->toIso8601String(),
            'project' => $task->project ? [
                'id' => $task->project->id,
                'naam' => $task->project->naam,
                'kleur' => $task->project->kleur,
            ] : null,
            'assignees' => $task->assignees->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
            ])->values(),
            'counts' => [
                'comments' => (int) ($task->comments_count ?? 0),
                'attachments' => (int) ($task->attachments_count ?? 0),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function taskDetails(Task $task): array
    {
        return [
            ...$this->taskSummary($task),
            'comments' => $task->comments
                ->sortBy('created_at')
                ->map(fn (TaskComment $comment) => [
                    'id' => $comment->id,
                    'body' => $comment->body,
                    'created_at' => $comment->created_at?->toIso8601String(),
                    'author' => $comment->author ? [
                        'id' => $comment->author->id,
                        'name' => $comment->author->name,
                    ] : null,
                ])
                ->values(),
            'attachments' => $task->attachments
                ->map(fn (TaskAttachment $file) => [
                    'id' => $file->id,
                    'original_name' => $file->original_name,
                    'size' => $file->size,
                    'mime' => $file->mime,
                    'url' => asset('storage/'.$file->path),
                ])
                ->values(),
        ];
    }

    private function nextSortOrder(?int $taskProjectId, string $status): int
    {
        $max = Task::query()
            ->where('status', $status)
            ->where('task_project_id', $taskProjectId)
            ->max('sort_order');

        return ((int) $max) + 10;
    }
}
