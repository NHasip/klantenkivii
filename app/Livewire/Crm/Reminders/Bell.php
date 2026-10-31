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
            ->with('garageCompany:id,bedrijfsnaam')
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
     * @return list<array{key: string, title: string, count: int, link: ?string, linkLabel: ?string, items: list<array{label: string, meta: ?string, url: string, overdue: bool, at?: ?string, avatar?: ?string, sub?: ?string}>}>
     */
    private function signals(): array
    {
        $userId = (int) auth()->id();

        try {
            return Cache::remember('crm-bell-signals:v3:'.$userId, 60, fn () => $this->buildSignals($userId));
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
                        'at' => $task->deadline?->toIso8601String(),
                        'avatar' => null,
                        'sub' => null,
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
                        'meta' => implode(' · ', array_filter([
                            $activity->garageCompany?->bedrijfsnaam,
                            $activity->due_at?->format('d-m-Y H:i'),
                        ], fn ($part) => filled($part))) ?: null,
                        'url' => route('crm.garage_companies.show', ['garageCompany' => $activity->garage_company_id, 'tab' => 'taken_afspraken']),
                        'overdue' => $activity->due_at?->lt($now) ?? false,
                        'at' => $activity->due_at?->toIso8601String(),
                        'avatar' => $activity->garageCompany?->bedrijfsnaam,
                        'sub' => $activity->garageCompany?->bedrijfsnaam,
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
                            // De meta zegt al "Verlopen op", geen extra "Te laat"-label nodig.
                            'overdueLabel' => false,
                            'at' => null,
                            'avatar' => $company->bedrijfsnaam,
                            'sub' => null,
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

        // 5. Machtigingen via kivii.nl: nieuw ontvangen (7 dagen) en nog te koppelen/verwerken.
        if (\App\Services\Sepa\MandateRequestService::available()) {
            $isAdmin = (bool) auth()->user()?->isAdmin();
            $overview = $isAdmin ? route('crm.mandate_requests.index') : null;
            $received = \App\Models\SepaMandateRequest::query()
                ->where('status', \App\Models\SepaMandateRequest::STATUS_VERWERKT)
                ->where('completed_at', '>=', $now->copy()->subDays(7))
                ->with('garageCompany:id,bedrijfsnaam');
            $receivedCount = (clone $received)->count();
            if ($receivedCount > 0) {
                $signals[] = [
                    'key' => 'machtiging_ontvangen',
                    'title' => 'Nieuwe machtiging ontvangen',
                    'count' => $receivedCount,
                    'link' => $overview,
                    'linkLabel' => $overview ? 'Alle machtigingen' : null,
                    'items' => $received->latest('completed_at')->limit(5)->get()
                        ->map(fn ($r) => [
                            'label' => $r->garageCompany?->bedrijfsnaam ?? $r->kenmerk,
                            'meta' => 'Kenmerk '.$r->kenmerk.' · '.$r->completed_at?->format('d-m-Y H:i'),
                            'url' => $r->garage_company_id
                                ? route('crm.garage_companies.show', ['garageCompany' => $r->garage_company_id, 'tab' => 'abonnement'])
                                : ($overview ?? route('dashboard')),
                            'overdue' => false,
                            'at' => $r->completed_at?->toIso8601String(),
                            'avatar' => $r->garageCompany?->bedrijfsnaam,
                            'sub' => null,
                        ])->all(),
                ];
            }
            $pendingCount = \App\Models\SepaMandateRequest::query()
                ->whereIn('status', [\App\Models\SepaMandateRequest::STATUS_ONTVANGEN, \App\Models\SepaMandateRequest::STATUS_FOUT])
                ->count();
            if ($pendingCount > 0) {
                $signals[] = [
                    'key' => 'machtiging_koppelen',
                    'title' => 'Machtiging moet gekoppeld worden',
                    'count' => $pendingCount,
                    'link' => $overview,
                    'linkLabel' => $overview ? 'Naar machtigingen' : null,
                    'summary' => $pendingCount === 1 ? 'machtiging wacht op koppelen of verwerken' : 'machtigingen wachten op koppelen of verwerken',
                    'items' => [],
                ];
            }
        }

        return $signals;
    }
}

