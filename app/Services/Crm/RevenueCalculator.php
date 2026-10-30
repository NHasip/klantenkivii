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
}
