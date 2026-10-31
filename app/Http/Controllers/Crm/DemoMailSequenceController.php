<?php

namespace App\Http\Controllers\Crm;

use App\Enums\GarageCompanyStatus;
use App\Http\Controllers\Controller;
use App\Models\DemoMailStep;
use App\Models\GarageCompany;
use App\Services\Crm\DemoMailSequenceService;
use Illuminate\Http\RedirectResponse;

/** Handmatig stoppen, opnieuw starten of één mail direct versturen (alleen admin). */
class DemoMailSequenceController extends Controller
{
    public function __construct(private readonly DemoMailSequenceService $service) {}

    public function stop(GarageCompany $garageCompany): RedirectResponse
    {
        if (! DemoMailSequenceService::available()) {
            return back()->with('status', 'De database-migratie voor de demo-mailreeks ontbreekt nog.');
        }
        $name = auth()->user()?->name;
        $stopped = $this->service->stop($garageCompany, 'Handmatig gestopt'.($name ? ' door '.$name : ''), auth()->id());

        return back()->with('status', $stopped ? 'Demo-mailreeks gestopt.' : 'Er loopt geen demo-mailreeks.');
    }

    public function restart(GarageCompany $garageCompany): RedirectResponse
    {
        if (! DemoMailSequenceService::available()) {
            return back()->with('status', 'De database-migratie voor de demo-mailreeks ontbreekt nog.');
        }
        if (GarageCompanyStatus::normalize((string) $garageCompany->status?->value) !== GarageCompanyStatus::Proefperiode->value) {
            return back()->with('status', 'De demo-mailreeks kan alleen starten als de klant op Demo staat.');
        }
        $this->service->start($garageCompany, auth()->id());

        return back()->with('status', 'Demo-mailreeks gestart. De eerste mail gaat over 2 dagen uit.');
    }

    /** Eén geplande of mislukte stap direct versturen, buiten het verzendvenster en de geplande datum om. */
    public function sendNow(GarageCompany $garageCompany, int $step): RedirectResponse
    {
        if (! DemoMailSequenceService::available()) {
            return back()->with('error', 'De database-migratie voor de demo-mailreeks ontbreekt nog.');
        }
        $model = DemoMailStep::query()
            ->whereKey($step)
            ->where('garage_company_id', $garageCompany->id)
            ->first();
        if (! $model) {
            return back()->with('error', 'Deze mail hoort niet bij deze klant.');
        }

        $result = $this->service->sendNow($garageCompany, $model, auth()->id());

        return back()->with($result['ok'] ? 'status' : 'error', $result['message']);
    }
}
