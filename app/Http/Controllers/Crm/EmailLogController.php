<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\DemoMailStep;
use App\Services\Crm\DemoMailSequenceService;
use App\Services\Mail\MicrosoftGraphMailer;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

/**
 * E-maillog: alle mails die het CRM probeerde te versturen (outbound_emails) plus demo-mailstappen
 * die nooit tot een verzendpoging kwamen (overgeslagen, gestopt) of nog gepland staan.
 * Concepten (welkomstmail nog niet verstuurd) tellen niet mee.
 */
class EmailLogController extends Controller
{
    public const TYPE_LABELS = [
        'welcome_customer' => 'Welkomstmail',
        'demo_dag_2' => 'Demo dag 2',
        'demo_dag_5' => 'Demo dag 5',
        'demo_dag_13' => 'Demo dag 13',
        'sepa_mandate' => 'SEPA-machtiging',
    ];

    private const FILTERS = ['niet_verstuurd', 'verstuurd', 'gepland', 'alle'];

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $base = $this->union();

        $counts = ['niet_verstuurd' => 0, 'verstuurd' => 0, 'gepland' => 0, 'alle' => 0];
        if ($base) {
            $grouped = DB::query()->fromSub($base, 'm')
                ->when($search !== '', fn ($q) => $this->applySearch($q, $search))
                ->selectRaw('state, count(*) as c')->groupBy('state')->pluck('c', 'state');
            $counts['verstuurd'] = (int) ($grouped['sent'] ?? 0);
            $counts['gepland'] = (int) ($grouped['planned'] ?? 0);
            $counts['niet_verstuurd'] = (int) ($grouped['failed'] ?? 0) + (int) ($grouped['skipped'] ?? 0);
            $counts['alle'] = (int) $grouped->sum();
        }

        $filter = (string) $request->query('filter', '');
        if (! in_array($filter, self::FILTERS, true)) {
            $filter = $counts['niet_verstuurd'] > 0 ? 'niet_verstuurd' : 'alle';
        }

        $rows = null;
        if ($base) {
            $query = DB::query()->fromSub($base, 'm')
                ->when($search !== '', fn ($q) => $this->applySearch($q, $search))
                ->when($filter === 'niet_verstuurd', fn ($q) => $q->whereIn('state', ['failed', 'skipped']))
                ->when($filter === 'verstuurd', fn ($q) => $q->where('state', 'sent'))
                ->when($filter === 'gepland', fn ($q) => $q->where('state', 'planned'));
            $query = $filter === 'gepland'
                ? $query->orderBy('at')->orderBy('uid')
                : $query->orderByDesc('at')->orderByDesc('uid');
            $graph = MicrosoftGraphMailer::isConfigured();
            $rows = $query->paginate(50)->withQueryString()->through(fn ($r) => $this->present($r, $graph));
        }

        return Inertia::render('Crm/EmailLog/Index', [
            'available' => $base !== null,
            'rows' => $rows,
            'counts' => $counts,
            'filter' => $filter,
            'search' => $search,
            'inbox' => MicrosoftGraphMailer::sender(),
            'url' => route('crm.email_log.index'),
        ]);
    }

    /** Mislukte mails (alle bronnen) in de afgelopen dagen; voor de meldingenbel. */
    public static function failedCount(int $days = 14): int
    {
        $since = now()->subDays($days);
        $count = 0;
        if (Schema::hasTable('outbound_emails')) {
            $count += DB::table('outbound_emails')->where('status', 'failed')->where('updated_at', '>=', $since)->count();
        }
        if (DemoMailSequenceService::available()) {
            $count += DB::table('demo_mail_steps as s')
                ->where('s.status', DemoMailStep::STATUS_MISLUKT)
                ->where('s.updated_at', '>=', $since)
                ->whereNotExists(fn ($q) => self::matchingFailedOutbound($q))
                ->count();
        }

        return $count;
    }

    /** Tabellen hebben verschillende collaties (general_ci vs unicode_ci); op MySQL gelijktrekken. */
    private static function c(string $expr): string
    {
        return DB::getDriverName() === 'mysql' ? "({$expr}) collate utf8mb4_unicode_ci" : $expr;
    }

    private function union(): ?Builder
    {
        $parts = [];
        $c = fn (string $e) => self::c($e);

        if (Schema::hasTable('outbound_emails')) {
            $parts[] = DB::table('outbound_emails as o')
                ->leftJoin('garage_companies as g', 'g.id', '=', 'o.garage_company_id')
                ->where('o.status', '!=', 'draft')
                ->selectRaw("'o' as src, o.id as row_id, (o.id * 2) as uid, o.garage_company_id, {$c('g.bedrijfsnaam')} as company_name, {$c('o.type')} as type, {$c('o.to_email')} as to_email, {$c('o.subject')} as subject,
                    {$c("case when o.status = 'sent' then 'sent' else 'failed' end")} as state, {$c('o.status')} as raw_status,
                    {$c("cast(null as char)")} as reason, {$c('o.last_error')} as last_error, coalesce(o.sent_at, o.updated_at) as at, 0 as attempts");
        }

        if (DemoMailSequenceService::available()) {
            $parts[] = DB::table('demo_mail_steps as s')
                ->leftJoin('garage_companies as g', 'g.id', '=', 's.garage_company_id')
                ->where(function ($q) {
                    $q->whereIn('s.status', [DemoMailStep::STATUS_OVERGESLAGEN, DemoMailStep::STATUS_GESTOPT, DemoMailStep::STATUS_GEPLAND, DemoMailStep::STATUS_BEZIG])
                        // Mislukt: alleen als er geen outbound-regel van is (die toont de verzendpoging al).
                        ->orWhere(fn ($q) => $q->where('s.status', DemoMailStep::STATUS_MISLUKT)->whereNotExists(fn ($q) => self::matchingFailedOutbound($q)))
                        // Verstuurd zonder outbound-regel (loggen mislukte): anders zou de mail ontbreken.
                        ->orWhere(fn ($q) => $q->where('s.status', DemoMailStep::STATUS_VERSTUURD)->whereNull('s.outbound_email_id'));
                })
                ->selectRaw("'s' as src, s.id as row_id, (s.id * 2 + 1) as uid, s.garage_company_id, {$c('g.bedrijfsnaam')} as company_name, {$c('s.step_key')} as type, {$c('s.recipient_email')} as to_email, {$c('s.subject')} as subject,
                    {$c("case when s.status in ('gepland', 'bezig') then 'planned' when s.status = 'verstuurd' then 'sent' when s.status = 'mislukt' then 'failed' else 'skipped' end")} as state, {$c('s.status')} as raw_status,
                    {$c('s.reason')} as reason, {$c('s.last_error')} as last_error, case when s.status in ('gepland', 'bezig') then s.due_at when s.status = 'verstuurd' then coalesce(s.sent_at, s.updated_at) else s.updated_at end as at, s.attempts");
        }

        if ($parts === []) {
            return null;
        }
        $query = array_shift($parts);
        foreach ($parts as $part) {
            $query->unionAll($part);
        }

        return $query;
    }

    private static function matchingFailedOutbound($q): void
    {
        if (! Schema::hasTable('outbound_emails')) {
            $q->selectRaw('1')->whereRaw('1 = 0');

            return;
        }
        $q->selectRaw('1')->from('outbound_emails as ox')
            ->whereColumn('ox.garage_company_id', 's.garage_company_id')
            ->whereRaw(self::c('ox.type').' = '.self::c('s.step_key'))
            ->where('ox.status', 'failed');
    }

    private function applySearch($q, string $search): void
    {
        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], mb_strtolower($search)).'%';
        $q->where(function ($q) use ($like) {
            $q->whereRaw('lower(coalesce(company_name, \'\')) like ?', [$like])
                ->orWhereRaw('lower(coalesce(to_email, \'\')) like ?', [$like])
                ->orWhereRaw('lower(coalesce(subject, \'\')) like ?', [$like]);
        });
    }

    private function present(object $r, bool $graph): array
    {
        $raw = filled($r->last_error) ? (string) $r->last_error : null;
        $reason = match ($r->state) {
            'sent' => null,
            'failed' => self::humanError($raw) ?? (filled($r->reason) ? (string) $r->reason : 'Versturen mislukt, oorzaak onbekend.'),
            'skipped' => self::humanReason((string) $r->raw_status, $r->reason),
            'planned' => $raw
                ? 'Nieuwe poging gepland. Vorige poging mislukt: '.(self::humanError($raw) ?? $raw)
                : (! $graph ? 'Wacht op de Microsoft-koppeling; zonder koppeling wordt deze mail niet verstuurd.' : null),
            default => null,
        };
        if ($r->state === 'failed' && (int) $r->attempts > 1) {
            $reason .= ' ('.(int) $r->attempts.' pogingen)';
        }

        return [
            'id' => (int) $r->uid,
            'at' => $r->at ? \Illuminate\Support\Carbon::parse($r->at)->toIso8601String() : null,
            'company' => $r->garage_company_id ? [
                'naam' => (string) ($r->company_name ?? 'Klant #'.$r->garage_company_id),
                'url' => route('crm.garage_companies.show', $r->garage_company_id),
            ] : null,
            'type' => self::TYPE_LABELS[$r->type] ?? (string) $r->type,
            'to' => $r->to_email,
            'subject' => $r->subject,
            'state' => $r->state,
            'reason' => $reason,
            'raw' => $raw && $raw !== $reason ? $raw : null,
        ];
    }

    private static function humanReason(string $status, ?string $reason): string
    {
        $reason = trim((string) $reason);
        if ($reason !== '') {
            return preg_replace('/^Overgeslagen:\s*/u', '', $reason) ?: $reason;
        }

        return $status === DemoMailStep::STATUS_GESTOPT
            ? 'De demo-mailreeks is gestopt, bijvoorbeeld omdat de klant geen demo meer is.'
            : 'Overgeslagen.';
    }

    /**
     * Vertaalt veelvoorkomende technische fouten naar een duidelijke Nederlandse zin. Alle mail gaat via
     * Microsoft Graph (MicrosoftGraphMailer en de msgraph-mailtransport); de SMTP-regels blijven alleen
     * voor oudere logregels van voor de overstap.
     */
    public static function humanError(?string $error): ?string
    {
        if ($error === null || trim($error) === '') {
            return null;
        }
        $e = mb_strtolower($error);
        $sender = MicrosoftGraphMailer::sender();

        return match (true) {
            str_contains($e, 'nog niet ingesteld') || str_contains($e, 'not configured') => 'De Microsoft-koppeling voor '.$sender.' is niet ingesteld, dus de mail kon niet worden verstuurd.',
            str_contains($e, 'microsoft 365 is niet bereikbaar') || str_contains($e, 'mislukt: geen verbinding') => 'Microsoft 365 was niet bereikbaar. Later opnieuw proberen.',
            str_contains($e, 'weigert de aanmelding') || str_contains($e, 'aanmelden bij microsoft 365') || preg_match('/\b401\b|unauthori[sz]ed|invalid_client/', $e) === 1 => 'Aanmelden bij Microsoft 365 mislukt. Controleer de app-registratie en het client secret (mogelijk verlopen).',
            str_contains($e, 'geen toestemming') || preg_match('/\b403\b|erroraccessdenied|access ?denied|forbidden/', $e) === 1 => 'Geen toestemming om te versturen namens '.$sender.'. Controleer de Mail.Send-machtiging in Microsoft 365.',
            str_contains($e, 'niet gevonden in microsoft') || preg_match('/\b404\b|errorinvaliduser|mailboxnotenabled/', $e) === 1 => 'De afzendermailbox '.$sender.' is niet gevonden in Microsoft 365.',
            str_contains($e, 'beperkt tijdelijk') || preg_match('/\b429\b|too many requests/', $e) === 1 => 'Microsoft 365 liet tijdelijk geen mails meer toe. Later opnieuw proberen.',
            str_contains($e, 'te groot') || preg_match('/\b413\b|too large/', $e) === 1 => 'De e-mail of de bijlagen waren te groot om via Microsoft 365 te versturen.',
            str_contains($e, 'geen ontvanger') => 'De e-mail had geen ontvanger en is niet verstuurd.',
            str_contains($e, 'berichtformaat') => 'De e-mail had een formaat dat Microsoft 365 niet aanneemt.',
            preg_match('/rfc ?2822|rfc ?5322|does not comply|invalid (e-?mail|address|recipient)|ongeldig/', $e) === 1 => 'Het e-mailadres van de ontvanger is ongeldig.',
            preg_match('/\b55[0-4]\b|user unknown|mailbox unavailable|recipient (address )?rejected|no such user/', $e) === 1 => 'De mailserver weigerde het adres van de ontvanger (bestaat mogelijk niet).',
            str_contains($e, 'e-mail geweigerd') || str_contains($e, 'http 400') => 'Microsoft 365 weigerde de mail. Controleer het e-mailadres van de ontvanger.',
            preg_match('/\b535\b|authentication|failed to authenticate|username and password/', $e) === 1 => 'Aanmelden bij de mailserver (SMTP) mislukt. Controleer gebruikersnaam en wachtwoord bij de mailinstellingen.',
            preg_match('/connection could not be established|timed out|could not connect|niet bereikbaar|geen verbinding|getaddrinfo|connection refused/', $e) === 1 => 'De mailserver was niet bereikbaar. Later opnieuw proberen of de mailinstellingen controleren.',
            str_contains($e, 'smtp') && (str_contains($e, 'config') || str_contains($e, 'instelling')) => 'De mailinstellingen (SMTP) ontbreken of zijn onvolledig.',
            default => null,
        };
    }
}
