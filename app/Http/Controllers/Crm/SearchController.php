<?php

namespace App\Http\Controllers\Crm;

use App\Models\GarageCompany;
use App\Models\SepaMandate;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Globale zoekfunctie (command palette in de kopbalk). Alleen lezen.
 */
class SearchController
{
    private const LIMIT = 8;

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user || $user->isCustomerAccount(), 403);

        $term = trim(Str::limit((string) $request->query('q', ''), 100, ''));
        if (mb_strlen($term) < 2) {
            return response()->json(['groups' => []]);
        }

        $like = '%'.addcslashes($term, '%_\\').'%';
        $compact = preg_replace('/[\s\.\-]+/', '', $term) ?? $term;
        $compactLike = '%'.addcslashes(Str::upper($compact), '%_\\').'%';

        // IBAN (exact of gedeeltelijk, spaties genegeerd) via mandaten.
        $ibanCompanyIds = [];
        if (mb_strlen($compact) >= 4) {
            $ibanCompanyIds = SepaMandate::query()
                ->whereRaw("UPPER(REPLACE(iban, ' ', '')) LIKE ?", [$compactLike])
                ->limit(50)
                ->pluck('garage_company_id')
                ->unique()
                ->values()
                ->all();
        }

        $companies = GarageCompany::query()
            ->with('primaryPerson')
            ->where(function ($q) use ($like, $compact, $compactLike, $ibanCompanyIds) {
                $q->where('bedrijfsnaam', 'like', $like)
                    ->orWhere('hoofd_email', 'like', $like)
                    ->orWhere('login_email', 'like', $like)
                    ->orWhere('hoofd_telefoon', 'like', $like)
                    // Alleen met minstens 2 tekens na het weghalen van spaties/streepjes;
                    // anders wordt het patroon '%%' en matcht elk telefoonnummer.
                    ->when(mb_strlen($compact) >= 2, fn ($qq) => $qq->orWhereRaw("REPLACE(REPLACE(hoofd_telefoon, ' ', ''), '-', '') LIKE ?", [$compactLike]))
                    ->orWhere('plaats', 'like', $like)
                    ->orWhere('kvk_nummer', 'like', $like)
                    ->orWhereHas('customerPersons', function ($p) use ($like) {
                        $p->where(function ($pp) use ($like) {
                            $pp->where('voornaam', 'like', $like)
                                ->orWhere('achternaam', 'like', $like)
                                ->orWhereRaw($this->fullNameSql().' LIKE ?', [$like]);
                        });
                    });

                if ($ibanCompanyIds !== []) {
                    $q->orWhereIn('id', $ibanCompanyIds);
                }
            })
            ->orderByRaw('case when bedrijfsnaam like ? then 0 else 1 end', [addcslashes($term, '%_\\').'%'])
            ->orderBy('bedrijfsnaam')
            ->limit(self::LIMIT)
            ->get(['id', 'bedrijfsnaam', 'plaats', 'status', 'hoofd_email', 'kvk_nummer'])
            ->map(function (GarageCompany $company) use ($ibanCompanyIds) {
                $person = $company->primaryPerson;
                $parts = array_filter([
                    $company->status?->label(),
                    $company->plaats,
                    $person ? trim("{$person->voornaam} {$person->achternaam}") : null,
                    $company->hoofd_email,
                    in_array($company->id, $ibanCompanyIds, true) ? 'IBAN gevonden' : null,
                ]);

                return [
                    'id' => $company->id,
                    'title' => $company->bedrijfsnaam,
                    'subtitle' => implode(' | ', $parts),
                    'url' => route('crm.garage_companies.show', ['garageCompany' => $company->id]),
                ];
            })
            ->values();

        $tasks = Task::query()
            ->with('project:id,naam')
            ->where('titel', 'like', $like)
            ->orderByRaw("case when status = 'afgerond' then 1 else 0 end")
            ->orderByDesc('updated_at')
            ->limit(self::LIMIT)
            ->get(['id', 'task_project_id', 'titel', 'status', 'deadline'])
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->titel,
                'subtitle' => implode(' | ', array_filter([
                    $task->project?->naam,
                    $task->status ? Str::ucfirst(str_replace('_', ' ', $task->status->value)) : null,
                    $task->deadline ? 'Deadline '.$task->deadline->format('d-m-Y') : null,
                ])),
                'url' => route('crm.tasks.show', ['task' => $task->id]),
            ])
            ->values();

        return response()->json([
            'groups' => [
                ['key' => 'klanten', 'label' => 'Klanten', 'items' => $companies],
                ['key' => 'taken', 'label' => 'Taken', 'items' => $tasks],
            ],
        ]);
    }

    private function fullNameSql(): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? "(voornaam || ' ' || achternaam)"
            : "CONCAT(voornaam, ' ', achternaam)";
    }
}
