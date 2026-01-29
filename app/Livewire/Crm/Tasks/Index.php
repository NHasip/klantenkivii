<?php

namespace App\Livewire\Crm\Tasks;

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
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Livewire\Component;
use Livewire\WithFileUploads;

class Index extends Component
{
    use WithFileUploads;

    public string $view = 'list'; // list|board|team
    public ?int $filterProject = null;
    public ?int $filterAssignee = null;
    public ?string $filterStatus = null;
    public ?string $filterPriority = null;
    public string $search = '';

    public string $projectNaam = '';
    public ?string $projectOmschrijving = null;
    public ?string $projectDeadline = null;
    public ?string $projectKleur = null;

    public string $taskTitel = '';
    public ?string $taskOmschrijving = null;
    public ?int $taskProjectId = null;
    public string $taskStatus = 'open';
    public string $taskPrioriteit = 'normaal';
    public ?string $taskDeadline = null;
    public string $taskLabels = '';
    /** @var array<int> */
    public array $taskAssignees = [];
    /** @var array<int, \Livewire\Features\SupportFileUploads\TemporaryUploadedFile> */
    public array $taskAttachments = [];

    public ?int $selectedTaskId = null;
    public string $commentBody = '';

    protected $listeners = ['task-drop' => 'updateTaskStatus'];

    public function createProject(): void
    {
        $data = $this->validate([
            'projectNaam' => ['required', 'string', 'max:255'],
            'projectOmschrijving' => ['nullable', 'string', 'max:2000'],
            'projectDeadline' => ['nullable', 'date'],
            'projectKleur' => ['nullable', 'string', 'max:20'],
        ]);

        TaskProject::create([
            'naam' => $data['projectNaam'],
            'omschrijving' => $data['projectOmschrijving'],
            'deadline' => $data['projectDeadline'],
            'kleur' => $data['projectKleur'],
            'created_by' => auth()->id(),
        ]);

        $this->reset(['projectNaam', 'projectOmschrijving', 'projectDeadline', 'projectKleur']);
        session()->flash('status', 'Project toegevoegd.');
    }

    public function createTask(): void
    {
        $data = $this->validate([
            'taskTitel' => ['required', 'string', 'max:255'],
            'taskOmschrijving' => ['nullable', 'string'],
            'taskProjectId' => ['nullable', 'integer', 'exists:task_projects,id'],
            'taskStatus' => ['required', Rule::enum(TaskStatus::class)],
            'taskPrioriteit' => ['required', Rule::enum(TaskPriority::class)],
            'taskDeadline' => ['nullable', 'date'],
            'taskLabels' => ['nullable', 'string', 'max:1000'],
            'taskAssignees' => ['array'],
            'taskAssignees.*' => ['integer', 'exists:users,id'],
            'taskAttachments.*' => ['file', 'max:10240'],
        ]);

        $task = Task::create([
            'task_project_id' => $data['taskProjectId'],
            'titel' => $data['taskTitel'],
            'omschrijving' => $data['taskOmschrijving'],
            'status' => TaskStatus::from($data['taskStatus']),
            'prioriteit' => TaskPriority::from($data['taskPrioriteit']),
            'deadline' => $data['taskDeadline'],
            'labels' => $data['taskLabels'],
            'created_by' => auth()->id(),
        ]);

        if (! empty($data['taskAssignees'])) {
            $task->assignees()->sync($data['taskAssignees']);
            $assignees = User::query()->whereIn('id', $data['taskAssignees'])->get();
            Notification::send($assignees, new TaskAssigned($task));
        }

        foreach ($this->taskAttachments as $file) {
            $path = $file->store("tasks/{$task->id}", 'public');
            TaskAttachment::create([
                'task_id' => $task->id,
                'user_id' => auth()->id(),
                'original_name' => $file->getClientOriginalName(),
                'path' => $path,
                'size' => $file->getSize() ?? 0,
                'mime' => $file->getMimeType(),
            ]);
        }

        $this->reset([
            'taskTitel',
            'taskOmschrijving',
            'taskProjectId',
            'taskStatus',
            'taskPrioriteit',
            'taskDeadline',
            'taskLabels',
            'taskAssignees',
            'taskAttachments',
        ]);

        session()->flash('status', 'Taak toegevoegd.');
    }

    public function selectTask(int $taskId): void
    {
        $this->selectedTaskId = $taskId;
        $this->commentBody = '';
    }

    public function updateTaskStatus(int $taskId, string $status): void
    {
        $task = Task::findOrFail($taskId);
        if (! TaskStatus::tryFrom($status)) {
            return;
        }
        $task->status = TaskStatus::from($status);
        $task->afgerond_op = $status === TaskStatus::Afgerond->value ? now() : null;
        $task->save();
    }

    public function updateTaskPriority(int $taskId, string $priority): void
    {
        if (! TaskPriority::tryFrom($priority)) {
            return;
        }
        Task::whereKey($taskId)->update(['prioriteit' => TaskPriority::from($priority)]);
    }

    public function updateTaskProject(int $taskId, ?int $projectId): void
    {
        Task::whereKey($taskId)->update(['task_project_id' => $projectId]);
    }

    public function updateTaskDeadline(int $taskId, ?string $deadline): void
    {
        Task::whereKey($taskId)->update(['deadline' => $deadline ?: null]);
    }

    public function addComment(): void
    {
        $data = $this->validate([
            'selectedTaskId' => ['required', 'integer', 'exists:tasks,id'],
            'commentBody' => ['required', 'string', 'max:5000'],
        ]);

        $task = Task::with('assignees')->findOrFail($data['selectedTaskId']);

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => auth()->id(),
            'body' => $data['commentBody'],
        ]);

        $assignees = $task->assignees->where('id', '!=', auth()->id());
        if ($assignees->isNotEmpty()) {
            Notification::send($assignees, new TaskCommented($task, $comment));
        }

        $mentioned = $this->extractMentions($data['commentBody'], $this->users());
        if ($mentioned->isNotEmpty()) {
            Notification::send($mentioned, new TaskMentioned($task, $comment));
        }

        $this->commentBody = '';
        session()->flash('status', 'Reactie geplaatst.');
    }

    /**
     * @return Collection<int, User>
     */
    private function users(): Collection
    {
        return User::query()->orderBy('name')->get();
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
     * @return Collection<int, Task>
     */
    private function filteredTasks(): Collection
    {
        $query = Task::query()
            ->with(['project', 'assignees', 'attachments'])
            ->when($this->filterProject, fn ($q) => $q->where('task_project_id', $this->filterProject))
            ->when($this->filterAssignee, fn ($q) => $q->whereHas('assignees', fn ($sub) => $sub->where('users.id', $this->filterAssignee)))
            ->when($this->filterStatus, fn ($q) => $q->where('status', $this->filterStatus))
            ->when($this->filterPriority, fn ($q) => $q->where('prioriteit', $this->filterPriority))
            ->when($this->search !== '', function ($q) {
                $term = '%'.trim($this->search).'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('titel', 'like', $term)
                        ->orWhere('omschrijving', 'like', $term)
                        ->orWhere('labels', 'like', $term);
                });
            })
            ->orderByRaw('case when deadline is null then 1 else 0 end, deadline asc')
            ->orderBy('sort_order');

        return $query->get();
    }

    public function render()
    {
        $projects = TaskProject::query()->orderBy('naam')->get();
        $users = $this->users();
        $tasks = $this->filteredTasks();

        $tasksByStatus = $tasks->groupBy(fn (Task $task) => $task->status->value);

        $tasksByUser = $users->mapWithKeys(function (User $user) use ($tasks) {
            $userTasks = $tasks->filter(fn (Task $task) => $task->assignees->contains('id', $user->id));
            return [$user->id => $userTasks];
        });

        $unassigned = $tasks->filter(fn (Task $task) => $task->assignees->isEmpty());

        $selectedTask = $this->selectedTaskId ? Task::with(['project', 'assignees', 'attachments', 'comments.author'])->find($this->selectedTaskId) : null;

        return view('livewire.crm.tasks.index', [
            'projects' => $projects,
            'users' => $users,
            'tasks' => $tasks,
            'tasksByStatus' => $tasksByStatus,
            'tasksByUser' => $tasksByUser,
            'unassigned' => $unassigned,
            'selectedTask' => $selectedTask,
            'statusOptions' => TaskStatus::cases(),
            'priorityOptions' => TaskPriority::cases(),
        ])->layout('layouts.crm', ['title' => 'Taken']);
    }
}
