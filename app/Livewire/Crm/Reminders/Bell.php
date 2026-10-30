<?php

namespace App\Livewire\Crm\Reminders;

use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Enums\ActivityType;
use App\Enums\GarageCompanyStatus;
use App\Enums\SepaMandateStatus;
use App\Enums\TaskStatus;
use App\Models\Activity;
use App\Models\GarageCompany;
use App\Models\Reminder;
use App\Models\Task;
use Illuminate\Support\Facades\Cache;
use Livewire\Component;
use Throwable;

class Bell extends Component
{
    // Open/dicht-status van het paneel staat in Alpine (client-side), zodat
    // bel en gebruikersmenu elkaar kunnen sluiten en Escape direct werkt.

    public function dismiss(int $reminderId): void
    {
        Reminder::query()
            ->where('id', $reminderId)
            ->where('user_id', auth()->id())
            ->update([
                'popup_dismissed_at' => now(),
                'status' => ReminderStatus::Verzonden,
            ]);
    }

    public function render()
    {
        $reminders = Reminder::query()
            ->where('user_id', auth()->id())
            ->where('status', ReminderStatus::Gepland)
            ->whereNull('popup_dismissed_at')
            ->where('remind_at', '<=', now())
            ->whereIn('channel', [ReminderChannel::Popup, ReminderChannel::Beide])
            ->orderBy('remind_at')
            ->limit(8)
            ->get();

        $signals = $this->signals();

        return view('livewire.crm.reminders.bell', [
            'reminders' => $reminders,
            'signals' => $signals,
            'count' => $reminders->count() + array_sum(array_column($signals, 'count')),
        ]);
    }

    /**
     * Extra signalen naast reminders. Kort gecachet (60s per gebruiker) omdat de bel elke 30s pollt.
     *
     * @return list<array{key: string, title: string, count: int, link: ?string, linkLabel: ?string, items: list<array{label: string, meta: ?string, url: string, overdue: bool}>}>
     */
    private function signals(): array
    {
        $userId = (int) auth()->id();

        try {
            return Cache::remember('crm-bell-signals:'.$userId, 60, fn () => $this->buildSignals($userId));
        } catch (Throwable $e) {
            report($e);

            return [];
        }
    }

    private function buildSignals(int $userId): array
    {
        $now = now();
        $signals = [];

        // 1. Mijn verlopen taken.
        $taskQuery = Task::query()
            ->where('status', '!=', TaskStatus::Afgerond->value)
            ->whereNotNull('deadline')
            ->where('deadline', '<', $now)
            ->where(function ($q) use ($userId) {
                $q->whereHas('assignees', fn ($a) => $a->where('users.id', $userId))
                    ->orWhere(function ($own) use ($userId) {
                        $own->whereDoesntHave('assignees')->where('created_by', $userId);
                    });
            });
        $taskCount = (clone $taskQuery)->count();
        if ($taskCount > 0) {
            $signals[] = [
                'key' => 'taken',
                'title' => 'Mijn taken te laat',
                'count' => $taskCount,
                'link' => route('crm.tasks.index', ['assignee' => $userId, 'weergave' => 'lijst']),
                'linkLabel' => 'Alle taken',
                'items' => $taskQuery->orderBy('deadline')->limit(5)->get(['id', 'titel', 'deadline'])
                    ->map(fn (Task $task) => [
                        'label' => $task->titel,
                        'meta' => 'Deadline '.$task->deadline?->format('d-m-Y H:i'),
                        'url' => route('crm.tasks.index', ['taak' => $task->id]),
                        'overdue' => true,
                    ])->all(),
            ];
        }

        // 2. Klanttaken en -afspraken vandaag of te laat.
        $activityQuery = Activity::query()
            ->whereIn('type', [ActivityType::Taak->value, ActivityType::Afspraak->value])
            ->whereNull('done_at')
            ->whereNotNull('due_at')
            ->where('due_at', '<=', $now->copy()->endOfDay())
            ->whereHas('garageCompany');
        $activityCount = (clone $activityQuery)->count();
        if ($activityCount > 0) {
            $signals[] = [
                'key' => 'afspraken',
                'title' => 'Klantafspraken vandaag of te laat',
                'count' => $activityCount,
                'link' => route('crm.tasks.index', ['afspraken' => 1, 'weergave' => 'lijst']),
                'linkLabel' => 'Alle klantafspraken',
                'items' => $activityQuery->with('garageCompany:id,bedrijfsnaam')->orderBy('due_at')->limit(5)
                    ->get(['id', 'garage_company_id', 'titel', 'due_at'])
                    ->map(fn (Activity $activity) => [
                        'label' => $activity->titel,
                        'meta' => trim(($activity->garageCompany?->bedrijfsnaam ?? '').' · '.$activity->due_at?->format('d-m-Y H:i'), ' ·'),
                        'url' => route('crm.garage_companies.show', ['garageCompany' => $activity->garage_company_id, 'tab' => 'taken_afspraken']),
                        'overdue' => $activity->due_at?->lt($now) ?? false,
                    ])->all(),
            ];
        }

        // 3. Demo's die binnen 3 dagen eindigen of al verlopen zijn.
        $demos = GarageCompany::withEffectiveDemoEndBetween([
            GarageCompanyStatus::DemoAangevraagd->value,
            GarageCompanyStatus::DemoGepland->value,
            GarageCompanyStatus::Proefperiode->value,
        ], null, $now->copy()->addDays(3)->endOfDay());
        $demoCount = $demos->count();
        if ($demoCount > 0) {
            $signals[] = [
                'key' => 'demos',
                'title' => "Demo's die (bijna) aflopen",
                'count' => $demoCount,
                'link' => null,
                'linkLabel' => null,
                'items' => $demos->take(5)
                    ->map(function (GarageCompany $company) use ($now) {
                        $end = $company->effectiveDemoEnd();

                        return [
                            'label' => $company->bedrijfsnaam,
                            'meta' => ($end->lt($now) ? 'Verlopen op ' : 'Eindigt op ').$end->format('d-m-Y').($company->demoEndIsComputed() ? ' (berekend)' : ''),
                            'url' => route('crm.garage_companies.show', ['garageCompany' => $company->id, 'tab' => 'demo_status']),
                            'overdue' => $end->lt($now),
                        ];
                    })->values()->all(),
            ];
        }

        // 4. Actieve klanten zonder actief SEPA-mandaat (alleen aantal).
        // Zelfde definitie als dashboard en rapportages.
        $mandateCount = \App\Services\Crm\SepaChecklist::activeCompaniesWithIssues()->count();
        if ($mandateCount > 0) {
            $signals[] = [
                'key' => 'mandaten',
                'title' => 'Actieve klanten met incomplete SEPA',
                'count' => $mandateCount,
                'link' => route('crm.garage_companies.index', ['status' => GarageCompanyStatus::Actief->value]),
                'linkLabel' => 'Naar klantenlijst',
                'items' => [],
            ];
        }

        return $signals;
    }
}

