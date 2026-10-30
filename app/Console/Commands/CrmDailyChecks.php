<?php

namespace App\Console\Commands;

use App\Enums\GarageCompanyStatus;
use App\Enums\SepaMandateStatus;
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Enums\UserRole;
use App\Models\GarageCompany;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Dagelijkse CRM-controles. Maakt alleen interne taken aan (geen e-mails naar klanten).
 * Idempotent: per klant en marker wordt geen tweede taak aangemaakt.
 */
class CrmDailyChecks extends Command
{
    protected $signature = 'crm:daily-checks {--dry-run : Alleen tonen wat er aangemaakt zou worden}';

    protected $description = 'Maak interne taken aan voor demo-einde, demo-opvolging en klanten zonder actief mandaat.';

    private const DEMO_STATUSES = [
        GarageCompanyStatus::DemoAangevraagd->value,
        GarageCompanyStatus::DemoGepland->value,
        GarageCompanyStatus::Proefperiode->value,
    ];

    private ?int $fallbackUserId = null;

    private int $created = 0;

    public function handle(): int
    {
        if (! Task::supportsCustomer()) {
            $this->warn('Kolom tasks.garage_company_id ontbreekt. Draai eerst de migraties.');

            return self::SUCCESS;
        }

        $this->fallbackUserId = User::query()
            ->where('role', UserRole::Admin->value)
            ->where('active', true)
            ->orderBy('id')
            ->value('id');

        if (! $this->fallbackUserId) {
            $this->warn('Geen actieve admin gevonden; taken worden niet aangemaakt.');

            return self::SUCCESS;
        }

        $today = now()->startOfDay();

        $this->demoEndsOn($today->copy()->addDays(3), 'demo-eind-3d', 'Demo eindigt over 3 dagen', 'De demo van deze klant eindigt over 3 dagen. Neem contact op over de overstap naar een abonnement.');
        $this->demoEndsOn($today->copy(), 'demo-eind-vandaag', 'Demo eindigt vandaag', 'De demo van deze klant eindigt vandaag. Bespreek het vervolg.');
        $this->demoFollowUp($today->copy()->subDays(2));
        $this->activeWithoutMandate($today);

        $this->info(($this->option('dry-run') ? 'Zou aanmaken: ' : 'Aangemaakt: ').$this->created);

        return self::SUCCESS;
    }

    private function demoEndsOn(CarbonInterface $day, string $marker, string $title, string $body): void
    {
        // Effectieve einddatum: opgeslagen demo_eind_op, anders berekend uit start + duur.
        GarageCompany::withEffectiveDemoEndBetween(self::DEMO_STATUSES, $day->copy()->startOfDay(), $day->copy()->endOfDay())
            ->sortBy('id')
            ->each(fn (GarageCompany $company) => $this->createOnce(
                $company,
                $marker.':'.$day->toDateString(),
                $title.': '.$company->bedrijfsnaam,
                $body.' Einddatum: '.$company->effectiveDemoEnd()?->format('d-m-Y').($company->demoEndIsComputed() ? ' (berekend)' : '').'.',
                TaskPriority::Hoog,
            ));
    }

    private function demoFollowUp(CarbonInterface $startDay): void
    {
        // Startdatum demo: proefperiode_start, anders demo_aangevraagd_op.
        GarageCompany::query()
            ->whereIn('status', self::DEMO_STATUSES)
            ->where(function ($q) use ($startDay) {
                $q->whereBetween('proefperiode_start', [$startDay->copy()->startOfDay(), $startDay->copy()->endOfDay()])
                    ->orWhere(function ($inner) use ($startDay) {
                        $inner->whereNull('proefperiode_start')
                            ->whereBetween('demo_aangevraagd_op', [$startDay->copy()->startOfDay(), $startDay->copy()->endOfDay()]);
                    });
            })
            ->orderBy('id')
            ->get(['id', 'bedrijfsnaam'])
            ->each(fn (GarageCompany $company) => $this->createOnce(
                $company,
                'demo-opvolging:'.$startDay->toDateString(),
                'Demo opvolgen: '.$company->bedrijfsnaam,
                'De demo is 2 dagen geleden gestart. Vraag hoe het bevalt en of er vragen zijn.',
                TaskPriority::Normaal,
            ));
    }

    private function activeWithoutMandate(CarbonInterface $today): void
    {
        // Wekelijks: alleen op maandag, of bij --dry-run altijd tonen.
        if (! $today->isMonday() && ! $this->option('dry-run')) {
            return;
        }

        GarageCompany::query()
            ->where('status', GarageCompanyStatus::Actief->value)
            ->whereDoesntHave('mandates', fn ($q) => $q->where('status', SepaMandateStatus::Actief->value))
            ->orderBy('id')
            ->get(['id', 'bedrijfsnaam'])
            ->each(fn (GarageCompany $company) => $this->createOnce(
                $company,
                'geen-mandaat',
                'Geen actief SEPA-mandaat: '.$company->bedrijfsnaam,
                'Deze actieve klant heeft geen actief SEPA-mandaat. Vraag een mandaat aan.',
                TaskPriority::Normaal,
            ));
    }

    private function createOnce(GarageCompany $company, string $marker, string $title, string $body, TaskPriority $priority): void
    {
        $tag = '[auto:'.$marker.']';

        // Geen dubbele taak: bestaat er al een open taak voor deze klant met dezelfde marker?
        // Voor datum-markers ook afgeronde taken meetellen, zodat een afgeronde taak niet terugkomt.
        $exists = Task::query()
            ->where('garage_company_id', $company->id)
            ->where('omschrijving', 'like', '%'.$tag.'%')
            ->when(! str_contains($marker, ':'), fn ($q) => $q->where('status', '!=', TaskStatus::Afgerond->value))
            ->exists();

        if ($exists) {
            return;
        }

        $this->created++;

        if ($this->option('dry-run')) {
            $this->line($title);

            return;
        }

        $assignee = $this->assigneeFor($company);

        $task = Task::create([
            'task_project_id' => null,
            'garage_company_id' => $company->id,
            'titel' => mb_substr($title, 0, 255),
            'omschrijving' => $body."\n\n".$tag,
            'status' => TaskStatus::Open,
            'prioriteit' => $priority,
            'deadline' => Carbon::today()->setTime(17, 0),
            'labels' => 'automatisch',
            'sort_order' => 0,
            'created_by' => $assignee,
        ]);

        $task->assignees()->sync([$assignee]);
    }

    private function assigneeFor(GarageCompany $company): int
    {
        // Er is geen accountmanager-veld op garage_companies (eigenaar_user_id is de klantlogin),
        // dus wijzen we toe aan de eerste actieve admin.
        return (int) $this->fallbackUserId;
    }
}
