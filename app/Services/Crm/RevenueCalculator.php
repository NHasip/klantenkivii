<?php

namespace App\Services\Crm;

use App\Enums\GarageCompanyStatus;
use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;

/**
 * Eén plek voor de berekening van maandomzet (MRR).
 *
 * Omzet = som van actieve modulekoppelingen (actief, binnen start/einddatum,
 * prijs x aantal) van klanten met status Actief die niet in de prullenbak staan.
 * Demo-klanten (status proefperiode, incl. oude waarde demo_gepland) tellen niet
 * mee in de omzet maar als aparte "Pijplijn (demo)".
 */
class RevenueCalculator
{
    /**
     * @return list<string>
     */
    public static function activeStatuses(): array
    {
        return [GarageCompanyStatus::Actief->value];
    }

    /**
     * @return list<string>
     */
    public static function demoStatuses(): array
    {
        return [GarageCompanyStatus::Proefperiode->value, GarageCompanyStatus::DemoGepland->value];
    }

    public static function today(): string
    {
        return CarbonImmutable::now('Europe/Amsterdam')->toDateString();
    }

    /**
     * Beperk een garage_company_modules query tot modules die vandaag actief zijn.
     */
    public static function constrainActiveModules($query, string $prefix = 'garage_company_modules.'): mixed
    {
        $today = self::today();

        return $query
            ->where($prefix.'actief', true)
            ->where(function ($q) use ($today, $prefix) {
                $q->whereNull($prefix.'startdatum')->orWhere($prefix.'startdatum', '<=', $today);
            })
            ->where(function ($q) use ($today, $prefix) {
                $q->whereNull($prefix.'einddatum')->orWhere($prefix.'einddatum', '>=', $today);
            });
    }

    public static function exclExpression(string $prefix = 'garage_company_modules.'): Expression
    {
        return GarageCompanyModule::hasAantalColumn()
            ? DB::raw("({$prefix}prijs_maand_excl * {$prefix}aantal)")
            : DB::raw("({$prefix}prijs_maand_excl)");
    }

    public static function btwExpression(string $prefix = 'garage_company_modules.'): Expression
    {
        return GarageCompanyModule::hasAantalColumn()
            ? DB::raw("(({$prefix}prijs_maand_excl * {$prefix}aantal) * ({$prefix}btw_percentage / 100))")
            : DB::raw("({$prefix}prijs_maand_excl * ({$prefix}btw_percentage / 100))");
    }

    /**
     * Subquery met id's van (niet verwijderde) bedrijven met de opgegeven statussen.
     *
     * @param  list<string>  $statuses
     */
    public static function companyIdsWithStatus(array $statuses): Builder
    {
        return GarageCompany::query()
            ->whereIn('garage_companies.status', $statuses)
            ->select('garage_companies.id');
    }

    /**
     * Actieve modulekoppelingen van bedrijven met de opgegeven statussen.
     *
     * @param  list<string>|null  $statuses  null = alle statussen
     * @param  Builder|null  $companyQuery  optioneel: beperk tot deze bedrijven (filters klantenlijst)
     */
    public static function activeModulesQuery(?array $statuses = null, ?Builder $companyQuery = null): Builder
    {
        $query = self::constrainActiveModules(GarageCompanyModule::query());

        $companies = $companyQuery ? (clone $companyQuery) : GarageCompany::query();
        if ($statuses !== null) {
            $companies->whereIn('garage_companies.status', $statuses);
        }

        $query->whereIn('garage_company_modules.garage_company_id', $companies->select('garage_companies.id'));

        return $query;
    }

    /**
     * @param  list<string>|null  $statuses
     * @return array{excl: float, btw: float, incl: float}
     */
    public static function totals(?array $statuses = null, ?Builder $companyQuery = null): array
    {
        $base = self::activeModulesQuery($statuses ?? self::activeStatuses(), $companyQuery);

        $excl = round((float) (clone $base)->sum(self::exclExpression()), 2);
        $btw = round((float) (clone $base)->sum(self::btwExpression()), 2);

        return [
            'excl' => $excl,
            'btw' => $btw,
            'incl' => round($excl + $btw, 2),
        ];
    }

    /**
     * @return array{excl: float, btw: float, incl: float}
     */
    public static function mrr(?Builder $companyQuery = null): array
    {
        return self::totals(self::activeStatuses(), $companyQuery);
    }

    /**
     * @return array{excl: float, btw: float, incl: float}
     */
    public static function demoPipeline(?Builder $companyQuery = null): array
    {
        return self::totals(self::demoStatuses(), $companyQuery);
    }

    /**
     * MRR (excl. btw) per maand voor de laatste $months maanden, berekend uit de
     * start- en einddatums van modulekoppelingen en de actief/opzeg/verloren-datums
     * van klanten. Peildatum is het einde van elke maand (voor de huidige maand:
     * vandaag). De laatste maand gebruikt exact mrr(), zodat het getal gelijk is
     * aan het dashboard. Historie is een benadering: er is geen statuslog.
     *
     * @return list<array{month: string, label: string, excl: float}>
     */
    public static function mrrHistory(int $months = 12): array
    {
        $tz = 'Europe/Amsterdam';
        $now = CarbonImmutable::now($tz);
        $hasAantal = GarageCompanyModule::hasAantalColumn();

        $select = [
            'garage_company_modules.actief',
            'garage_company_modules.prijs_maand_excl',
            'garage_company_modules.startdatum',
            'garage_company_modules.einddatum',
            'garage_companies.status as company_status',
            'garage_companies.actief_vanaf',
            'garage_companies.created_at as company_created_at',
            'garage_companies.opgezegd_op',
            'garage_companies.verloren_op',
        ];
        if ($hasAantal) {
            $select[] = 'garage_company_modules.aantal';
        }

        $rows = GarageCompanyModule::query()
            ->join('garage_companies', 'garage_companies.id', '=', 'garage_company_modules.garage_company_id')
            ->whereIn('garage_company_modules.garage_company_id', GarageCompany::query()->select('garage_companies.id'))
            ->where(function ($q) {
                // Huidig actieve modules, of beëindigde modules met een einddatum (historie).
                $q->where('garage_company_modules.actief', true)
                    ->orWhereNotNull('garage_company_modules.einddatum');
            })
            ->get($select)
            ->map(function ($row) use ($tz, $hasAantal) {
                $date = fn ($value) => $value ? CarbonImmutable::parse($value, $tz)->toDateString() : null;
                $since = $date($row->actief_vanaf);
                if ($since === null && (string) $row->company_status === GarageCompanyStatus::Actief->value) {
                    $since = $date($row->company_created_at);
                }

                return [
                    'amount' => (float) $row->prijs_maand_excl * ($hasAantal ? max(0, (int) ($row->aantal ?? 1)) : 1),
                    'start' => $date($row->startdatum),
                    'end' => $date($row->einddatum),
                    'since' => $since,
                    'opgezegd' => $date($row->opgezegd_op),
                    'verloren' => $date($row->verloren_op),
                ];
            });

        $result = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $month = $now->startOfMonth()->subMonthsNoOverflow($i);
            $label = $month->locale('nl')->translatedFormat('M Y');

            if ($i === 0) {
                $result[] = ['month' => $month->format('Y-m'), 'label' => $label, 'excl' => self::mrr()['excl']];

                continue;
            }

            $peil = $month->endOfMonth()->toDateString();
            $sum = 0.0;
            foreach ($rows as $row) {
                if ($row['start'] !== null && $row['start'] > $peil) {
                    continue;
                }
                if ($row['end'] !== null && $row['end'] < $peil) {
                    continue;
                }
                if ($row['since'] === null || $row['since'] > $peil) {
                    continue;
                }
                foreach (['opgezegd', 'verloren'] as $stop) {
                    if ($row[$stop] !== null && $row[$stop] <= $peil && $row[$stop] >= $row['since']) {
                        continue 2;
                    }
                }
                $sum += $row['amount'];
            }

            $result[] = ['month' => $month->format('Y-m'), 'label' => $label, 'excl' => round($sum, 2)];
        }

        return $result;
    }
}
