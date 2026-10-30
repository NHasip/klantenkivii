<div class="min-w-0 space-y-6">
    @php
        $card = 'min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5';
        $focus = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2';
        $csvBtn = 'inline-flex h-7 shrink-0 items-center rounded-lg bg-white px-2.5 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors hover:bg-zinc-50 disabled:opacity-50 '.$focus;
        $input = 'mt-1 block w-full rounded-lg border-zinc-300 text-sm text-zinc-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600';
        $th = 'px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500';
        $tile = 'block h-full min-w-0 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm';
        $tileLink = $tile.' transition hover:border-zinc-300 hover:shadow '.$focus;
    @endphp

    <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
            <h1 class="text-2xl font-semibold tracking-tight text-zinc-900">Rapportages</h1>
            <p class="mt-1 text-sm text-zinc-500">Omzet, instroom en modules. Omzetcijfers zijn altijd de stand van vandaag; de periode geldt voor instroom en uitstroom.</p>
        </div>
        <span class="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200">
            Periode: {{ $range['start']->format('d-m-Y') }} t/m {{ $range['end']->format('d-m-Y') }}
            <svg wire:loading wire:target="preset,applyFilters" class="h-3.5 w-3.5 animate-spin text-zinc-500" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
        </span>
    </div>

    <form wire:submit="applyFilters" class="{{ $card }}" aria-label="Periode kiezen">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
            <div class="sm:col-span-4">
                <label for="report_preset" class="block text-sm font-medium text-zinc-800">Periode</label>
                <select id="report_preset" class="{{ $input }}" wire:model.live="preset">
                    @foreach($this->presetOptions() as $key => $label)
                        <option value="{{ $key }}">{{ $label }}</option>
                    @endforeach
                </select>
                @error('preset') <p class="mt-1 text-xs font-medium text-rose-700" role="alert">{{ $message }}</p> @enderror
            </div>

            @if($preset === 'custom')
                <div class="sm:col-span-3">
                    <label for="report_from" class="block text-sm font-medium text-zinc-800">Van</label>
                    <input id="report_from" type="date" class="{{ $input }}" wire:model="from" @error('from') aria-invalid="true" aria-describedby="report_from_error" @enderror />
                    @error('from') <p id="report_from_error" class="mt-1 text-xs font-medium text-rose-700" role="alert">{{ $message }}</p> @enderror
                </div>
                <div class="sm:col-span-3">
                    <label for="report_to" class="block text-sm font-medium text-zinc-800">Tot en met</label>
                    <input id="report_to" type="date" class="{{ $input }}" wire:model="to" @error('to') aria-invalid="true" aria-describedby="report_to_error" @enderror />
                    @error('to') <p id="report_to_error" class="mt-1 text-xs font-medium text-rose-700" role="alert">{{ $message }}</p> @enderror
                </div>
                <div class="sm:col-span-2 sm:flex sm:justify-end">
                    <button type="submit" class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto {{ $focus }}" wire:loading.attr="disabled" wire:target="applyFilters">
                        <span wire:loading.remove wire:target="applyFilters">Toepassen</span>
                        <span wire:loading wire:target="applyFilters">Laden...</span>
                    </button>
                </div>
            @else
                <p class="text-sm text-zinc-500 sm:col-span-8">
                    De periode wordt direct toegepast. Kies
                    <button type="button" class="rounded font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-800 {{ $focus }}" wire:click="$set('preset', 'custom')">Aangepast</button>
                    voor eigen datums.
                </p>
            @endif
        </div>
    </form>

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

    <div class="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div class="flex h-full min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 md:col-span-2 xl:col-span-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                    <h2 class="text-xs font-medium uppercase tracking-wide text-zinc-500">Omzet per maand (MRR)</h2>
                    <div class="mt-1 break-words text-3xl font-semibold text-zinc-900">&euro; {{ number_format($kpis['mrr_excl'], 2, ',', '.') }}</div>
                    <div class="mt-1 text-xs text-zinc-600">Excl. btw, alleen klanten met status Actief</div>
                </div>
                <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 sm:text-right">
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

        <div class="flex h-full min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-3">
            <h2 class="text-xs font-medium uppercase tracking-wide text-zinc-500">Klanten</h2>
            <a href="{{ $customersUrl }}" class="mt-2 block rounded text-2xl font-semibold hover:text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">{{ number_format($kpis['companies_total'], 0, ',', '.') }}</a>
            <a href="{{ $customersUrl }}?status=actief" class="mt-1 block rounded text-sm text-zinc-600 hover:text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">Actief: {{ number_format($kpis['companies_active'], 0, ',', '.') }} ({{ $activeRatio }}%)</a>
            <div class="mt-auto pt-4">
                <div class="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div class="h-2 rounded-full bg-indigo-500" style="width: {{ min(100, max(0, $activeRatio)) }}%"></div>
                </div>
            </div>
        </div>

        <div class="flex h-full min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-3">
            <h2 class="text-xs font-medium uppercase tracking-wide text-zinc-500">Instroom in periode</h2>
            <div class="mt-3 space-y-2 text-sm">
                <div class="flex items-center justify-between">
                    <span class="text-zinc-600">Nieuw toegevoegd</span>
                    <span class="font-semibold tabular-nums text-zinc-900">{{ number_format($kpis['leads_new'], 0, ',', '.') }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-zinc-600">Demo aangevraagd</span>
                    <span class="font-semibold tabular-nums text-zinc-900">{{ number_format($kpis['demo_requested'], 0, ',', '.') }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-zinc-600">Demo gestart</span>
                    <span class="font-semibold tabular-nums text-zinc-900">{{ number_format($kpis['demo_started'], 0, ',', '.') }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-zinc-600">Nieuw actief</span>
                    <span class="font-semibold tabular-nums text-zinc-900">{{ number_format($kpis['active_new'], 0, ',', '.') }}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <div class="{{ $tile }}">
            <div class="text-xs text-zinc-500">Mandaten actief</div>
            <div class="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{{ number_format($kpis['mandates_active'], 0, ',', '.') }}</div>
        </div>
        <div class="{{ $tile }}">
            <div class="text-xs text-zinc-500">Mandaten in afwachting</div>
            <div class="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{{ number_format($kpis['mandates_pending'], 0, ',', '.') }}</div>
        </div>
        <a href="{{ route('dashboard') }}#sepa" class="{{ $tileLink }}">
            <div class="text-xs text-zinc-500">Actief zonder complete SEPA</div>
            <div class="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{{ number_format($kpis['active_without_mandate'], 0, ',', '.') }}</div>
        </a>
        <a href="{{ $customersUrl }}?status=opgezegd" class="{{ $tileLink }}">
            <div class="text-xs text-zinc-500">Opzeggingen</div>
            <div class="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{{ number_format($kpis['cancelled'], 0, ',', '.') }}</div>
        </a>
        <a href="{{ $customersUrl }}?status=verloren" class="{{ $tileLink }}">
            <div class="text-xs text-zinc-500">Verloren</div>
            <div class="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{{ number_format($kpis['lost'], 0, ',', '.') }}</div>
        </a>
        <a href="{{ route('crm.modules.index') }}" class="{{ $tileLink }}">
            <div class="text-xs text-zinc-500">Beschikbare modules</div>
            <div class="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{{ number_format($kpis['modules_total'], 0, ',', '.') }}</div>
        </a>
    </div>

    @php
        // Eenvoudige SVG-grafieken zonder externe library.
        $chartW = 640;
        $chartH = 220;
        $padL = 64;
        $padR = 24;
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
        // Eigen afmetingen voor de smallere kaart (lg:col-span-5), zodat staven en labels niet verkleinen.
        $flowW = 420;
        $flowH = 260;
        $flowPadL = 36;
        $flowPadR = 12;
        $flowPlotW = $flowW - $flowPadL - $flowPadR;
        $flowPlotH = $flowH - $padT - $padB;
        $flowSlot = $flowPlotW / max(1, count($flowByMonth));
        $barW = max(4, min(14, ($flowSlot - 6) / 2));
        $euro = fn ($v) => '€ '.number_format((float) $v, 0, ',', '.');
    @endphp

    <div class="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <div class="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-7">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <h2 class="text-base font-semibold text-zinc-900">MRR per maand</h2>
                    <div class="text-xs text-zinc-500">Laatste 12 maanden, excl. btw. Berekend uit start- en einddatums van modules (benadering, huidige maand is exact).</div>
                </div>
                <button type="button" class="{{ $csvBtn }}" wire:click="export('mrr')" wire:loading.attr="disabled" wire:target="export" aria-label="MRR per maand exporteren als CSV">CSV</button>
            </div>
            @if (array_sum($mrrValues) <= 0)
                <p class="mt-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-3 text-sm text-zinc-500">Nog geen omzet in de afgelopen 12 maanden. Koppel modules aan actieve klanten om de grafiek te vullen.</p>
            @endif
            <svg viewBox="0 0 {{ $chartW }} {{ $chartH }}" class="mt-3 h-auto w-full" role="img" aria-label="Lijngrafiek MRR per maand, laatste 12 maanden">
                @foreach ([0, 0.25, 0.5, 0.75, 1] as $f)
                    @php $gy = round($padT + $plotH - $plotH * $f, 1); @endphp
                    <line x1="{{ $padL }}" x2="{{ $chartW - $padR }}" y1="{{ $gy }}" y2="{{ $gy }}" stroke="#e4e4e7" stroke-width="1" />
                    <text x="{{ $padL - 8 }}" y="{{ $gy + 4 }}" text-anchor="end" font-size="11" fill="#71717a">{{ $euro($mrrTop * $f) }}</text>
                @endforeach
                @if ($mrrArea !== '')
                    <path d="{{ $mrrArea }}" fill="#aec22b" fill-opacity="0.15" />
                    <polyline points="{{ $mrrPath }}" fill="none" stroke="#667319" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
                @endif
                @foreach ($mrrPoints as $i => $p)
                    <circle cx="{{ $p['x'] }}" cy="{{ $p['y'] }}" r="3.5" fill="#fff" stroke="#667319" stroke-width="2">
                        <title>{{ $p['row']['label'] }}: {{ '€ '.number_format((float) $p['row']['excl'], 2, ',', '.') }}</title>
                    </circle>
                    @if ($i % 2 === (count($mrrPoints) - 1) % 2)
                        <text x="{{ $p['x'] }}" y="{{ $chartH - 10 }}" text-anchor="{{ $i === count($mrrPoints) - 1 ? 'end' : 'middle' }}" font-size="11" fill="#71717a">{{ $p['row']['label'] }}</text>
                    @endif
                @endforeach
            </svg>
        </div>

        <div class="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-5">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <h2 class="text-base font-semibold text-zinc-900">Instroom en uitstroom per maand</h2>
                    <div class="text-xs text-zinc-500">Nieuw actief (actief vanaf) tegenover opgezegd en verloren (op datum).</div>
                </div>
                <button type="button" class="{{ $csvBtn }}" wire:click="export('instroom')" wire:loading.attr="disabled" wire:target="export" aria-label="Instroom en uitstroom exporteren als CSV">CSV</button>
            </div>
            <div class="mt-2 flex flex-wrap gap-3 text-xs text-zinc-600" aria-hidden="true">
                <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span>Nieuw actief</span>
                <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-rose-500"></span>Opgezegd</span>
                <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-rose-300"></span>Verloren</span>
            </div>
            <svg viewBox="0 0 {{ $flowW }} {{ $flowH }}" class="mt-2 h-auto w-full" role="img" aria-label="Staafgrafiek instroom en uitstroom per maand, laatste 12 maanden">
                @foreach ([0, 0.25, 0.5, 0.75, 1] as $f)
                    @php $gy = round($padT + $flowPlotH - $flowPlotH * $f, 1); @endphp
                    <line x1="{{ $flowPadL }}" x2="{{ $flowW - $flowPadR }}" y1="{{ $gy }}" y2="{{ $gy }}" stroke="#e4e4e7" stroke-width="1" />
                    <text x="{{ $flowPadL - 8 }}" y="{{ $gy + 4 }}" text-anchor="end" font-size="11" fill="#71717a">{{ (int) round($flowTop * $f) }}</text>
                @endforeach
                @foreach ($flowByMonth as $i => $row)
                    @php
                        $cx = $flowPadL + $flowSlot * $i + $flowSlot / 2;
                        $hIn = $flowPlotH * ((int) $row['in'] / $flowTop);
                        $hOp = $flowPlotH * ((int) $row['opgezegd'] / $flowTop);
                        $hVe = $flowPlotH * ((int) $row['verloren'] / $flowTop);
                        $base = $padT + $flowPlotH;
                    @endphp
                    <g>
                        <title>{{ $row['label'] }}: {{ $row['in'] }} nieuw actief, {{ $row['opgezegd'] }} opgezegd, {{ $row['verloren'] }} verloren</title>
                        <rect x="{{ round($cx - $barW - 1, 1) }}" y="{{ round($base - $hIn, 1) }}" width="{{ round($barW, 1) }}" height="{{ round($hIn, 1) }}" rx="2" fill="#10b981" />
                        <rect x="{{ round($cx + 1, 1) }}" y="{{ round($base - $hOp, 1) }}" width="{{ round($barW, 1) }}" height="{{ round($hOp, 1) }}" rx="2" fill="#f43f5e" />
                        <rect x="{{ round($cx + 1, 1) }}" y="{{ round($base - $hOp - $hVe, 1) }}" width="{{ round($barW, 1) }}" height="{{ round($hVe, 1) }}" rx="2" fill="#fda4af" />
                        <rect x="{{ round($cx - $flowSlot / 2, 1) }}" y="{{ $padT }}" width="{{ round($flowSlot, 1) }}" height="{{ $flowPlotH }}" fill="transparent" />
                    </g>
                    @if ($i % 2 === (count($flowByMonth) - 1) % 2)
                        <text x="{{ round($cx, 1) }}" y="{{ $flowH - 10 }}" text-anchor="middle" font-size="11" fill="#71717a">{{ $row['label'] }}</text>
                    @endif
                @endforeach
            </svg>
        </div>
    </div>

    <div class="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <div class="h-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-4">
            <div class="flex items-center justify-between gap-2">
                <h2 class="text-base font-semibold text-zinc-900">Funnel overzicht</h2>
                <div class="text-xs text-zinc-500">Totaalbestand</div>
            </div>
            <div class="mt-4 space-y-2">
                @foreach($funnelLabels as $key => $label)
                    @php
                        $total = (int) ($funnel[$key] ?? 0);
                        $width = (int) round(($total / $funnelMax) * 100);
                    @endphp
                    <a href="{{ $customersUrl }}?status={{ $key }}" class="block rounded-lg border border-zinc-100 px-4 py-2.5 transition hover:border-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                        <div class="mb-1 flex items-center justify-between text-xs">
                            <span class="text-zinc-600">{{ $label }}</span>
                            <span class="font-semibold text-zinc-800">{{ number_format($total, 0, ',', '.') }}</span>
                        </div>
                        <div class="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                            <div class="h-1.5 rounded-full bg-indigo-500" style="width: {{ min(100, max(0, $width)) }}%"></div>
                        </div>
                    </a>
                @endforeach
            </div>
        </div>

        <div class="flex h-full min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-8">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <h2 class="text-base font-semibold text-zinc-900">Modules prestaties</h2>
                    <div class="text-xs text-zinc-500">Alleen klanten met status Actief. Demo-klanten tellen niet mee.</div>
                </div>
                <button type="button" class="{{ $csvBtn }}" wire:click="export('modules')" wire:loading.attr="disabled" wire:target="export" aria-label="Modules prestaties exporteren als CSV">CSV</button>
            </div>
            <div class="mt-3">
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    @forelse($topModules as $module)
                        <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
                            <div class="flex items-center justify-between gap-2">
                                <span class="min-w-0 truncate font-medium text-zinc-700">{{ $module->naam }}</span>
                                <span class="font-semibold text-zinc-900">&euro; {{ number_format((float) $module->mrr_excl, 2, ',', '.') }}</span>
                            </div>
                        </div>
                    @empty
                        <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">Nog geen module-omzet.</div>
                    @endforelse
                </div>
            </div>

            <div class="mt-4 flex-1 overflow-x-auto rounded-lg border border-zinc-200">
                <table class="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead class="bg-zinc-50">
                        <tr>
                            <th class="{{ $th }} text-left">Module</th>
                            <th class="{{ $th }} text-right">Klanten</th>
                            <th class="{{ $th }} text-right">Aantal</th>
                            <th class="{{ $th }} text-right">MRR excl.</th>
                            <th class="{{ $th }} text-right">BTW %</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                        @forelse($modulesOverview as $row)
                            <tr class="hover:bg-zinc-50/80">
                                <td class="px-4 py-2.5 text-sm font-medium">{{ $row->naam }}</td>
                                <td class="px-4 py-2.5 text-right text-sm tabular-nums">{{ number_format((int) $row->active_customers, 0, ',', '.') }}</td>
                                <td class="px-4 py-2.5 text-right text-sm tabular-nums">{{ number_format((int) $row->total_aantal, 0, ',', '.') }}</td>
                                <td class="px-4 py-2.5 text-right text-sm tabular-nums font-semibold">&euro; {{ number_format((float) $row->mrr_excl, 2, ',', '.') }}</td>
                                <td class="px-4 py-2.5 text-right text-sm tabular-nums text-zinc-600">
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
                                <td colspan="5" class="px-4 py-10 text-center text-sm text-zinc-500">Nog geen modules. <a href="{{ route('crm.modules.index') }}" class="font-medium text-indigo-700 hover:underline">Module toevoegen</a></td>
                            </tr>
                        @endforelse
                    </tbody>
                    @if($modulesOverview->isNotEmpty())
                        <tfoot class="bg-zinc-50">
                            <tr>
                                <td class="px-4 py-2.5 text-sm font-semibold">Totaal</td>
                                <td class="px-4 py-2.5"></td>
                                <td class="px-4 py-2.5 text-right text-sm tabular-nums font-semibold">{{ number_format($kpis['modules_total_aantal'], 0, ',', '.') }}</td>
                                <td class="px-4 py-2.5 text-right text-sm tabular-nums font-semibold">&euro; {{ number_format($kpis['mrr_excl'], 2, ',', '.') }}</td>
                                <td class="px-4 py-2.5"></td>
                            </tr>
                        </tfoot>
                    @endif
                </table>
            </div>
        </div>
    </div>

    <div class="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-base font-semibold text-zinc-900">Top 10 klanten op MRR</h2>
                <div class="flex flex-wrap items-center gap-2"><span class="text-xs text-zinc-500">Alleen status Actief. CSV bevat alle klanten.</span><button type="button" class="{{ $csvBtn }}" wire:click="export('klanten')" wire:loading.attr="disabled" wire:target="export" aria-label="Alle klanten op MRR exporteren als CSV">CSV</button></div>
            </div>
            <div class="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
                <table class="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead class="bg-zinc-50">
                        <tr>
                            <th class="{{ $th }} text-left">Klant</th>
                            <th class="{{ $th }} text-left">Plaats</th>
                            <th class="{{ $th }} text-right">MRR excl.</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                        @forelse($topCustomers as $row)
                            <tr class="hover:bg-zinc-50/80">
                                <td class="px-4 py-2.5 text-sm font-medium"><a href="{{ route('crm.garage_companies.show', ['garageCompany' => $row->id]) }}" class="text-zinc-900 hover:text-indigo-700 hover:underline">{{ $row->bedrijfsnaam }}</a></td>
                                <td class="px-4 py-2.5 text-sm text-zinc-600">{{ filled($row->plaats) ? $row->plaats : '-' }}</td>
                                <td class="px-4 py-2.5 text-right text-sm tabular-nums font-semibold">&euro; {{ number_format((float) $row->mrr_excl, 2, ',', '.') }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="3" class="px-4 py-10 text-center text-sm text-zinc-500">Nog geen actieve klanten met module-omzet.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
</div>
