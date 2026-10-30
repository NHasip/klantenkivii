<?php

namespace App\Services\Crm;

use App\Enums\SepaMandateStatus;
use App\Models\GarageCompany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

/**
 * Eén definitie van "Actief zonder (complete) SEPA", gedeeld door dashboard en rapportages.
 */
class SepaChecklist
{
    /**
     * Actieve klanten waarbij voor incasso nog iets ontbreekt.
     *
     * @return Collection<int, array{id:int, bedrijfsnaam:string, url:string, missing:list<string>}>
     */
    public static function activeCompaniesWithIssues(): Collection
    {
        $hasIncassoKenmerkColumn = Schema::hasColumn('garage_companies', 'incasso_kenmerk_machtiging');
        $columns = ['id', 'bedrijfsnaam'];
        if ($hasIncassoKenmerkColumn) {
            $columns[] = 'incasso_kenmerk_machtiging';
        }

        return GarageCompany::query()
            ->whereIn('status', RevenueCalculator::activeStatuses())
            ->with(['mandates' => fn ($q) => $q->orderByDesc('created_at')])
            ->orderBy('bedrijfsnaam')
            ->get($columns)
            ->map(function (GarageCompany $company) use ($hasIncassoKenmerkColumn) {
                $activeMandate = $company->mandates->firstWhere('status', SepaMandateStatus::Actief);
                $missing = [];

                if (! $activeMandate) {
                    $missing[] = 'Geen actief SEPA mandaat';
                } else {
                    if (! filled($activeMandate->iban)) {
                        $missing[] = 'IBAN ontbreekt';
                    }
                    if (! $activeMandate->datum_van_tekenen) {
                        $missing[] = 'Machtigingsdatum ontbreekt';
                    }
                }

                if (! $hasIncassoKenmerkColumn) {
                    $missing[] = 'Incasso velden nog niet gemigreerd';
                } elseif (! filled($company->getAttribute('incasso_kenmerk_machtiging'))) {
                    $missing[] = 'Kenmerk machtiging ontbreekt';
                }

                if (round((float) $company->active_mrr_incl, 2) <= 0) {
                    $missing[] = 'Maandbedrag incl. btw is 0';
                }

                if ($missing === []) {
                    return null;
                }

                return [
                    'id' => $company->id,
                    'bedrijfsnaam' => $company->bedrijfsnaam,
                    'url' => route('crm.garage_companies.show', ['garageCompany' => $company->id, 'tab' => 'incasso']),
                    'missing' => $missing,
                ];
            })
            ->filter()
            ->values();
    }
}
