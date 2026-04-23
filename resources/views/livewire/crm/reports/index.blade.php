<div class="space-y-5">
    <div class="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
                <h1 class="text-2xl font-semibold tracking-tight">Rapportages</h1>
                <div class="mt-2 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">
                    Periode: {{ $range['start']->format('d-m-Y') }} t/m {{ $range['end']->format('d-m-Y') }}
                </div>
            </div>

            <div class="w-full xl:max-w-3xl">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-6 sm:items-end">
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-medium text-zinc-600">Periode</label>
                        <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="preset">
                            @foreach($this->presetOptions() as $key => $label)
                                <option value="{{ $key }}">{{ $label }}</option>
                            @endforeach
                        </select>
                    </div>

                    @if($preset === 'custom')
                        <div class="sm:col-span-2">
                            <label class="block text-xs font-medium text-zinc-600">Van</label>
                            <input type="date" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="from" />
                        </div>
                        <div class="sm:col-span-2">
                            <label class="block text-xs font-medium text-zinc-600">Tot</label>
                            <input type="date" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="to" />
                        </div>
                    @else
                        <div class="sm:col-span-4 hidden sm:block">
                            <div class="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                                Kies "Aangepast" voor vrije datumselectie.
                            </div>
                        </div>
                    @endif

                    <div class="sm:col-span-6 flex items-center justify-between gap-3">
                        <div class="text-xs text-rose-600">
                            @error('from') {{ $message }} @enderror
                            @error('to') {{ $message }} @enderror
                            @error('preset') {{ $message }} @enderror
                        </div>
                        <button type="button" class="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700" wire:click="applyFilters">
                            Toepassen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    @php
        $activeRatio = $kpis['companies_total'] > 0
            ? (int) round(($kpis['companies_active'] / $kpis['companies_total']) * 100)
            : 0;
        $funnelLabels = [
            'lead' => 'Lead',
            'demo_aangevraagd' => 'Demo aangevraagd',
            'demo_gepland' => 'Demo gepland',
            'proefperiode' => 'Proefperiode',
            'actief' => 'Actief',
            'opgezegd' => 'Opgezegd',
            'verloren' => 'Verloren',
        ];
        $funnelMax = max(1, collect(array_keys($funnelLabels))->max(fn ($key) => (int) ($funnel[$key] ?? 0)));
        $topModules = $modulesOverview->sortByDesc(fn ($row) => (float) $row->mrr_excl)->take(3);
    @endphp

    <div class="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div class="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 xl:col-span-6">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="text-xs font-medium uppercase tracking-wide text-zinc-500">Omzet per maand</div>
                    <div class="mt-1 text-3xl font-semibold text-zinc-900">&euro; {{ number_format($kpis['mrr_excl'], 2, ',', '.') }}</div>
                    <div class="mt-1 text-xs text-zinc-600">Excl. btw</div>
                </div>
                <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
                    <div class="text-xs font-medium text-emerald-700">Incl. btw</div>
                    <div class="text-sm font-semibold text-emerald-800">&euro; {{ number_format($kpis['mrr_incl'], 2, ',', '.') }}</div>
                </div>
            </div>
            <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div class="text-xs text-zinc-500">BTW component</div>
                    <div class="text-sm font-semibold text-zinc-800">&euro; {{ number_format($kpis['mrr_btw'], 2, ',', '.') }}</div>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div class="text-xs text-zinc-500">Actieve modules</div>
                    <div class="text-sm font-semibold text-zinc-800">{{ number_format($kpis['modules_active_subscriptions'], 0, ',', '.') }}</div>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div class="text-xs text-zinc-500">Actieve seats</div>
                    <div class="text-sm font-semibold text-zinc-800">{{ number_format($kpis['active_seats'], 0, ',', '.') }}</div>
                </div>
            </div>
        </div>

        <div class="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 xl:col-span-3">
            <div class="text-xs font-medium uppercase tracking-wide text-zinc-500">Klanten</div>
            <div class="mt-2 text-2xl font-semibold">{{ number_format($kpis['companies_total'], 0, ',', '.') }}</div>
            <div class="mt-1 text-sm text-zinc-600">Actief: {{ number_format($kpis['companies_active'], 0, ',', '.') }} ({{ $activeRatio }}%)</div>
            <div class="mt-auto pt-4">
                <div class="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div class="h-2 rounded-full bg-zinc-800" style="width: {{ min(100, max(0, $activeRatio)) }}%"></div>
                </div>
            </div>
        </div>

        <div class="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 xl:col-span-3">
            <div class="text-xs font-medium uppercase tracking-wide text-zinc-500">Instroom</div>
            <div class="mt-3 space-y-2 text-sm">
                <div class="flex items-center justify-between">
                    <span class="text-zinc-600">Nieuwe leads</span>
                    <span class="font-semibold">{{ number_format($kpis['leads_new'], 0, ',', '.') }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-zinc-600">Demo aangevraagd</span>
                    <span class="font-semibold">{{ number_format($kpis['demo_requested'], 0, ',', '.') }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-zinc-600">Demo gepland</span>
                    <span class="font-semibold">{{ number_format($kpis['demo_scheduled'], 0, ',', '.') }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-zinc-600">Nieuw actief</span>
                    <span class="font-semibold">{{ number_format($kpis['active_new'], 0, ',', '.') }}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <div class="h-full rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <div class="text-xs text-zinc-500">Mandaten actief</div>
            <div class="text-sm font-semibold">{{ number_format($kpis['mandates_active'], 0, ',', '.') }}</div>
        </div>
        <div class="h-full rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <div class="text-xs text-zinc-500">Mandaten pending</div>
            <div class="text-sm font-semibold">{{ number_format($kpis['mandates_pending'], 0, ',', '.') }}</div>
        </div>
        <div class="h-full rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <div class="text-xs text-zinc-500">Actief zonder mandaat</div>
            <div class="text-sm font-semibold">{{ number_format($kpis['active_without_mandate'], 0, ',', '.') }}</div>
        </div>
        <div class="h-full rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <div class="text-xs text-zinc-500">Opzeggingen</div>
            <div class="text-sm font-semibold">{{ number_format($kpis['cancelled'], 0, ',', '.') }}</div>
        </div>
        <div class="h-full rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <div class="text-xs text-zinc-500">Verloren</div>
            <div class="text-sm font-semibold">{{ number_format($kpis['lost'], 0, ',', '.') }}</div>
        </div>
        <div class="h-full rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <div class="text-xs text-zinc-500">Beschikbare modules</div>
            <div class="text-sm font-semibold">{{ number_format($kpis['modules_total'], 0, ',', '.') }}</div>
        </div>
    </div>

    <div class="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div class="h-full rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-4">
            <div class="flex items-center justify-between gap-2">
                <div class="text-sm font-semibold">Funnel overzicht</div>
                <div class="text-xs text-zinc-500">Totaalbestand</div>
            </div>
            <div class="mt-4 space-y-2">
                @foreach($funnelLabels as $key => $label)
                    @php
                        $total = (int) ($funnel[$key] ?? 0);
                        $width = (int) round(($total / $funnelMax) * 100);
                    @endphp
                    <div class="rounded-lg border border-zinc-100 px-3 py-2">
                        <div class="mb-1 flex items-center justify-between text-xs">
                            <span class="text-zinc-600">{{ $label }}</span>
                            <span class="font-semibold text-zinc-800">{{ number_format($total, 0, ',', '.') }}</span>
                        </div>
                        <div class="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                            <div class="h-1.5 rounded-full bg-zinc-700" style="width: {{ min(100, max(0, $width)) }}%"></div>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>

        <div class="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-8">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div class="text-sm font-semibold">Modules prestaties</div>
                    <div class="mt-1 text-xs text-zinc-500">
                        Actieve modules: {{ number_format($kpis['modules_active'], 0, ',', '.') }} van {{ number_format($kpis['modules_total'], 0, ',', '.') }}
                        &middot; Totaal aantallen: {{ number_format($kpis['modules_total_aantal'], 0, ',', '.') }}
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-2 sm:w-72">
                    @forelse($topModules as $module)
                        <div class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
                            <div class="flex items-center justify-between gap-2">
                                <span class="truncate font-medium text-zinc-700">{{ $module->naam }}</span>
                                <span class="font-semibold text-zinc-900">&euro; {{ number_format((float) $module->mrr_excl, 2, ',', '.') }}</span>
                            </div>
                        </div>
                    @empty
                        <div class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">Nog geen module-omzet.</div>
                    @endforelse
                </div>
            </div>

            <div class="mt-4 flex-1 overflow-hidden rounded-lg border border-zinc-200">
                <table class="min-w-full divide-y divide-zinc-100">
                    <thead class="bg-zinc-50">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Module</th>
                            <th class="px-3 py-2 text-right text-xs font-semibold text-zinc-600">Actief</th>
                            <th class="px-3 py-2 text-right text-xs font-semibold text-zinc-600">Aantal</th>
                            <th class="px-3 py-2 text-right text-xs font-semibold text-zinc-600">MRR excl.</th>
                            <th class="px-3 py-2 text-right text-xs font-semibold text-zinc-600">BTW %</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                        @forelse($modulesOverview as $row)
                            <tr class="hover:bg-zinc-50">
                                <td class="px-3 py-2 text-sm font-medium">{{ $row->naam }}</td>
                                <td class="px-3 py-2 text-right text-sm">{{ number_format((int) $row->active_subscriptions, 0, ',', '.') }}</td>
                                <td class="px-3 py-2 text-right text-sm">{{ number_format((int) $row->total_aantal, 0, ',', '.') }}</td>
                                <td class="px-3 py-2 text-right text-sm font-semibold">&euro; {{ number_format((float) $row->mrr_excl, 2, ',', '.') }}</td>
                                <td class="px-3 py-2 text-right text-sm text-zinc-600">
                                    @php
                                        $btwMin = (float) $row->btw_min;
                                        $btwMax = (float) $row->btw_max;
                                    @endphp
                                    @if(abs($btwMin - $btwMax) < 0.001)
                                        {{ number_format($btwMin, 0, ',', '.') }}
                                    @else
                                        {{ number_format($btwMin, 0, ',', '.') }}&ndash;{{ number_format($btwMax, 0, ',', '.') }}
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="5" class="px-3 py-6 text-center text-sm text-zinc-500">Nog geen modules.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div class="h-full rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-8">
            <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold">Top 10 klanten op MRR</div>
                <div class="text-xs text-zinc-500">Actieve module-omzet</div>
            </div>
            <div class="mt-4 overflow-hidden rounded-lg border border-zinc-200">
                <table class="min-w-full divide-y divide-zinc-100">
                    <thead class="bg-zinc-50">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Klant</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Plaats</th>
                            <th class="px-3 py-2 text-right text-xs font-semibold text-zinc-600">MRR excl.</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                        @forelse($topCustomers as $row)
                            <tr class="hover:bg-zinc-50">
                                <td class="px-3 py-2 text-sm font-medium">{{ $row->bedrijfsnaam }}</td>
                                <td class="px-3 py-2 text-sm text-zinc-600">{{ $row->plaats }}</td>
                                <td class="px-3 py-2 text-right text-sm font-semibold">&euro; {{ number_format((float) $row->mrr_excl, 2, ',', '.') }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="3" class="px-3 py-6 text-center text-sm text-zinc-500">Nog geen data.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        <div class="h-full rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-4">
            <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold">Opzeggingen per maand</div>
                <div class="text-xs text-zinc-500">Laatste 6 maanden</div>
            </div>

            @php
                $maxCancellations = max(1, (int) ($cancellationsByMonth->max('total') ?? 1));
            @endphp

            <div class="mt-4 space-y-2">
                @foreach($cancellationsByMonth as $item)
                    @php
                        $barWidth = (int) round(((int) $item['total'] / $maxCancellations) * 100);
                    @endphp
                    <div class="rounded-lg border border-zinc-100 px-3 py-2">
                        <div class="mb-1 flex items-center justify-between text-xs">
                            <span class="text-zinc-600">{{ $item['month']->format('m-Y') }}</span>
                            <span class="font-semibold text-zinc-800">{{ (int) $item['total'] }}</span>
                        </div>
                        <div class="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                            <div class="h-1.5 rounded-full bg-rose-500" style="width: {{ min(100, max(0, $barWidth)) }}%"></div>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    </div>
</div>
