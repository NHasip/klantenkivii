<?php

namespace App\Livewire\Crm\GarageCompanies\Tabs;

use App\Enums\ActivityType;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Models\Activity;
use App\Models\GarageCompany;
use App\Models\Reminder;
use Illuminate\Validation\Rule;
use Livewire\Component;

class TasksAppointments extends Component
{
    public int $garageCompanyId;

    public string $type = 'taak'; // taak|afspraak
    public string $titel = '';
    public ?string $inhoud = null;
    public ?string $due_at = null;

    public bool $createReminder = false;
    public ?string $remind_at = null;
    public string $channel = 'popup';

    public function mount(int $garageCompanyId): void
    {
        $this->garageCompanyId = $garageCompanyId;
    }

    public function add(): void
    {
        $data = $this->validate([
            'type' => ['required', Rule::enum(ActivityType::class)],
            'titel' => ['required', 'string', 'max:255'],
            'inhoud' => ['nullable', 'string'],
            'due_at' => ['nullable', 'date'],
            'createReminder' => ['boolean'],
            'remind_at' => ['nullable', 'date'],
            'channel' => ['required', Rule::enum(ReminderChannel::class)],
        ]);

        if (! in_array($data['type'], [ActivityType::Taak->value, ActivityType::Afspraak->value], true)) {
            $data['type'] = ActivityType::Taak->value;
        }

        $activity = Activity::create([
            'garage_company_id' => $this->garageCompanyId,
            'type' => ActivityType::from($data['type']),
            'titel' => $data['titel'],
            'inhoud' => $data['inhoud'],
            'due_at' => $data['due_at'],
            'created_by' => auth()->id(),
        ]);

        if ($data['createReminder']) {
            Reminder::create([
                'user_id' => auth()->id(),
                'garage_company_id' => $this->garageCompanyId,
                'activity_id' => $activity->id,
                'titel' => $data['titel'],
                'message' => $data['inhoud'],
                'remind_at' => $data['remind_at'] ?? $data['due_at'] ?? now()->addHour(),
                'channel' => ReminderChannel::from($data['channel']),
                'status' => ReminderStatus::Gepland,
            ]);
        }

        $this->resetForm();
        session()->flash('status', 'Toegevoegd.');
    }

    public function markDone(int $activityId): void
    {
        Activity::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->whereKey($activityId)
            ->update(['done_at' => now()]);

        session()->flash('status', 'Afgehandeld.');
    }

    private function resetForm(): void
    {
        $this->type = ActivityType::Taak->value;
        $this->titel = '';
        $this->inhoud = null;
        $this->due_at = null;
        $this->createReminder = false;
        $this->remind_at = null;
        $this->channel = ReminderChannel::Popup->value;
    }

    public function render()
    {
        $company = GarageCompany::findOrFail($this->garageCompanyId);

        $taken = Activity::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->where('type', ActivityType::Taak)
            ->whereNull('done_at')
            ->orderByRaw('case when due_at is null then 1 else 0 end, due_at asc')
            ->limit(20)
            ->get();

        $afspraken = Activity::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->where('type', ActivityType::Afspraak)
            ->whereNull('done_at')
            ->orderByRaw('case when due_at is null then 1 else 0 end, due_at asc')
            ->limit(20)
            ->get();

        return view('livewire.crm.garage-companies.tabs.tasks-appointments', [
            'company' => $company,
            'taken' => $taken,
            'afspraken' => $afspraken,
            'channels' => ReminderChannel::cases(),
        ]);
    }
}

