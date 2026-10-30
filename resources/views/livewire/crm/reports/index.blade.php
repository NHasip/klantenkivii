<div class="min-w-0 space-y-5">
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
                        <label for="report_preset" class="block text-xs font-medium text-zinc-600">Periode</label>
                        <select id="report_preset" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="preset">
                            @foreach($this->presetOptions() as $key => $label)
                                <option value="{{ $key }}">{{ $label }}</option>
                            @endforeach
                        </select>
                    </div>

                    @if($preset === 'custom')
                        <div class="sm:col-span-2">
                            <label for="report_from" class="block text-xs font-medium text-zinc-600">Van</label>
                            <input id="report_from" type="date" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="from" />
                        </div>
                        <div class="sm:col-span-2">
                            <label for="report_to" class="block text-xs font-medium text-zinc-600">Tot</label>
                            <input id="report_to" type="date" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="to" />
                        </div>
                    @else
                        <div class="sm:col-span-4 hidden sm:block">
                            <div class="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                                <button type="button" class="font-semibold text-zinc-700 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-900" wire:click="$set('preset', 'custom')">
                                    Kies "Aangepast"
                                </button>
                                voor vrije datumselectie.
                            </div>
                        </div>
                    @endif

                    <div class="sm:col-span-6 flex flex-wrap items-center justify-between gap-3">
                        <div class="text-xs text-rose-600" role="alert">
                            @error('from') {{ $message }} @enderror
                            @error('to') {{ $message }} @enderror
                            @error('preset') {{ $message }} @enderror
                        </div>
                        <button type="button" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60" wire:click="applyFilters" wire:loading.attr="disabled" wire:target="applyFilters">
                            <span wire:loading.remove wire:target="applyFilters">Toepassen</span>
                            <span wire:loading wire:target="applyFilters">Laden...</span>
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
            'demo_aangevraagd' => 'Demo aangevraagd',
            'proefperiode' => 'Demo',
            'actief' => 'Actief',
            'opgezegd' => 'Opgezegd',
            'verloren' => 'Verloren',
        ];
        $funnelMax = max(1, collect(array_keys($funnelLabels))->max(fn ($key) => (int) ($funnel[$key] ?? 0)));
        $topModules = $modulesOverview->sortByDesc(fn ($row) => (float) $row->mrr_excl)->take(3);
    @endphp

    <div class="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div class="flex h-full min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 xl:col-span-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                    <div class="text-xs font-medium uppercase tracking-wide text-zinc-500">Omzet per maand</div>
                    <div class="mt-1 break-words text-3xl font-semibold text-zinc-900">&euro; {{ number_format($kpis['mrr_excl'], 2, ',', '.') }}</div>
                    <div class="mt-1 text-xs text-zinc-600">Excl. btw, alleen klanten met status Actief</div>
                </div>
                <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 sm:text-right">
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
                    <div class="text-xs text-zinc-500">Afgenomen modules</div>
                    <div class="text-sm font-semibold text-zinc-800">{{ number_format($kpis['modules_total_aantal'], 0, ',', '.') }}</div>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div class="text-xs text-zinc-500">Pijplijn (demo)</div>
                    <div class="text-sm font-semibold text-zinc-800">&euro; {{ number_format($kpis['demo_pipeline_excl'], 2, ',', '.') }}</div>
                </div>
            </div>
        </div>

        <div class="flex h-full min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 xl:col-span-3">
            <div class="text-xs font-medium uppercase tracking-wide text-zinc-500">Klanten</div>
            <a href="{{ $customersUrl }}" class="mt-2 block rounded text-2xl font-semibold hover:text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">{{ number_format($kpis['companies_total'], 0, ',', '.') }}</a>
            <a href="{{ $customersUrl }}?status=actief" class="mt-1 block rounded text-sm text-zinc-600 hover:text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">Actief: {{ number_format($kpis['companies_active'], 0, ',', '.') }} ({{ $activeRatio }}%)</a>
            <div class="mt-auto pt-4">
                <div class="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div class="h-2 rounded-full bg-zinc-800" style="width: {{ min(100, max(0, $activeRatio)) }}%"></div>
                </div>
            </div>
        </div>

        <div class="flex h-full min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 xl:col-span-3">
            <div class="text-xs font-medium uppercase tracking-wide text-zinc-500">Instroom in periode</div>
            <div class="mt-3 space-y-2 text-sm">
                <div class="flex items-center justify-between">
                    <span class="text-zinc-600">Nieuw toegevoegd</span>
                    <span class="font-semibold">{{ number_format($kpis['leads_new'], 0, ',', '.') }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-zinc-600">Demo aangevraagd</span>
                    <span class="font-semibold">{{ number_format($kpis['demo_requested'], 0, ',', '.') }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-zinc-600">Demo gestart</span>
                    <span class="font-semibold">{{ number_format($kpis['demo_started'], 0, ',', '.') }}</span>
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
            <div class="text-xs text-zinc-500">Mandaten in afwachting</div>
            <div class="text-sm font-semibold">{{ number_format($kpis['mandates_pending'], 0, ',', '.') }}</div>
        </div>
        <a href="{{ route('dashboard') }}" class="block h-full rounded-xl border border-zinc-200 bg-white px-3 py-2 transition hover:border-indigo-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
            <div class="text-xs text-zinc-500">Actief zonder complete SEPA</div>
            <div class="text-sm font-semibold">{{ number_format($kpis['active_without_mandate'], 0, ',', '.') }}</div>
        </a>
        <a href="{{ $customersUrl }}?status=opgezegd" class="block h-full rounded-xl border border-zinc-200 bg-white px-3 py-2 transition hover:border-indigo-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
            <div class="text-xs text-zinc-500">Opzeggingen</div>
            <div class="text-sm font-semibold">{{ number_format($kpis['cancelled'], 0, ',', '.') }}</div>
        </a>
        <a href="{{ $customersUrl }}?status=verloren" class="block h-full rounded-xl border border-zinc-200 bg-white px-3 py-2 transition hover:border-indigo-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
            <div class="text-xs text-zinc-500">Verloren</div>
            <div class="text-sm font-semibold">{{ number_format($kpis['lost'], 0, ',', '.') }}</div>
        </a>
        <a href="{{ route('crm.modules.index') }}" class="block h-full rounded-xl border border-zinc-200 bg-white px-3 py-2 transition hover:border-indigo-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
            <div class="text-xs text-zinc-500">Beschikbare modules</div>
            <div class="text-sm font-semibold">{{ number_format($kpis['modules_total'], 0, ',', '.') }}</div>
        </a>
    </div>

    @php
        // Eenvoudige SVG-grafieken zonder externe library.
        $chartW = 640;
        $chartH = 220;
        $padL = 64;
        $padR = 16;
        $padT = 16;
        $padB = 32;
        $plotW = $chartW - $padL - $padR;
        $plotH = $chartH - $padT - $padB;

        $mrrValues = array_map(fn ($row) => (float) $row['excl'], $mrrHistory);
        $mrrMax = max(1.0, ...$mrrValues);
        $mrrStep = (float) (10 ** floor(log10($mrrMax)));
        $mrrTop = ceil($mrrMax / $mrrStep) * $mrrStep;
        $mrrCount = max(1, count($mrrHistory) - 1);
        $mrrPoints = [];
        foreach ($mrrHistory as $i => $row) {
            $x = $padL + ($plotW * $i / $mrrCount);
            $y = $padT + $plotH - ($plotH * ((float) $row['excl'] / $mrrTop));
            $mrrPoints[] = ['x' => round($x, 1), 'y' => round($y, 1), 'row' => $row];
        }
        $mrrPath = collect($mrrPoints)->map(fn ($p) => $p['x'].','.$p['y'])->implode(' ');
        $mrrArea = $mrrPoints !== []
            ? 'M'.$mrrPoints[0]['x'].','.($padT + $plotH).' L'.collect($mrrPoints)->map(fn ($p) => $p['x'].','.$p['y'])->implode(' L').' L'.end($mrrPoints)['x'].','.($padT + $plotH).' Z'
            : '';

        $flowMax = max(1, ...array_map(fn ($row) => max((int) $row['in'], (int) $row['opgezegd'] + (int) $row['verloren']), $flowByMonth));
        $flowTop = (int) max(4, ceil($flowMax / 4) * 4);
        $flowSlot = $plotW / max(1, count($flowByMonth));
        $barW = max(4, min(18, ($flowSlot - 8) / 2));
        $euro = fn ($v) => '€ '.number_format((float) $v, 0, ',', '.');
    @endphp

    <div class="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div class="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-7">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div class="text-sm font-semibold">MRR per maand</div>
                    <div class="text-xs text-zinc-500">Laatste 12 maanden, excl. btw. Berekend uit start- en einddatums van modules (benadering, huidige maand is exact).</div>
                </div>
                <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" wire:click="export('mrr')">CSV</button>
            </div>
            <svg viewBox="0 0 {{ $chartW }} {{ $chartH }}" class="mt-3 h-auto w-full" role="img" aria-label="Lijngrafiek MRR per maand, laatste 12 maanden">
                @foreach ([0, 0.25, 0.5, 0.75, 1] as $f)
                    @php($gy = round($padT + $plotH - $plotH * $f, 1))
                    <line x1="{{ $padL }}" x2="{{ $chartW - $padR }}" y1="{{ $gy }}" y2="{{ $gy }}" stroke="#e4e4e7" stroke-width="1" />
                    <text x="{{ $padL - 8 }}" y="{{ $gy + 4 }}" text-anchor="end" font-size="11" fill="#71717a">{{ $euro($mrrTop * $f) }}</text>
                @endforeach
                @if ($mrrArea !== '')
                    <path d="{{ $mrrArea }}" fill="#4f46e5" fill-opacity="0.08" />
                    <polyline points="{{ $mrrPath }}" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
                @endif
                @foreach ($mrrPoints as $i => $p)
                    <circle cx="{{ $p['x'] }}" cy="{{ $p['y'] }}" r="3.5" fill="#fff" stroke="#4f46e5" stroke-width="2">
                        <title>{{ $p['row']['label'] }}: {{ '€ '.number_format((float) $p['row']['excl'], 2, ',', '.') }}</title>
                    </circle>
                    @if ($i % 2 === (count($mrrPoints) - 1) % 2)
                        <text x="{{ $p['x'] }}" y="{{ $chartH - 10 }}" text-anchor="middle" font-size="11" fill="#71717a">{{ $p['row']['label'] }}</text>
                    @endif
                @endforeach
            </svg>
        </div>

        <div class="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div class="text-sm font-semibold">Instroom en uitstroom per maand</div>
                    <div class="text-xs text-zinc-500">Nieuw actief (actief vanaf) tegenover opgezegd en verloren (op datum).</div>
                </div>
                <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" wire:click="export('instroom')">CSV</button>
            </div>
            <div class="mt-2 flex flex-wrap gap-3 text-xs text-zinc-600" aria-hidden="true">
                <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span>Nieuw actief</span>
                <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-rose-500"></span>Opgezegd</span>
                <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-rose-300"></span>Verloren</span>
            </div>
            <svg viewBox="0 0 {{ $chartW }} {{ $chartH }}" class="mt-2 h-auto w-full" role="img" aria-label="Staafgrafiek instroom en uitstroom per maand, laatste 12 maanden">
                @foreach ([0, 0.25, 0.5, 0.75, 1] as $f)
                    @php($gy = round($padT + $plotH - $plotH * $f, 1))
                    <line x1="{{ $padL }}" x2="{{ $chartW - $padR }}" y1="{{ $gy }}" y2="{{ $gy }}" stroke="#e4e4e7" stroke-width="1" />
                    <text x="{{ $padL - 8 }}" y="{{ $gy + 4 }}" text-anchor="end" font-size="11" fill="#71717a">{{ (int) round($flowTop * $f) }}</text>
                @endforeach
                @foreach ($flowByMonth as $i => $row)
                    @php
                        $cx = $padL + $flowSlot * $i + $flowSlot / 2;
                        $hIn = $plotH * ((int) $row['in'] / $flowTop);
                        $hOp = $plotH * ((int) $row['opgezegd'] / $flowTop);
                        $hVe = $plotH * ((int) $row['verloren'] / $flowTop);
                        $base = $padT + $plotH;
                    @endphp
                    <g>
                        <title>{{ $row['label'] }}: {{ $row['in'] }} nieuw actief, {{ $row['opgezegd'] }} opgezegd, {{ $row['verloren'] }} verloren</title>
                        <rect x="{{ round($cx - $barW - 1, 1) }}" y="{{ round($base - $hIn, 1) }}" width="{{ round($barW, 1) }}" height="{{ round($hIn, 1) }}" rx="2" fill="#10b981" />
                        <rect x="{{ round($cx + 1, 1) }}" y="{{ round($base - $hOp, 1) }}" width="{{ round($barW, 1) }}" height="{{ round($hOp, 1) }}" rx="2" fill="#f43f5e" />
                        <rect x="{{ round($cx + 1, 1) }}" y="{{ round($base - $hOp - $hVe, 1) }}" width="{{ round($barW, 1) }}" height="{{ round($hVe, 1) }}" rx="2" fill="#fda4af" />
                        <rect x="{{ round($cx - $flowSlot / 2, 1) }}" y="{{ $padT }}" width="{{ round($flowSlot, 1) }}" height="{{ $plotH }}" fill="transparent" />
                    </g>
                    @if ($i % 2 === (count($flowByMonth) - 1) % 2)
                        <text x="{{ round($cx, 1) }}" y="{{ $chartH - 10 }}" text-anchor="middle" font-size="11" fill="#71717a">{{ $row['label'] }}</text>
                    @endif
                @endforeach
            </svg>
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
                    <a href="{{ $customersUrl }}?status={{ $key }}" class="block rounded-lg border border-zinc-100 px-3 py-2 transition hover:border-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                        <div class="mb-1 flex items-center justify-between text-xs">
                            <span class="text-zinc-600">{{ $label }}</span>
                            <span class="font-semibold text-zinc-800">{{ number_format($total, 0, ',', '.') }}</span>
                        </div>
                        <div class="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                            <div class="h-1.5 rounded-full bg-zinc-700" style="width: {{ min(100, max(0, $width)) }}%"></div>
                        </div>
                    </a>
                @endforeach
            </div>
        </div>

        <div class="flex h-full min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-8">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                    <div class="flex items-center gap-2"><div class="text-sm font-semibold">Modules prestaties</div><button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" wire:click="export('modules')">CSV</button></div>
                    <div class="mt-1 text-xs text-zinc-500">Alleen klanten met status Actief. Demo-klanten tellen niet mee.</div>
                </div>
                <div class="grid grid-cols-1 gap-2 sm:w-72">
                    @forelse($topModules as $module)
                        <div class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
                            <div class="flex items-center justify-between gap-2">
                                <span class="min-w-0 truncate font-medium text-zinc-700">{{ $module->naam }}</span>
                                <span class="font-semibold text-zinc-900">&euro; {{ number_format((float) $module->mrr_excl, 2, ',', '.') }}</span>
                            </div>
                        </div>
                    @empty
                        <div class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">Nog geen module-omzet.</div>
                    @endforelse
                </div>
            </div>

            <div class="mt-4 flex-1 overflow-x-auto rounded-lg border border-zinc-200">
                <table class="min-w-full divide-y divide-zinc-100">
                    <thead class="bg-zinc-50">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Module</th>
                            <th class="px-3 py-2 text-right text-xs font-semibold text-zinc-600">Klanten</th>
                            <th class="px-3 py-2 text-right text-xs font-semibold text-zinc-600">Aantal</th>
                            <th class="px-3 py-2 text-right text-xs font-semibold text-zinc-600">MRR excl.</th>
                            <th class="px-3 py-2 text-right text-xs font-semibold text-zinc-600">BTW %</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                        @forelse($modulesOverview as $row)
                            <tr class="hover:bg-zinc-50">
                                <td class="px-3 py-2 text-sm font-medium">{{ $row->naam }}</td>
                                <td class="px-3 py-2 text-right text-sm">{{ number_format((int) $row->active_customers, 0, ',', '.') }}</td>
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
                    @if($modulesOverview->isNotEmpty())
                        <tfoot class="bg-zinc-50">
                            <tr>
                                <td class="px-3 py-2 text-sm font-semibold">Totaal</td>
                                <td class="px-3 py-2"></td>
                                <td class="px-3 py-2 text-right text-sm font-semibold">{{ number_format($kpis['modules_total_aantal'], 0, ',', '.') }}</td>
                                <td class="px-3 py-2 text-right text-sm font-semibold">&euro; {{ number_format($kpis['mrr_excl'], 2, ',', '.') }}</td>
                                <td class="px-3 py-2"></td>
                            </tr>
                        </tfoot>
                    @endif
                </table>
            </div>
        </div>
    </div>

    <div class="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4">
            <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold">Top 10 klanten op MRR</div>
                <div class="flex items-center gap-2"><span class="text-xs text-zinc-500">Alleen status Actief. CSV bevat alle klanten.</span><button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" wire:click="export('klanten')">CSV</button></div>
            </div>
            <div class="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
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
                                <td class="px-3 py-2 text-sm font-medium"><a href="{{ route('crm.garage_companies.show', ['garageCompany' => $row->id]) }}" class="text-zinc-900 hover:text-indigo-700 hover:underline">{{ $row->bedrijfsnaam }}</a></td>
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
</div>
