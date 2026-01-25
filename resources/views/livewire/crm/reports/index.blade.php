<div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight">Rapportages</h1>
            <div class="mt-1 text-sm text-zinc-600">
                Periode: {{ $range['start']->format('d-m-Y') }} t/m {{ $range['end']->format('d-m-Y') }}
            </div>
        </div>

        <div class="w-full sm:w-auto">
            <div class="rounded-xl border border-zinc-200 bg-white p-4">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
                    <div>
                        <label class="block text-xs font-medium text-zinc-600">Periode</label>
                        <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="preset">
                            @foreach($this->presetOptions() as $key => $label)
                                <option value="{{ $key }}">{{ $label }}</option>
                            @endforeach
                        </select>
                    </div>

                    @if($preset === 'custom')
                        <div>
                            <label class="block text-xs font-medium text-zinc-600">Van</label>
                            <input type="date" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="from" />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-zinc-600">Tot</label>
                            <input type="date" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="to" />
                        </div>
                    @else
                        <div class="sm:col-span-2 flex justify-end">
                            <div class="hidden sm:block text-xs text-zinc-500 self-center">
                                Tip: kies “Aangepast” voor datumrange.
                            </div>
                        </div>
                    @endif

                    <div class="sm:col-span-3 flex items-center justify-between gap-3">
                        <div class="text-xs text-rose-600">
                            @error('from') {{ $message }} @enderror
                            @error('to') {{ $message }} @enderror
                            @error('preset') {{ $message }} @enderror
                        </div>
                        <button type="button" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" wire:click="applyFilters">
                            Toepassen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Totaal klanten</div>
            <div class="mt-1 text-2xl font-semibold">{{ number_format($kpis['companies_total'], 0, ',', '.') }}</div>
            <div class="mt-1 text-xs text-zinc-500">Actief: {{ number_format($kpis['companies_active'], 0, ',', '.') }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Nieuwe leads</div>
            <div class="mt-1 text-2xl font-semibold">{{ number_format($kpis['leads_new'], 0, ',', '.') }}</div>
            <div class="mt-1 text-xs text-zinc-500">Gebaseerd op aanmaakdatum</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Nieuw actief</div>
            <div class="mt-1 text-2xl font-semibold">{{ number_format($kpis['active_new'], 0, ',', '.') }}</div>
            <div class="mt-1 text-xs text-zinc-500">Actief vanaf</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Opzeggingen</div>
            <div class="mt-1 text-2xl font-semibold">{{ number_format($kpis['cancelled'], 0, ',', '.') }}</div>
            <div class="mt-1 text-xs text-zinc-500">Binnen periode</div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Demo aangevraagd</div>
            <div class="mt-1 text-2xl font-semibold">{{ number_format($kpis['demo_requested'], 0, ',', '.') }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Demo gepland</div>
            <div class="mt-1 text-2xl font-semibold">{{ number_format($kpis['demo_scheduled'], 0, ',', '.') }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Verloren</div>
            <div class="mt-1 text-2xl font-semibold">{{ number_format($kpis['lost'], 0, ',', '.') }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Actieve seats</div>
            <div class="mt-1 text-2xl font-semibold">{{ number_format($kpis['active_seats'], 0, ',', '.') }}</div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">MRR excl. btw</div>
            <div class="mt-1 text-2xl font-semibold">€ {{ number_format($kpis['mrr_excl'], 2, ',', '.') }}</div>
            <div class="mt-1 text-xs text-zinc-500">Incl. btw: € {{ number_format($kpis['mrr_incl'], 2, ',', '.') }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Mandaten actief</div>
            <div class="mt-1 text-2xl font-semibold">{{ number_format($kpis['mandates_active'], 0, ',', '.') }}</div>
            <div class="mt-1 text-xs text-zinc-500">Pending: {{ number_format($kpis['mandates_pending'], 0, ',', '.') }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Actief zonder mandaat</div>
            <div class="mt-1 text-2xl font-semibold">{{ number_format($kpis['active_without_mandate'], 0, ',', '.') }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">BTW component</div>
            <div class="mt-1 text-2xl font-semibold">€ {{ number_format($kpis['mrr_btw'], 2, ',', '.') }}</div>
            <div class="mt-1 text-xs text-zinc-500">Op basis van actieve modules</div>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="rounded-xl border border-zinc-200 bg-white p-6 lg:col-span-1">
            <div class="text-sm font-semibold">Funnel (totaal)</div>
            <div class="mt-4 space-y-2 text-sm">
                @php
                    $labels = [
                        'lead' => 'Lead',
                        'demo_aangevraagd' => 'Demo aangevraagd',
                        'demo_gepland' => 'Demo gepland',
                        'proefperiode' => 'Proefperiode',
                        'actief' => 'Actief',
                        'opgezegd' => 'Opgezegd',
                        'verloren' => 'Verloren',
                    ];
                @endphp
                @foreach($labels as $key => $label)
                    <div class="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2">
                        <div class="text-zinc-700">{{ $label }}</div>
                        <div class="font-semibold">{{ number_format((int)($funnel[$key] ?? 0), 0, ',', '.') }}</div>
                    </div>
                @endforeach
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-6 lg:col-span-2">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div class="text-sm font-semibold">Modules</div>
                    <div class="mt-1 text-xs text-zinc-500">
                        Aantal modules: {{ number_format($kpis['modules_total'], 0, ',', '.') }} ·
                        Actieve modules: {{ number_format($kpis['modules_active'], 0, ',', '.') }} ·
                        Actieve abonnementen: {{ number_format($kpis['modules_active_subscriptions'], 0, ',', '.') }}
                        @if($kpis['modules_invalid_price_count'] > 0)
                            · <span class="font-semibold text-rose-700">{{ number_format($kpis['modules_invalid_price_count'], 0, ',', '.') }} met prijs 0 (actief)</span>
                        @endif
                    </div>
                </div>
                <div class="text-xs text-zinc-700">
                    Totaal: <span class="font-semibold">&euro; {{ number_format($kpis['mrr_excl'], 2, ',', '.') }}</span> excl. btw
                    &middot; BTW <span class="font-semibold">&euro; {{ number_format($kpis['mrr_btw'], 2, ',', '.') }}</span>
                    &middot; <span class="font-semibold">&euro; {{ number_format($kpis['mrr_incl'], 2, ',', '.') }}</span> incl. btw
                </div>
            </div>

            <div class="mt-4 overflow-hidden rounded-lg border border-zinc-200">
                <table class="min-w-full divide-y divide-zinc-100">
                    <thead class="bg-zinc-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Actief</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Module</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-zinc-600">Prijs (excl. btw)</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-zinc-600">BTW %</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                        @forelse($modulesOverview as $row)
                            <tr class="hover:bg-zinc-50">
                                <td class="px-4 py-3 text-sm">
                                    <div class="inline-flex items-center gap-2">
                                        <span class="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700">
                                            {{ number_format((int) $row->active_subscriptions, 0, ',', '.') }}
                                        </span>
                                        @if((int) $row->active_subscriptions > 0 && (int) $row->invalid_price_count > 0)
                                            <span class="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                                prijs 0
                                            </span>
                                        @endif
                                    </div>
                                </td>
                                <td class="px-4 py-3 text-sm font-semibold">{{ $row->naam }}</td>
                                <td class="px-4 py-3 text-right text-sm font-semibold">&euro; {{ number_format((float) $row->mrr_excl, 2, ',', '.') }}</td>
                                <td class="px-4 py-3 text-right text-sm text-zinc-700">
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
                                <td colspan="4" class="px-4 py-6 text-center text-sm text-zinc-500">Nog geen modules.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            <div class="mt-3 text-xs text-zinc-500">
                Let op: in klantdossiers geldt “actief” &rarr; prijs &gt; 0 (excl. btw) verplicht.
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="rounded-xl border border-zinc-200 bg-white p-6 lg:col-span-2">
            <div class="text-sm font-semibold">Top 10 klanten op MRR (actief)</div>
            <div class="mt-4 overflow-hidden rounded-lg border border-zinc-200">
                <table class="min-w-full divide-y divide-zinc-100">
                    <thead class="bg-zinc-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Klant</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Plaats</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-zinc-600">MRR excl.</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                        @forelse($topCustomers as $row)
                            <tr class="hover:bg-zinc-50">
                                <td class="px-4 py-3 text-sm font-semibold">{{ $row->bedrijfsnaam }}</td>
                                <td class="px-4 py-3 text-sm text-zinc-600">{{ $row->plaats }}</td>
                                <td class="px-4 py-3 text-right text-sm font-semibold">€ {{ number_format((float) $row->mrr_excl, 2, ',', '.') }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="3" class="px-4 py-6 text-center text-sm text-zinc-500">Nog geen data.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-6 lg:col-span-1">
            <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold">Opzeggingen per maand</div>
                <div class="text-xs text-zinc-500">Laatste 6 maanden</div>
            </div>

            @php
                $max = max(1, (int) ($cancellationsByMonth->max('total') ?? 1));
            @endphp

            <div class="mt-4 space-y-2">
                @foreach($cancellationsByMonth as $item)
                    @php
                        $w = (int) round(((int) $item['total'] / $max) * 100);
                    @endphp
                    <div class="flex items-center gap-3">
                        <div class="w-16 text-xs text-zinc-600">{{ $item['month']->format('m-Y') }}</div>
                        <div class="flex-1">
                            <div class="h-2 overflow-hidden rounded-full bg-zinc-100">
                                <div class="h-2 rounded-full bg-rose-500" style="width: {{ $w }}%"></div>
                            </div>
                        </div>
                        <div class="w-10 text-right text-xs font-semibold">{{ (int) $item['total'] }}</div>
                    </div>
                @endforeach
            </div>
        </div>
    </div>
</div>
