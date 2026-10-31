<?php

namespace App\Services\Crm;

use App\Enums\ActivityType;
use App\Enums\GarageCompanyStatus;
use App\Enums\UserRole;
use App\Models\Activity;
use App\Models\DemoMailSequence;
use App\Models\DemoMailStep;
use App\Models\EmailTemplate;
use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use App\Models\Module;
use App\Models\OutboundEmail;
use App\Models\User;
use App\Services\EmailTemplateRenderer;
use App\Services\Mail\MicrosoftGraphMailer;
use App\Services\Sepa\MandateRequestService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Automatische demo-mailreeks: dag 2, 5 en 13 na de overgang "Demo aangevraagd" naar "Demo".
 * Versturen gebeurt uitsluitend via Microsoft Graph namens info@kivii.nl, zonder SMTP-fallback.
 */
class DemoMailSequenceService
{
    /** Stapsleutel (= template-key) => dag na de start. */
    public const STEPS = [
        'demo_dag_2' => 2,
        'demo_dag_5' => 5,
        'demo_dag_13' => 13,
    ];

    /** Na zoveel mislukte pogingen krijgt een stap de status 'mislukt'. */
    public const MAX_ATTEMPTS = 3;

    /** Alleen versturen tussen deze uren (Europe/Amsterdam), zodat niemand om 03:00 een mail krijgt. */
    public const SEND_FROM_HOUR = 8;

    public const SEND_UNTIL_HOUR = 20;

    private static ?bool $available = null;

    public static function available(): bool
    {
        if (self::$available !== null) {
            return self::$available;
        }
        try {
            return self::$available = Schema::hasTable('demo_mail_sequences') && Schema::hasTable('demo_mail_steps');
        } catch (\Throwable) {
            return false;
        }
    }

    private static ?bool $testModeAvailable = null;

    /** Testmodus vereist de kolom test_mode (aparte migratie). */
    public static function testModeAvailable(): bool
    {
        if (self::$testModeAvailable !== null) {
            return self::$testModeAvailable;
        }
        try {
            return self::$testModeAvailable = self::available() && Schema::hasColumn('demo_mail_sequences', 'test_mode');
        } catch (\Throwable) {
            return false;
        }
    }

    public static function resetAvailability(): void
    {
        self::$available = null;
        self::$testModeAvailable = null;
    }

    /** Snelle check voor de minuuttaak: zijn er actieve reeksen in testmodus? */
    public static function hasActiveTestSequences(): bool
    {
        if (! self::testModeAvailable()) {
            return false;
        }

        return DemoMailSequence::query()
            ->where('status', DemoMailSequence::STATUS_ACTIEF)
            ->where('test_mode', true)
            ->exists();
    }

    // ------------------------------------------------------------------
    // Starten en stoppen

    /**
     * Start een nieuwe reeks (stopt een eventuele actieve reeks eerst).
     * Testmodus: mails na 2, 5 en 13 minuten in plaats van dagen, zonder verzendvenster.
     */
    public function start(GarageCompany $company, ?int $userId = null, ?Carbon $startedAt = null, bool $testMode = false): ?DemoMailSequence
    {
        if (! self::available() || ($testMode && ! self::testModeAvailable())) {
            return null;
        }
        $startedAt ??= now();

        return DB::transaction(function () use ($company, $userId, $startedAt, $testMode) {
            if ($testMode) {
                $this->stop($company, 'Herstart in testmodus', $userId);
            } else {
                $this->stop($company, 'Vervangen door een nieuwe reeks', $userId, false);
            }

            $attributes = [
                'garage_company_id' => $company->id,
                'active_company_id' => $company->id,
                'status' => DemoMailSequence::STATUS_ACTIEF,
                'started_at' => $startedAt,
                'created_by' => $userId,
            ];
            if (self::testModeAvailable()) {
                $attributes['test_mode'] = $testMode;
            }

            try {
                $sequence = DemoMailSequence::create($attributes);
            } catch (QueryException) {
                // Een gelijktijdig proces heeft al een actieve reeks aangemaakt (unieke sleutel).
                return DemoMailSequence::query()->where('active_company_id', $company->id)->first();
            }

            foreach (self::STEPS as $key => $days) {
                DemoMailStep::create([
                    'demo_mail_sequence_id' => $sequence->id,
                    'garage_company_id' => $company->id,
                    'step_key' => $key,
                    'day_offset' => $days,
                    'due_at' => self::dueAt($startedAt, $days, $testMode),
                    'status' => DemoMailStep::STATUS_GEPLAND,
                ]);
            }

            if ($testMode) {
                $this->logActivity($company, 'Demo-mailreeks gestart in testmodus (minuten)', 'Testmodus: automatische mails gepland om '.collect(self::STEPS)
                        ->map(fn ($d) => self::dueAt($startedAt, $d, true)->timezone('Europe/Amsterdam')->format('H:i'))
                        ->implode(', ').' (na 2, 5 en 13 minuten).', $userId);
            } else {
                $this->logActivity($company, 'Demo-mailreeks gestart', 'Automatische mails gepland op '.collect(self::STEPS)
                        ->map(fn ($d) => $startedAt->copy()->addDays($d)->timezone('Europe/Amsterdam')->format('d-m-Y'))
                        ->implode(', ').'.', $userId);
            }

            return $sequence;
        });
    }

    /** Normaal: begin van de dag (Amsterdam) + N dagen om 08:45. Testmodus: start + N minuten. */
    public static function dueAt(Carbon $startedAt, int $offset, bool $testMode = false): Carbon
    {
        if ($testMode) {
            return $startedAt->copy()->addMinutes($offset)->utc();
        }

        return $startedAt->copy()->timezone('Europe/Amsterdam')->startOfDay()->addDays($offset)->setTime(8, 45)->utc();
    }

    /** Stopt de actieve reeks van de klant. Geeft true terug als er iets gestopt is. */
    public function stop(GarageCompany $company, string $reason, ?int $userId = null, bool $logActivity = true): bool
    {
        if (! self::available()) {
            return false;
        }
        $sequence = DemoMailSequence::query()
            ->where('garage_company_id', $company->id)
            ->where('status', DemoMailSequence::STATUS_ACTIEF)
            ->first();
        if (! $sequence) {
            return false;
        }

        $this->stopSequence($sequence, $reason, $userId);

        if ($logActivity) {
            $this->logActivity($company, 'Demo-mailreeks gestopt', $reason.'.', $userId);
        }

        return true;
    }

    private function stopSequence(DemoMailSequence $sequence, string $reason, ?int $userId): void
    {
        DB::transaction(function () use ($sequence, $reason, $userId) {
            $sequence->forceFill([
                'status' => DemoMailSequence::STATUS_GESTOPT,
                'active_company_id' => null,
                'stopped_at' => now(),
                'stop_reason' => mb_substr($reason, 0, 255),
                'stopped_by' => $userId,
            ])->save();

            DemoMailStep::query()
                ->where('demo_mail_sequence_id', $sequence->id)
                ->where('status', DemoMailStep::STATUS_GEPLAND)
                ->update(['status' => DemoMailStep::STATUS_GESTOPT, 'reason' => mb_substr($reason, 0, 255), 'updated_at' => now()]);
        });
    }

    /**
     * Wordt aangeroepen door de GarageCompanyObserver na elke opgeslagen statuswijziging.
     */
    public function handleStatusChange(GarageCompany $company, string $from, string $to): void
    {
        if (! self::available()) {
            return;
        }
        $from = GarageCompanyStatus::normalize($from);
        $to = GarageCompanyStatus::normalize($to);
        if ($from === $to) {
            return;
        }

        $demo = GarageCompanyStatus::Proefperiode->value;
        if ($from === GarageCompanyStatus::DemoAangevraagd->value && $to === $demo) {
            $this->start($company, auth()->id());

            return;
        }
        if ($from === $demo) {
            $label = GarageCompanyStatus::tryFrom($to)?->label() ?? $to;
            $this->stop($company, 'Automatisch gestopt: status gewijzigd naar '.$label, auth()->id());
        }
    }

    // ------------------------------------------------------------------
    // Versturen

    /**
     * Verwerkt alle actieve reeksen. Stuurt per klant maximaal één mail: de laatste stap die aan de beurt is.
     * $testMode: null = alle reeksen, false = alleen normale reeksen, true = alleen reeksen in testmodus.
     * Testreeksen negeren het verzendvenster.
     *
     * @return array{sent:int, skipped:int, failed:int, waiting:int, stopped:int, graph_missing:bool, outside_window:bool}
     */
    public function processDue(?Carbon $now = null, ?bool $testMode = null): array
    {
        $now ??= now();
        $stats = ['sent' => 0, 'skipped' => 0, 'failed' => 0, 'waiting' => 0, 'stopped' => 0, 'graph_missing' => false, 'outside_window' => false];
        if (! self::available()) {
            return $stats;
        }

        $graph = MicrosoftGraphMailer::isConfigured();
        $local = $now->copy()->timezone('Europe/Amsterdam');
        $inWindow = $local->hour >= self::SEND_FROM_HOUR && $local->hour < self::SEND_UNTIL_HOUR;
        $hasColumn = self::testModeAvailable();
        if ($testMode === true && ! $hasColumn) {
            return $stats;
        }
        $stats['graph_missing'] = ! $graph;
        $stats['outside_window'] = $testMode === true ? false : ! $inWindow;

        DemoMailSequence::query()
            ->where('status', DemoMailSequence::STATUS_ACTIEF)
            ->when($hasColumn && $testMode !== null, fn ($q) => $q->where('test_mode', $testMode))
            ->orderBy('id')
            ->chunkById(100, function ($sequences) use ($now, $graph, $inWindow, &$stats) {
                foreach ($sequences as $sequence) {
                    $this->processSequence($sequence, $now, $graph, $inWindow || (bool) $sequence->test_mode, $stats);
                }
            });

        return $stats;
    }

    private function processSequence(DemoMailSequence $sequence, Carbon $now, bool $graph, bool $inWindow, array &$stats): void
    {
        $company = GarageCompany::query()->with('primaryPerson')->find($sequence->garage_company_id);
        if (! $company) {
            $this->stopSequence($sequence, 'Klant verwijderd of in de prullenbak', null);
            $stats['stopped']++;

            return;
        }
        if (GarageCompanyStatus::normalize((string) $company->status?->value) !== GarageCompanyStatus::Proefperiode->value) {
            $this->stop($company, 'Automatisch gestopt: klant staat niet meer op Demo');
            $stats['stopped']++;

            return;
        }

        $due = DemoMailStep::query()
            ->where('demo_mail_sequence_id', $sequence->id)
            ->where('status', DemoMailStep::STATUS_GEPLAND)
            ->where('due_at', '<=', $now)
            ->orderBy('day_offset')
            ->get();

        if ($due->isEmpty()) {
            $this->finishIfDone($sequence);

            return;
        }
        if (! $graph || ! $inWindow) {
            // Niets versturen; de stap blijft gepland en wordt bij een volgende run opgepakt.
            $stats['waiting']++;

            return;
        }

        // Meerdere stappen achterstallig (bijv. cron lag stil): alleen de laatste versturen, de rest overslaan.
        $step = $due->pop();
        foreach ($due as $older) {
            $older->forceFill([
                'status' => DemoMailStep::STATUS_OVERGESLAGEN,
                'reason' => 'Overgeslagen: een latere mail was al aan de beurt',
            ])->save();
            $stats['skipped']++;
        }

        $this->sendStep($company, $step, $stats);
        $this->finishIfDone($sequence);
    }

    /**
     * Verstuurt één stap direct (admin, "Nu versturen"). Negeert het verzendvenster en de geplande datum,
     * raakt andere stappen niet aan en verstuurt nooit een stap die al verstuurd is.
     *
     * @return array{ok:bool, message:string}
     */
    public function sendNow(GarageCompany $company, DemoMailStep $step, ?int $userId = null): array
    {
        if (! self::available()) {
            return ['ok' => false, 'message' => 'De database-migratie voor de demo-mailreeks ontbreekt nog.'];
        }
        if ((int) $step->garage_company_id !== (int) $company->id) {
            return ['ok' => false, 'message' => 'Deze mail hoort niet bij deze klant.'];
        }
        $sequence = DemoMailSequence::query()->find($step->demo_mail_sequence_id);
        if (! $sequence || (int) $sequence->garage_company_id !== (int) $company->id || $sequence->status !== DemoMailSequence::STATUS_ACTIEF) {
            return ['ok' => false, 'message' => 'De demo-mailreeks van deze klant is niet actief.'];
        }
        if (! in_array($step->status, [DemoMailStep::STATUS_GEPLAND, DemoMailStep::STATUS_MISLUKT], true)) {
            return ['ok' => false, 'message' => $step->status === DemoMailStep::STATUS_VERSTUURD
                ? 'Deze mail is al verstuurd.'
                : 'Deze mail kan nu niet verstuurd worden (status: '.$step->status.').'];
        }
        if (! MicrosoftGraphMailer::isConfigured()) {
            return ['ok' => false, 'message' => 'Microsoft Graph is niet ingesteld voor '.MicrosoftGraphMailer::sender().'. De mail is niet verstuurd.'];
        }

        $company->loadMissing('primaryPerson');
        $stats = ['sent' => 0, 'skipped' => 0, 'failed' => 0];
        $result = $this->sendStep($company, $step, $stats, $userId);
        if ($result['ok']) {
            $this->finishIfDone($sequence);
        }

        return $result;
    }

    /**
     * Gedeeld verzendpad voor de taakplanner en "Nu versturen" ($manualBy niet null = handmatig).
     *
     * @return array{ok:bool, message:string}
     */
    private function sendStep(GarageCompany $company, DemoMailStep $step, array &$stats, ?int $manualBy = null): array
    {
        $manual = $manualBy !== null;
        $previous = $step->status;

        $to = self::recipient($company);
        if ($to === null) {
            if ($manual) {
                return ['ok' => false, 'message' => 'Geen geldig e-mailadres: vul een login-e-mail, hoofd-e-mail of e-mail bij het hoofdcontact in.'];
            }
            $step->forceFill(['status' => DemoMailStep::STATUS_OVERGESLAGEN, 'reason' => 'Overgeslagen: geen geldig e-mailadres (login, hoofd-e-mail of contactpersoon)'])->save();
            $stats['skipped']++;

            return ['ok' => false, 'message' => 'Overgeslagen: geen geldig e-mailadres.'];
        }

        $template = $this->template($step->step_key);
        if (! $template) {
            if ($manual) {
                return ['ok' => false, 'message' => 'Het e-mailtemplate voor deze mail staat uit of ontbreekt.'];
            }
            $step->forceFill(['status' => DemoMailStep::STATUS_OVERGESLAGEN, 'reason' => 'Overgeslagen: e-mailtemplate staat uit of ontbreekt'])->save();
            $stats['skipped']++;

            return ['ok' => false, 'message' => 'Overgeslagen: e-mailtemplate staat uit of ontbreekt.'];
        }

        // Atomair claimen: alleen het proces dat de rij naar 'bezig' zet, verstuurt.
        // Handmatig mag ook een mislukte stap opnieuw; verstuurde stappen nooit.
        $claimable = $manual ? [DemoMailStep::STATUS_GEPLAND, DemoMailStep::STATUS_MISLUKT] : [DemoMailStep::STATUS_GEPLAND];
        $claimed = DemoMailStep::query()
            ->whereKey($step->id)
            ->whereIn('status', $claimable)
            ->update(['status' => DemoMailStep::STATUS_BEZIG, 'attempts' => DB::raw('attempts + 1'), 'updated_at' => now()]);
        if ($claimed !== 1) {
            return ['ok' => false, 'message' => 'Deze mail wordt al verstuurd of is al verstuurd.'];
        }
        $step->refresh();

        $mail = $this->render($company, $template, $to);

        try {
            app(MicrosoftGraphMailer::class)->send($to, $mail['subject'], $mail['html'], MicrosoftGraphMailer::sender());
        } catch (\Throwable $e) {
            $message = $e instanceof \RuntimeException ? $e->getMessage() : 'Versturen via Microsoft 365 mislukt.';
            if ($manual) {
                // Handmatig: een geplande stap blijft gepland (de taakplanner probeert het later opnieuw), tenzij het maximum bereikt is.
                $final = $previous === DemoMailStep::STATUS_MISLUKT || $step->attempts >= self::MAX_ATTEMPTS;
            } else {
                $final = $step->attempts >= self::MAX_ATTEMPTS;
            }
            $step->forceFill([
                'status' => $final ? DemoMailStep::STATUS_MISLUKT : DemoMailStep::STATUS_GEPLAND,
                'last_error' => mb_substr($message, 0, 1000),
                'reason' => $final ? 'Mislukt na '.$step->attempts.' pogingen' : null,
            ])->save();
            $stats['failed']++;
            if ($final || $manual) {
                $this->logOutbound($company, $template, $step, $to, $mail, 'failed', $message, $manualBy);
                $this->logActivity($company, 'Demo-mail mislukt: '.$template->name, ($manual ? 'Handmatig versturen mislukt. ' : '').$message, $manualBy);
            }

            return ['ok' => false, 'message' => 'Versturen mislukt: '.$message];
        }

        $outbound = $this->logOutbound($company, $template, $step, $to, $mail, 'sent', null, $manualBy);
        $step->forceFill([
            'status' => DemoMailStep::STATUS_VERSTUURD,
            'sent_at' => now(),
            'recipient_email' => $to,
            'subject' => mb_substr($mail['subject'], 0, 255),
            'last_error' => null,
            'reason' => null,
            'outbound_email_id' => $outbound?->id,
        ])->save();

        $how = $manual ? 'Handmatig verstuurd' : 'Automatisch verstuurd';
        $this->logActivity($company, 'Demo-mail '.($manual ? 'handmatig ' : '').'verstuurd: '.$template->name, $how.' naar '.$to.' namens '.MicrosoftGraphMailer::sender().'. Onderwerp: '.$mail['subject'], $manualBy);
        $stats['sent']++;

        return ['ok' => true, 'message' => $template->name.' is handmatig verstuurd naar '.$to.'.'];
    }

    private function finishIfDone(DemoMailSequence $sequence): void
    {
        $open = DemoMailStep::query()
            ->where('demo_mail_sequence_id', $sequence->id)
            ->whereIn('status', [DemoMailStep::STATUS_GEPLAND, DemoMailStep::STATUS_BEZIG])
            ->exists();
        if (! $open) {
            $sequence->forceFill([
                'status' => DemoMailSequence::STATUS_AFGEROND,
                'active_company_id' => null,
                'finished_at' => now(),
            ])->save();
        }
    }

    private function logOutbound(GarageCompany $company, EmailTemplate $template, DemoMailStep $step, string $to, array $mail, string $status, ?string $error, ?int $userId = null): ?OutboundEmail
    {
        if (! Schema::hasTable('outbound_emails')) {
            return null;
        }
        try {
            return OutboundEmail::create([
                'garage_company_id' => $company->id,
                'template_id' => $template->id,
                'type' => $step->step_key,
                'to_email' => $to,
                'subject' => mb_substr($mail['subject'], 0, 255),
                'body_html' => $mail['html'],
                'body_text' => $mail['text'],
                'status' => $status,
                'sent_at' => $status === 'sent' ? now() : null,
                'last_error' => $error,
                'created_by' => $userId,
            ]);
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    /**
     * Tijdlijnregel. activities.created_by is verplicht: zonder ingelogde gebruiker (taakplanner)
     * valt die terug op de eerste actieve admin, net als bij crm:daily-checks.
     */
    private function logActivity(GarageCompany $company, string $titel, ?string $inhoud, ?int $userId): void
    {
        try {
            $actor = $userId ?? auth()->id() ?? $this->fallbackUserId() ?? $company->created_by;
            if (! $actor) {
                return;
            }
            Activity::create([
                'garage_company_id' => $company->id,
                'type' => ActivityType::Demo,
                'titel' => mb_substr($titel, 0, 255),
                'inhoud' => $inhoud,
                'created_by' => $actor,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private ?int $fallbackUserId = null;

    private function fallbackUserId(): ?int
    {
        return $this->fallbackUserId ??= User::query()
            ->where('role', UserRole::Admin->value)
            ->where('active', true)
            ->orderBy('id')
            ->value('id');
    }

    // ------------------------------------------------------------------
    // Templates en gegevens

    /** Template ophalen; ontbreekt het nog, dan de standaardtekst als systeemtemplate aanmaken. */
    public function template(string $key): ?EmailTemplate
    {
        if (! Schema::hasTable('email_templates')) {
            return null;
        }
        $template = EmailTemplate::query()->where('key', $key)->first();
        if (! $template) {
            $default = EmailTemplateRenderer::defaultDemoTemplates()[$key] ?? null;
            if (! $default) {
                return null;
            }
            $payload = ['name' => $default['name'], 'subject' => $default['subject']];
            if (Schema::hasColumn('email_templates', 'body_html')) {
                $payload['body_html'] = $default['body_html'];
            }
            if (Schema::hasColumn('email_templates', 'body_text')) {
                $payload['body_text'] = MandateRequestService::htmlToText($default['body_html']);
            }
            if (Schema::hasColumn('email_templates', 'is_active')) {
                $payload['is_active'] = true;
            }
            $template = EmailTemplate::query()->firstOrCreate(['key' => $key], $payload);
        }
        if (Schema::hasColumn('email_templates', 'is_active') && ! $template->is_active) {
            return null;
        }

        return $template;
    }

    /** @return array{subject:string, html:string, text:string} */
    public function render(GarageCompany $company, EmailTemplate $template, string $to): array
    {
        $data = self::templateData($company, $to);
        $html = (string) ($template->body_html ?? '');
        $escaped = array_map(fn ($v) => e($v), $data);

        return [
            'subject' => EmailTemplateRenderer::renderString((string) $template->subject, $data),
            'html' => EmailTemplateRenderer::renderString($html, $escaped),
            'text' => MandateRequestService::htmlToText(EmailTemplateRenderer::renderString($html, $data)),
        ];
    }

    /** @return array<string, string> */
    public static function templateData(GarageCompany $company, string $to): array
    {
        $company->loadMissing('primaryPerson');
        $primary = $company->primaryPerson;
        $naam = $primary ? trim("{$primary->voornaam} {$primary->achternaam}") : '';

        return [
            'naam' => $naam !== '' ? $naam : (string) $company->bedrijfsnaam,
            'bedrijfsnaam' => (string) $company->bedrijfsnaam,
            'loginnaam' => (string) ($company->login_email ?: $to),
            'weblink' => 'https://web.kivii.nl/',
            'modules' => self::moduleNames($company),
        ];
    }

    /** Actieve modules van de klant; zonder koppelingen de beschikbare standaardmodules. */
    public static function moduleNames(GarageCompany $company): string
    {
        try {
            $names = GarageCompanyModule::query()
                ->where('garage_company_modules.garage_company_id', $company->id)
                ->where('garage_company_modules.actief', true)
                ->join('modules', 'modules.id', '=', 'garage_company_modules.module_id')
                ->when(Module::hasArchivedColumn(), fn ($q) => $q->whereNull('modules.archived_at'))
                ->orderBy('modules.naam')
                ->pluck('modules.naam');
            if ($names->isEmpty()) {
                $names = Module::query()->available()->where('default_visible', true)->orderBy('naam')->pluck('naam');
            }
        } catch (\Throwable) {
            $names = collect();
        }
        $names = $names->filter(fn ($n) => filled($n))->unique()->values();

        return $names->isEmpty() ? 'werkorders, planning en rapportages' : $names->implode(', ');
    }

    /** Ontvanger: login-e-mail, anders hoofd-e-mail, anders e-mail van het hoofdcontact. */
    public static function recipient(GarageCompany $company): ?string
    {
        $company->loadMissing('primaryPerson');
        foreach ([$company->login_email, $company->hoofd_email, $company->primaryPerson?->email] as $email) {
            $email = trim((string) $email);
            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $email;
            }
        }

        return null;
    }

    // ------------------------------------------------------------------
    // Presentatie

    /** Props voor de klantpagina. */
    public static function forCompany(GarageCompany $company): array
    {
        $available = self::available();
        $isDemo = GarageCompanyStatus::normalize((string) $company->status?->value) === GarageCompanyStatus::Proefperiode->value;
        $base = [
            'available' => $available,
            'test_mode_available' => self::testModeAvailable(),
            'graph_configured' => MicrosoftGraphMailer::isConfigured(),
            'schedule_enabled' => (bool) config('crm.schedule.demo_sequence'),
            'sender' => MicrosoftGraphMailer::sender(),
            'can_manage' => (bool) auth()->user()?->isAdmin(),
            'is_demo' => $isDemo,
            'recipient' => self::recipient($company),
            'sequence' => null,
            'urls' => [
                'stop' => route('crm.demo_sequence.stop', ['garageCompany' => $company->id]),
                'restart' => route('crm.demo_sequence.restart', ['garageCompany' => $company->id]),
                'start_test' => route('crm.demo_sequence.start_test', ['garageCompany' => $company->id]),
                'templates' => route('crm.email_templates.index'),
            ],
        ];
        if (! $available) {
            return $base;
        }

        $sequence = DemoMailSequence::query()
            ->where('garage_company_id', $company->id)
            ->with(['steps', 'stopper:id,name'])
            ->latest('id')
            ->first();
        if (! $sequence) {
            return $base;
        }

        $names = collect(EmailTemplateRenderer::defaultDemoTemplates())->map(fn ($t) => $t['name']);
        try {
            $names = $names->merge(EmailTemplate::query()->whereIn('key', array_keys(self::STEPS))->pluck('name', 'key'));
        } catch (\Throwable) {
        }

        $base['sequence'] = [
            'id' => $sequence->id,
            'status' => $sequence->status,
            'test_mode' => (bool) $sequence->test_mode,
            'started_at' => $sequence->started_at?->toIso8601String(),
            'stopped_at' => $sequence->stopped_at?->toIso8601String(),
            'stop_reason' => $sequence->stop_reason,
            'stopped_by' => $sequence->stopper?->name,
            'finished_at' => $sequence->finished_at?->toIso8601String(),
            'steps' => $sequence->steps->map(fn (DemoMailStep $s) => [
                'id' => $s->id,
                'key' => $s->step_key,
                'name' => (string) ($names[$s->step_key] ?? $s->step_key),
                'day' => $s->day_offset,
                'status' => $s->status,
                'due_at' => $s->due_at?->toIso8601String(),
                'sent_at' => $s->sent_at?->toIso8601String(),
                'recipient' => $s->recipient_email,
                'reason' => $s->reason,
                'last_error' => $s->last_error,
                'attempts' => $s->attempts,
                'send_now_url' => route('crm.demo_sequence.send_now', ['garageCompany' => $company->id, 'step' => $s->id]),
            ])->values(),
        ];

        return $base;
    }

    /** Aantal actieve reeksen en stappen die wachten omdat Graph niet is ingesteld (voor de bel). */
    public static function waitingForGraphCount(): int
    {
        if (! self::available() || MicrosoftGraphMailer::isConfigured()) {
            return 0;
        }

        return DemoMailStep::query()
            ->where('status', DemoMailStep::STATUS_GEPLAND)
            ->where('due_at', '<=', now())
            ->whereHas('sequence', fn ($q) => $q->where('status', DemoMailSequence::STATUS_ACTIEF))
            ->distinct()
            ->count('garage_company_id');
    }

    public static function failedCount(): int
    {
        if (! self::available()) {
            return 0;
        }

        return DemoMailStep::query()
            ->where('status', DemoMailStep::STATUS_MISLUKT)
            ->where('updated_at', '>=', now()->subDays(7))
            ->count();
    }
}
