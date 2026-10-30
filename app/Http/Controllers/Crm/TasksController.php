<?php

namespace App\Http\Controllers\Crm;

use App\Enums\ActivityType;
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Activity;
use App\Models\GarageCompany;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\TaskComment;
use App\Models\TaskProject;
use App\Models\User;
use App\Services\Security\FileScanService;
use App\Notifications\TaskAssigned;
use App\Notifications\TaskCommented;
use App\Notifications\TaskMentioned;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class TasksController
{
    private const ATTACHMENT_EXTENSIONS = [
        'pdf', 'jpg', 'jpeg', 'png', 'webp', 'txt', 'csv', 'xls', 'xlsx', 'doc', 'docx',
    ];

    private const ATTACHMENT_MIME_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    public function index(Request $request): Response
    {
        return Inertia::render('Crm/Tasks', [
            'initial' => $this->buildTasksPayload($request),
            'filters' => $this->filtersFromRequest($request),
            'customerFilter' => $this->customerOption($request->query('klant')),
            'urls' => [],
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
            ...$this->customerRelation(),
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
        ], $this->validationMessages(), $this->validationAttributes());

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
            'garage_company_id' => ['nullable', 'integer', 'exists:garage_companies,id'],
            'status' => ['required', Rule::enum(TaskStatus::class)],
            'prioriteit' => ['required', Rule::enum(TaskPriority::class)],
            'deadline' => ['nullable', 'date'],
            'labels' => ['nullable', 'string', 'max:1000'],
            'assignees' => ['array'],
            'assignees.*' => ['integer', 'exists:users,id'],
            'attachments.*' => $this->attachmentValidationRules(),
        ], $this->validationMessages(), $this->validationAttributes());

        $sortOrder = $this->nextSortOrder(
            taskProjectId: $data['task_project_id'] ?? null,
            status: $data['status'],
        );

        $task = Task::create([
            'task_project_id' => $data['task_project_id'] ?? null,
            ...(Task::supportsCustomer() ? ['garage_company_id' => $data['garage_company_id'] ?? null] : []),
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
            $this->storeTaskAttachment($task, $file, (int) $request->user()->id);
        }

        $task->load(['project:id,naam,kleur', 'assignees:id,name', ...$this->customerRelation()]);
        $task->loadCount(['comments', 'attachments']);

        return response()->json([
            'task' => $this->taskSummary($task),
        ]);
    }

    public function updateStatus(Request $request, Task $task): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(TaskStatus::class)],
        ], $this->validationMessages(), $this->validationAttributes());

        $this->applyStatus($task, TaskStatus::from($data['status']));
        $task->save();
        $task->loadCount(['comments', 'attachments']);

        return response()->json([
            'task' => $this->taskSummary($task->load(['project:id,naam,kleur', 'assignees:id,name', ...$this->customerRelation()])),
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
            'garage_company_id' => ['nullable', 'integer', 'exists:garage_companies,id'],
            'deadline' => ['nullable', 'date'],
            'status' => ['nullable', Rule::enum(TaskStatus::class)],
            'assignees' => ['nullable', 'array'],
            'assignees.*' => ['integer', 'exists:users,id'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ], $this->validationMessages(), $this->validationAttributes());

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

        if (array_key_exists('garage_company_id', $data) && Task::supportsCustomer()) {
            $task->garage_company_id = $data['garage_company_id'] ?: null;
        }

        if (array_key_exists('deadline', $data)) {
            $task->deadline = $data['deadline'] ?: null;
        }

        if (array_key_exists('status', $data) && $data['status'] !== null) {
            $this->applyStatus($task, TaskStatus::from($data['status']));
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
            'task' => $this->taskSummary($task->load(['project:id,naam,kleur', 'assignees:id,name', ...$this->customerRelation()])),
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
        ], $this->validationMessages(), $this->validationAttributes());

        DB::transaction(function () use ($data) {
            foreach ($data['changes'] as $row) {
                $task = Task::find($row['id']);
                if (! $task) {
                    continue;
                }

                $task->task_project_id = $row['task_project_id'] ?? null;
                if (! empty($row['status'])) {
                    $this->applyStatus($task, TaskStatus::from($row['status']));
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
            'file' => ['required', ...$this->attachmentValidationRules()],
        ], $this->validationMessages(), $this->validationAttributes());

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $data['file'];
        $attachment = $this->storeTaskAttachment($task, $file, (int) $request->user()->id);

        return response()->json([
            'attachment' => [
                'id' => $attachment->id,
                'original_name' => $attachment->original_name,
                'size' => $attachment->size,
                'mime' => $attachment->mime,
                'url' => route('crm.tasks.attachments.download', ['attachment' => $attachment->id]),
            ],
        ]);
    }

    public function downloadAttachment(TaskAttachment $attachment)
    {
        if (! $attachment->task()->exists()) {
            abort(404);
        }

        $fileName = $attachment->original_name ?: basename($attachment->path);

        if (Storage::disk('local')->exists($attachment->path)) {
            return Storage::disk('local')->download($attachment->path, $fileName);
        }

        if (Storage::disk('public')->exists($attachment->path)) {
            return Storage::disk('public')->download($attachment->path, $fileName);
        }

        abort(404);
    }

    public function storeComment(Request $request, Task $task): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ], $this->validationMessages(), $this->validationAttributes());

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
     * Kleine zoekfunctie voor de klantkiezer (max 20 resultaten).
     */
    public function customers(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q', ''));

        $results = GarageCompany::query()
            ->when($term !== '', function ($q) use ($term) {
                $like = '%'.$term.'%';
                $q->where(function ($inner) use ($like, $term) {
                    $inner->where('bedrijfsnaam', 'like', $like)
                        ->orWhere('plaats', 'like', $like);
                    if (ctype_digit($term)) {
                        $inner->orWhere('id', (int) $term);
                    }
                });
            })
            ->orderBy('bedrijfsnaam')
            ->limit(20)
            ->get(['id', 'bedrijfsnaam', 'plaats'])
            ->map(fn (GarageCompany $company) => $this->customerPayload($company))
            ->values();

        return response()->json(['customers' => $results]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildTasksPayload(Request $request): array
    {
        $tasks = $this->filteredTasks($request);

        return [
            'appointments' => $request->boolean('afspraken') ? $this->openAppointments($request) : null,
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
            'prioriteit' => $this->priorityFilter($request),
            'search' => $request->query('search', ''),
            'sort' => $request->query('sort', 'deadline'),
            'klant' => $request->query('klant'),
        ];
    }

    /**
     * Open klanttaken en -afspraken (Activity type taak/afspraak), alleen-lezen overzicht.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function openAppointments(Request $request): Collection
    {
        $now = now();

        return Activity::query()
            ->with(['garageCompany:id,bedrijfsnaam,plaats'])
            ->whereIn('type', [ActivityType::Taak->value, ActivityType::Afspraak->value])
            ->whereNull('done_at')
            ->whereHas('garageCompany')
            ->when($request->query('klant'), fn ($q, $klant) => $q->where('garage_company_id', (int) $klant))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.trim((string) $request->query('search')).'%';
                $q->where(fn ($inner) => $inner->where('titel', 'like', $term)->orWhere('inhoud', 'like', $term));
            })
            ->orderByRaw('case when due_at is null then 1 else 0 end, due_at asc')
            ->orderBy('id')
            ->limit(200)
            ->get()
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'type' => $activity->type?->value,
                'titel' => $activity->titel,
                'inhoud' => $activity->inhoud,
                'due_at' => $activity->due_at?->toIso8601String(),
                'overdue' => $activity->due_at !== null && $activity->due_at->lt($now),
                'customer' => $activity->garageCompany ? $this->customerPayload($activity->garageCompany) : null,
                'done_url' => route('crm.garage_companies.tasks.done', [
                    'garageCompany' => $activity->garage_company_id,
                    'activity' => $activity->id,
                ]),
            ])
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    private function customerPayload(GarageCompany $company): array
    {
        return [
            'id' => $company->id,
            'naam' => $company->bedrijfsnaam,
            'plaats' => $company->plaats,
            'url' => route('crm.garage_companies.show', ['garageCompany' => $company->id]),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function customerOption(mixed $id): ?array
    {
        $id = (int) $id;
        if ($id <= 0) {
            return null;
        }

        $company = GarageCompany::query()->withoutGlobalScope('not_deleted')->find($id, ['id', 'bedrijfsnaam', 'plaats']);

        return $company ? $this->customerPayload($company) : null;
    }

    /**
     * Eager-load voor de klant, alleen als de kolom al bestaat (migratie gedraaid).
     *
     * @return array<string, \Closure>
     */
    private function customerRelation(): array
    {
        if (! Task::supportsCustomer()) {
            return [];
        }

        return [
            'garageCompany' => fn ($q) => $q->withoutGlobalScope('not_deleted')->select(['id', 'bedrijfsnaam', 'plaats']),
        ];
    }

    /**
     * @return Collection<int, Task>
     */
    /**
     * Prioriteitsfilter uit de URL: "prioriteit", met "priority" als fallback voor oude links.
     */
    private function priorityFilter(Request $request): ?string
    {
        $value = $request->query('prioriteit') ?? $request->query('priority');

        return is_string($value) && $value !== '' ? $value : null;
    }

    private function filteredTasks(Request $request): Collection
    {
        $sort = (string) $request->query('sort', 'deadline');

        $query = Task::query()
            ->with(['project:id,naam,kleur', 'assignees:id,name', ...$this->customerRelation()])
            ->withCount(['comments', 'attachments'])
            ->when(Task::supportsCustomer() && $request->query('klant'), fn ($q) => $q->where('garage_company_id', (int) $request->query('klant')))
            ->when($request->query('project'), fn ($q, $project) => $q->where('task_project_id', $project))
            ->when($request->query('assignee'), fn ($q, $assignee) => $q->whereHas('assignees', fn ($sub) => $sub->where('users.id', $assignee)))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($this->priorityFilter($request), fn ($q, $priority) => $q->where('prioriteit', $priority))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.trim((string) $request->query('search')).'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('titel', 'like', $term)
                        ->orWhere('omschrijving', 'like', $term)
                        ->orWhere('labels', 'like', $term);
                    if (Task::supportsCustomer()) {
                        $inner->orWhereHas('garageCompany', fn ($c) => $c->where('bedrijfsnaam', 'like', $term));
                    }
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
        // Alleen CRM-gebruikers als keuze; klantlogins blijven gekoppeld aan bestaande
        // taken maar verschijnen niet in de keuzelijst. Dubbele namen tonen we één keer.
        return User::query()
            ->crmUsers()
            ->orderBy('name')
            ->orderByDesc('active')
            ->orderBy('id')
            ->get(['id', 'name', 'active'])
            ->unique(fn (User $user) => Str::lower(trim((string) $user->name)))
            ->values();
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
            'garage_company_id' => Task::supportsCustomer() ? $task->garage_company_id : null,
            'customer' => Task::supportsCustomer() && $task->relationLoaded('garageCompany') && $task->garageCompany
                ? $this->customerPayload($task->garageCompany)
                : null,
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
                    'url' => route('crm.tasks.attachments.download', ['attachment' => $file->id]),
                ])
                ->values(),
        ];
    }

    /**
     * Zet de status en werkt afgerond_op alleen bij als de status echt wijzigt,
     * zodat slepen/herordenen de afrond-datum niet overschrijft.
     */
    private function applyStatus(Task $task, TaskStatus $status): void
    {
        $previous = $task->status;
        $task->status = $status;

        if ($previous === $status && ($status !== TaskStatus::Afgerond || $task->afgerond_op !== null)) {
            return;
        }

        $task->afgerond_op = $status === TaskStatus::Afgerond ? now() : null;
    }

    /**
     * Nederlandstalige validatieberichten (de app heeft geen lang/nl bestanden).
     *
     * @return array<string, mixed>
     */
    private function validationMessages(): array
    {
        return [
            'required' => ':Attribute is verplicht.',
            'string' => ':Attribute moet tekst zijn.',
            'integer' => ':Attribute moet een geheel getal zijn.',
            'array' => ':Attribute is ongeldig.',
            'date' => ':Attribute is geen geldige datum.',
            'exists' => 'De gekozen waarde voor :attribute bestaat niet (meer).',
            'enum' => 'De gekozen waarde voor :attribute is ongeldig.',
            'file' => ':Attribute moet een bestand zijn.',
            'uploaded' => ':Attribute kon niet worden geüpload. Mogelijk is het bestand te groot.',
            'mimes' => ':Attribute heeft een niet toegestaan bestandstype. Toegestaan: :values.',
            'mimetypes' => ':Attribute heeft een niet toegestaan bestandstype.',
            'min' => [
                'numeric' => ':Attribute moet minimaal :min zijn.',
                'array' => ':Attribute moet minimaal :min item(s) bevatten.',
                'string' => ':Attribute moet minimaal :min tekens bevatten.',
                'file' => ':Attribute moet minimaal :min KB zijn.',
            ],
            'max' => [
                'numeric' => ':Attribute mag niet groter zijn dan :max.',
                'array' => ':Attribute mag niet meer dan :max items bevatten.',
                'string' => ':Attribute mag niet langer zijn dan :max tekens.',
                'file' => ':Attribute mag niet groter zijn dan 10 MB.',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function validationAttributes(): array
    {
        return [
            'naam' => 'naam',
            'omschrijving' => 'omschrijving',
            'deadline' => 'deadline',
            'kleur' => 'kleur',
            'titel' => 'titel',
            'task_project_id' => 'project',
            'garage_company_id' => 'klant',
            'status' => 'status',
            'prioriteit' => 'prioriteit',
            'labels' => 'labels',
            'assignees' => 'toegewezen personen',
            'assignees.*' => 'toegewezen persoon',
            'attachments.*' => 'bijlage',
            'file' => 'bestand',
            'body' => 'reactie',
            'sort_order' => 'volgorde',
            'changes' => 'wijzigingen',
            'changes.*.id' => 'taak',
            'changes.*.task_project_id' => 'project',
            'changes.*.status' => 'status',
            'changes.*.sort_order' => 'volgorde',
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

    /**
     * @return array<int, string>
     */
    private function attachmentValidationRules(): array
    {
        return [
            'file',
            'max:10240',
            'mimes:'.implode(',', self::ATTACHMENT_EXTENSIONS),
            'mimetypes:'.implode(',', self::ATTACHMENT_MIME_TYPES),
        ];
    }

    private function storeTaskAttachment(Task $task, UploadedFile $file, int $userId): TaskAttachment
    {
        $path = $file->store("tasks/{$task->id}", 'local');
        $absolutePath = Storage::disk('local')->path($path);

        try {
            app(FileScanService::class)->scanOrFail($absolutePath);
        } catch (ValidationException $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        } catch (Throwable $e) {
            Storage::disk('local')->delete($path);
            throw ValidationException::withMessages([
                'file' => 'Upload geweigerd: virusscan kon niet worden uitgevoerd.',
            ]);
        }

        return TaskAttachment::create([
            'task_id' => $task->id,
            'user_id' => $userId,
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'size' => $file->getSize() ?? 0,
            'mime' => $file->getMimeType(),
        ]);
    }
}
