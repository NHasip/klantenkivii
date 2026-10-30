<div class="min-w-0 space-y-6">
    @php
        $nf = fn ($v) => number_format((float) $v, 0, ',', '.');
        $money = fn ($v) => '€ '.number_format((float) $v, 2, ',', '.');
        $euro = fn ($v) => '€ '.number_format((float) $v, 0, ',', '.');
        $csvBtn = 'btn btn-secondary btn-xs';
        $tileTones = [
            'brand' => 'bg-indigo-100/80 text-indigo-700',
            'success' => 'bg-emerald-50 text-emerald-700',
            'warning' => 'bg-amber-50 text-amber-700',
            'danger' => 'bg-rose-50 text-rose-700',
            'info' => 'bg-sky-50 text-sky-700',
            'neutral' => 'bg-zinc-100 text-zinc-600',
        ];
        $dashboardUrl = route('dashboard');

        // Trend MRR: huidige maand tegenover vorige maand uit dezelfde reeks als de grafiek.
        $mrrPrev = count($mrrHistory) >= 2 ? (float) $mrrHistory[count($mrrHistory) - 2]['excl'] : null;
        $mrrTrend = null;
        if ($mrrPrev !== null && $mrrPrev > 0) {
            $pct = (((float) $kpis['mrr_excl']) - $mrrPrev) / $mrrPrev * 100;
            $mrrTrend = ['pct' => $pct, 'up' => $pct >= 0, 'flat' => abs($pct) < 0.05];
        }

        $activeRatio = $kpis['companies_total'] > 0
            ? (int) round(($kpis['companies_active'] / $kpis['companies_total']) * 100)
            : 0;
        $outflow = (int) $kpis['cancelled'] + (int) $kpis['lost'];
        $netFlow = (int) $kpis['active_new'] - $outflow;

        $funnelSteps = [
            'demo_aangevraagd' => ['label' => 'Demo aangevraagd', 'icon' => 'inbox', 'bar' => 'bg-sky-400'],
            'proefperiode' => ['label' => 'Demo', 'icon' => 'sparkles', 'bar' => 'bg-amber-400'],
            'actief' => ['label' => 'Actief', 'icon' => 'check-circle', 'bar' => 'bg-emerald-500'],
            'opgezegd' => ['label' => 'Opgezegd', 'icon' => 'log-out', 'bar' => 'bg-rose-400'],
            'verloren' => ['label' => 'Verloren', 'icon' => 'x-circle', 'bar' => 'bg-zinc-400'],
        ];
        $funnelMax = max(1, collect(array_keys($funnelSteps))->max(fn ($key) => (int) ($funnel[$key] ?? 0)));
        $topModules = $modulesOverview->sortByDesc(fn ($row) => (float) $row->mrr_excl)->take(3);
        $moduleMrrMax = max(1.0, (float) $modulesOverview->max(fn ($row) => (float) $row->mrr_excl));
        $topCustomerMax = max(1.0, (float) $topCustomers->max(fn ($row) => (float) $row->mrr_excl));
        $mrrTotal = max(0.01, (float) $kpis['mrr_excl']);
    @endphp

    <x-page-header title="Rapportages" description="Omzet, instroom en modules. Omzetcijfers zijn altijd de stand van vandaag; de periode geldt voor instroom en uitstroom.">
        <x-slot name="actions">
            <a href="{{ $dashboardUrl }}" class="btn btn-secondary">
                <x-icon name="home" class="h-4 w-4 text-zinc-500" />
                Dashboard
            </a>
            <a href="{{ $customersUrl }}" class="btn btn-primary">
                <x-icon name="users" class="h-4 w-4" />
                Naar klanten
            </a>
        </x-slot>
    </x-page-header>

    {{-- Periode --}}
    <form wire:submit="applyFilters" class="card card-body" aria-label="Periode kiezen">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
                <span class="icon-tile h-8 w-8 rounded-lg {{ $tileTones['brand'] }}" aria-hidden="true"><x-icon name="calendar" class="h-4 w-4" /></span>
                <div class="min-w-0">
                    <h2 class="section-heading">Periode</h2>
                    <p class="text-sm text-zinc-500">
                        <span class="tabular-nums">{{ $range['start']->format('d-m-Y') }} t/m {{ $range['end']->format('d-m-Y') }}</span>
                        <x-icon name="refresh" wire:loading wire:target="preset,applyFilters" class="ml-1 inline h-3.5 w-3.5 animate-spin text-zinc-400" />
                    </p>
                </div>
            </div>

            {{-- Snelkeuze; de select blijft beschikbaar voor toetsenbord en smalle schermen. --}}
            <div class="hidden flex-wrap gap-1 rounded-xl bg-zinc-100/80 p-1 lg:flex" role="group" aria-label="Snelkeuze periode">
                @foreach($this->presetOptions() as $key => $label)
                    <button type="button" wire:click="$set('preset', '{{ $key }}')" aria-pressed="{{ $preset === $key ? 'true' : 'false' }}"
                        class="h-8 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 {{ $preset === $key ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-black/5' : 'text-zinc-600 hover:text-zinc-900' }}">
                        {{ $label }}
                    </button>
                @endforeach
            </div>
            <div class="w-full sm:w-56 lg:hidden">
                <label for="report_preset" class="sr-only">Periode</label>
                <select id="report_preset" class="input" wire:model.live="preset">
                    @foreach($this->presetOptions() as $key => $label)
                        <option value="{{ $key }}">{{ $label }}</option>
                    @endforeach
                </select>
            </div>
        </div>
        @error('preset') <p class="field-error" role="alert">{{ $message }}</p> @enderror

        @if($preset === 'custom')
            <div class="mt-4 grid grid-cols-1 gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-12 sm:items-end">
                <div class="sm:col-span-4">
                    <label for="report_from" class="label mb-1.5">Van</label>
                    <input id="report_from" type="date" class="input" wire:model="from" @error('from') aria-invalid="true" aria-describedby="report_from_error" @enderror />
                    @error('from') <p id="report_from_error" class="field-error" role="alert">{{ $message }}</p> @enderror
                </div>
                <div class="sm:col-span-4">
                    <label for="report_to" class="label mb-1.5">Tot en met</label>
                    <input id="report_to" type="date" class="input" wire:model="to" @error('to') aria-invalid="true" aria-describedby="report_to_error" @enderror />
                    @error('to') <p id="report_to_error" class="field-error" role="alert">{{ $message }}</p> @enderror
                </div>
                <div class="sm:col-span-4 sm:flex sm:justify-end">
                    <button type="submit" class="btn btn-primary w-full sm:w-auto" wire:loading.attr="disabled" wire:target="applyFilters">
                        <span wire:loading.remove wire:target="applyFilters">Toepassen</span>
                        <span wire:loading wire:target="applyFilters">Laden...</span>
                    </button>
                </div>
            </div>
        @endif
    </form>

    {{-- Kerncijfers --}}
    <section aria-labelledby="report-kpis" class="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <h2 id="report-kpis" class="sr-only">Kerncijfers</h2>

        <a href="#mrr" class="card card-interactive focus-ring block p-4 sm:p-5">
            <div class="flex items-start justify-between gap-3">
                <span class="text-sm font-medium text-zinc-500">MRR excl. btw</span>
                <span class="icon-tile h-8 w-8 rounded-lg {{ $tileTones['success'] }}" aria-hidden="true"><x-icon name="euro" class="h-4 w-4" /></span>
            </div>
            <div class="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span class="break-words text-2xl font-semibold tabular-nums tracking-display text-zinc-900">{{ $money($kpis['mrr_excl']) }}</span>
                @if($mrrTrend)
                    <span class="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums {{ $mrrTrend['flat'] ? 'bg-zinc-100 text-zinc-500' : ($mrrTrend['up'] ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700') }}">
                        @unless($mrrTrend['flat'])<x-icon :name="$mrrTrend['up'] ? 'arrow-up-right' : 'arrow-down-right'" class="h-3 w-3" stroke-width="2.25" />@endunless
                        <span class="sr-only">{{ $mrrTrend['flat'] ? 'Gelijk' : ($mrrTrend['up'] ? 'Gestegen' : 'Gedaald') }}: </span>
                        {{ ($mrrTrend['pct'] >= 0 ? '+' : '-').number_format(abs($mrrTrend['pct']), 1, ',', '.') }}%
                    </span>
                @endif
            </div>
            <div class="mt-1 text-xs text-zinc-500">Incl. btw {{ $money($kpis['mrr_incl']) }}{{ $mrrTrend ? ', t.o.v. vorige maand' : '' }}</div>
        </a>

        <a href="{{ $customersUrl }}?status=actief" class="card card-interactive focus-ring block p-4 sm:p-5">
            <div class="flex items-start justify-between gap-3">
                <span class="text-sm font-medium text-zinc-500">Actieve klanten</span>
                <span class="icon-tile h-8 w-8 rounded-lg {{ $tileTones['brand'] }}" aria-hidden="true"><x-icon name="users" class="h-4 w-4" /></span>
            </div>
            <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-semibold tabular-nums tracking-display text-zinc-900">{{ $nf($kpis['companies_active']) }}</span>
                <span class="text-sm text-zinc-500">van {{ $nf($kpis['companies_total']) }}</span>
            </div>
            <div class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-200/70" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="{{ $activeRatio }}" aria-label="Aandeel actieve klanten">
                <div class="h-full rounded-full bg-indigo-500" style="width: {{ min(100, max(0, $activeRatio)) }}%"></div>
            </div>
            <div class="mt-1.5 text-xs text-zinc-500">{{ $activeRatio }}% van alle klanten is actief</div>
        </a>

        <div class="card p-4 sm:p-5">
            <div class="flex items-start justify-between gap-3">
                <span class="text-sm font-medium text-zinc-500">Netto groei in periode</span>
                <span class="icon-tile h-8 w-8 rounded-lg {{ $netFlow >= 0 ? $tileTones['success'] : $tileTones['danger'] }}" aria-hidden="true"><x-icon :name="$netFlow >= 0 ? 'arrow-up-right' : 'arrow-down-right'" class="h-4 w-4" /></span>
            </div>
            <div class="mt-2 text-2xl font-semibold tabular-nums tracking-display {{ $netFlow < 0 ? 'text-rose-700' : 'text-zinc-900' }}">{{ $netFlow > 0 ? '+' : '' }}{{ $nf($netFlow) }}</div>
            <div class="mt-1 text-xs text-zinc-500">{{ $nf($kpis['active_new']) }} nieuw actief, {{ $nf($outflow) }} opgezegd of verloren</div>
        </div>

        <a href="{{ $customersUrl }}?status=proefperiode" class="card card-interactive focus-ring block p-4 sm:p-5">
            <div class="flex items-start justify-between gap-3">
                <span class="text-sm font-medium text-zinc-500">Pijplijn (demo)</span>
                <span class="icon-tile h-8 w-8 rounded-lg {{ $tileTones['warning'] }}" aria-hidden="true"><x-icon name="sparkles" class="h-4 w-4" /></span>
            </div>
            <div class="mt-2 text-2xl font-semibold tabular-nums tracking-display text-zinc-900">{{ $money($kpis['demo_pipeline_excl']) }}</div>
            <div class="mt-1 text-xs text-zinc-500">Modules van demo-klanten, telt niet mee in MRR</div>
        </a>
    </section>

    @php
        // Eenvoudige SVG-grafieken zonder externe library.
        $chartW = 640;
        $chartH = 240;
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
        $mrrLast = $mrrPoints !== [] ? end($mrrPoints) : null;

        $flowMax = max(1, ...array_map(fn ($row) => max((int) $row['in'], (int) $row['opgezegd'] + (int) $row['verloren']), $flowByMonth));
        $flowTop = (int) max(4, ceil($flowMax / 4) * 4);
        // Eigen afmetingen voor de smallere kaart, zodat staven en labels niet verkleinen.
        $flowW = 420;
        $flowH = 260;
        $flowPadL = 36;
        $flowPadR = 8;
        $flowPlotW = $flowW - $flowPadL - $flowPadR;
        $flowPlotH = $flowH - $padT - $padB;
        $flowSlot = $flowPlotW / max(1, count($flowByMonth));
        $barW = max(4, min(14, ($flowSlot - 6) / 2));
        $flowInTotal = array_sum(array_column($flowByMonth, 'in'));
        $flowOutTotal = array_sum(array_column($flowByMonth, 'opgezegd')) + array_sum(array_column($flowByMonth, 'verloren'));
    @endphp

    {{-- Grafieken --}}
    <div class="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <section id="mrr" class="card card-body scroll-mt-20 min-w-0 lg:col-span-7" aria-labelledby="mrr-heading">
            <div class="mb-4 flex items-start justify-between gap-3">
                <div class="flex min-w-0 flex-1 items-start gap-3">
                    <span class="icon-tile h-8 w-8 rounded-lg {{ $tileTones['success'] }}" aria-hidden="true"><x-icon name="bar-chart" class="h-4 w-4" /></span>
                    <div class="min-w-0">
                        <h2 id="mrr-heading" class="section-heading">MRR per maand</h2>
                        <p class="section-description">Laatste 12 maanden, excl. btw. Benadering uit start- en einddatums van modules; de huidige maand is exact.</p>
                    </div>
                </div>
                <button type="button" class="{{ $csvBtn }}" wire:click="export('mrr')" wire:loading.attr="disabled" wire:target="export" aria-label="MRR per maand exporteren als CSV">
                    <x-icon name="download" class="h-3.5 w-3.5" /> CSV
                </button>
            </div>
            @if (array_sum($mrrValues) <= 0)
                <p class="mb-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-3 text-sm text-zinc-500">Nog geen omzet in de afgelopen 12 maanden. Koppel modules aan actieve klanten om de grafiek te vullen.</p>
            @endif
            <svg viewBox="0 0 {{ $chartW }} {{ $chartH }}" class="h-auto w-full" role="img" aria-label="Lijngrafiek MRR per maand, laatste 12 maanden">
                <defs>
                    <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#aec22b" stop-opacity="0.32" />
                        <stop offset="100%" stop-color="#aec22b" stop-opacity="0" />
                    </linearGradient>
                </defs>
                @foreach ([0, 0.25, 0.5, 0.75, 1] as $f)
                    @php $gy = round($padT + $plotH - $plotH * $f, 1); @endphp
                    <line x1="{{ $padL }}" x2="{{ $chartW - $padR }}" y1="{{ $gy }}" y2="{{ $gy }}" stroke="#e4e4e7" stroke-width="1" @if($f > 0) stroke-dasharray="3 4" @endif />
                    <text x="{{ $padL - 10 }}" y="{{ $gy + 4 }}" text-anchor="end" font-size="11" fill="#71717a">{{ $euro($mrrTop * $f) }}</text>
                @endforeach
                @if ($mrrArea !== '')
                    <path d="{{ $mrrArea }}" fill="url(#mrrFill)" />
                    <polyline points="{{ $mrrPath }}" fill="none" stroke="#667319" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
                @endif
                @foreach ($mrrPoints as $i => $p)
                    @php $isLast = $i === count($mrrPoints) - 1; @endphp
                    <circle cx="{{ $p['x'] }}" cy="{{ $p['y'] }}" r="{{ $isLast ? 5 : 3.5 }}" fill="{{ $isLast ? '#667319' : '#fff' }}" stroke="#667319" stroke-width="2">
                        <title>{{ $p['row']['label'] }}: {{ $money($p['row']['excl']) }}</title>
                    </circle>
                    @if ($i % 2 === (count($mrrPoints) - 1) % 2)
                        <text x="{{ $p['x'] }}" y="{{ $chartH - 10 }}" text-anchor="{{ $isLast ? 'end' : 'middle' }}" font-size="11" fill="{{ $isLast ? '#3f3f46' : '#71717a' }}" font-weight="{{ $isLast ? 600 : 400 }}">{{ $p['row']['label'] }}</text>
                    @endif
                @endforeach
                @if ($mrrLast && (float) $mrrLast['row']['excl'] > 0)
                    <text x="{{ $mrrLast['x'] - 8 }}" y="{{ max($padT + 12, $mrrLast['y'] - 12) }}" text-anchor="end" font-size="12" font-weight="600" fill="#3f3f46">{{ $euro($mrrLast['row']['excl']) }}</text>
                @endif
            </svg>
            <dl class="mt-4 grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 text-sm sm:grid-cols-3">
                <div><dt class="text-xs text-zinc-500">Incl. btw</dt><dd class="font-semibold tabular-nums text-zinc-900">{{ $money($kpis['mrr_incl']) }}</dd></div>
                <div><dt class="text-xs text-zinc-500">BTW-deel</dt><dd class="font-semibold tabular-nums text-zinc-900">{{ $money($kpis['mrr_btw']) }}</dd></div>
                <div><dt class="text-xs text-zinc-500">Afgenomen modules</dt><dd class="font-semibold tabular-nums text-zinc-900"><a href="#modules" class="link">{{ $nf($kpis['modules_total_aantal']) }}</a></dd></div>
            </dl>
        </section>

        <section class="card card-body min-w-0 lg:col-span-5" aria-labelledby="flow-heading">
            <div class="mb-3 flex items-start justify-between gap-3">
                <div class="flex min-w-0 flex-1 items-start gap-3">
                    <span class="icon-tile h-8 w-8 rounded-lg {{ $tileTones['info'] }}" aria-hidden="true"><x-icon name="activity" class="h-4 w-4" /></span>
                    <div class="min-w-0">
                        <h2 id="flow-heading" class="section-heading">Instroom en uitstroom</h2>
                        <p class="section-description">Per maand: nieuw actief tegenover opgezegd en verloren.</p>
                    </div>
                </div>
                <button type="button" class="{{ $csvBtn }}" wire:click="export('instroom')" wire:loading.attr="disabled" wire:target="export" aria-label="Instroom en uitstroom exporteren als CSV">
                    <x-icon name="download" class="h-3.5 w-3.5" /> CSV
                </button>
            </div>
            <div class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                <a href="{{ $customersUrl }}?status=actief" class="inline-flex items-center gap-1.5 rounded hover:text-zinc-900 hover:underline focus-ring"><span class="h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden="true"></span>Nieuw actief <span class="font-semibold tabular-nums text-zinc-900">{{ $nf($flowInTotal) }}</span></a>
                <a href="{{ $customersUrl }}?status=opgezegd" class="inline-flex items-center gap-1.5 rounded hover:text-zinc-900 hover:underline focus-ring"><span class="h-2.5 w-2.5 rounded-sm bg-rose-500" aria-hidden="true"></span>Opgezegd</a>
                <a href="{{ $customersUrl }}?status=verloren" class="inline-flex items-center gap-1.5 rounded hover:text-zinc-900 hover:underline focus-ring"><span class="h-2.5 w-2.5 rounded-sm bg-rose-300" aria-hidden="true"></span>Verloren</a>
                <span class="text-zinc-500">Uit: <span class="font-semibold tabular-nums text-zinc-900">{{ $nf($flowOutTotal) }}</span></span>
            </div>
            <svg viewBox="0 0 {{ $flowW }} {{ $flowH }}" class="h-auto w-full" role="img" aria-label="Staafgrafiek instroom en uitstroom per maand, laatste 12 maanden">
                @foreach ([0, 0.25, 0.5, 0.75, 1] as $f)
                    @php $gy = round($padT + $flowPlotH - $flowPlotH * $f, 1); @endphp
                    <line x1="{{ $flowPadL }}" x2="{{ $flowW - $flowPadR }}" y1="{{ $gy }}" y2="{{ $gy }}" stroke="#e4e4e7" stroke-width="1" @if($f > 0) stroke-dasharray="3 4" @endif />
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
                        <rect x="{{ round($cx - $flowSlot / 2 + 1, 1) }}" y="{{ $padT }}" width="{{ round($flowSlot - 2, 1) }}" height="{{ $flowPlotH }}" rx="4" fill="{{ $i === count($flowByMonth) - 1 ? '#f4f4f5' : 'transparent' }}" />
                        <rect x="{{ round($cx - $barW - 1, 1) }}" y="{{ round($base - $hIn, 1) }}" width="{{ round($barW, 1) }}" height="{{ round($hIn, 1) }}" rx="2" fill="#10b981" />
                        <rect x="{{ round($cx + 1, 1) }}" y="{{ round($base - $hOp, 1) }}" width="{{ round($barW, 1) }}" height="{{ round($hOp, 1) }}" rx="2" fill="#f43f5e" />
                        <rect x="{{ round($cx + 1, 1) }}" y="{{ round($base - $hOp - $hVe, 1) }}" width="{{ round($barW, 1) }}" height="{{ round($hVe, 1) }}" rx="2" fill="#fda4af" />
                    </g>
                    @if ($i % 2 === (count($flowByMonth) - 1) % 2)
                        <text x="{{ round($cx, 1) }}" y="{{ $flowH - 10 }}" text-anchor="middle" font-size="11" fill="#71717a">{{ $row['label'] }}</text>
                    @endif
                @endforeach
            </svg>
        </section>
    </div>

    {{-- Funnel, instroom in periode, incasso --}}
    <div class="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
        <section class="card card-body min-w-0" aria-labelledby="funnel-heading">
            <div class="mb-4 flex items-start gap-3">
                <span class="icon-tile h-8 w-8 rounded-lg {{ $tileTones['brand'] }}" aria-hidden="true"><x-icon name="filter" class="h-4 w-4" /></span>
                <div class="min-w-0">
                    <h2 id="funnel-heading" class="section-heading">Klanten per status</h2>
                    <p class="section-description">Totaalbestand. Klik om de klanten te bekijken.</p>
                </div>
            </div>
            <ul class="-mx-2 space-y-0.5">
                @foreach($funnelSteps as $key => $step)
                    @php
                        $total = (int) ($funnel[$key] ?? 0);
                        $width = (int) round(($total / $funnelMax) * 100);
                    @endphp
                    <li>
                        <a href="{{ $customersUrl }}?status={{ $key }}" class="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                            <x-icon :name="$step['icon']" class="h-4 w-4 text-zinc-400 group-hover:text-zinc-600" />
                            <div class="min-w-0 flex-1">
                                <div class="mb-1 flex items-center justify-between gap-2 text-sm">
                                    <span class="text-zinc-700">{{ $step['label'] }}</span>
                                    <span class="font-semibold tabular-nums text-zinc-900">{{ $nf($total) }}</span>
                                </div>
                                <div class="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                                    <div class="h-full rounded-full {{ $step['bar'] }}" style="width: {{ min(100, max(0, $width)) }}%"></div>
                                </div>
                            </div>
                            <x-icon name="chevron-right" class="h-4 w-4 text-zinc-300 group-hover:text-zinc-500" />
                        </a>
                    </li>
                @endforeach
            </ul>
        </section>

        <section class="card card-body min-w-0" aria-labelledby="period-heading">
            <div class="mb-4 flex items-start gap-3">
                <span class="icon-tile h-8 w-8 rounded-lg {{ $tileTones['info'] }}" aria-hidden="true"><x-icon name="arrow-up-right" class="h-4 w-4" /></span>
                <div class="min-w-0">
                    <h2 id="period-heading" class="section-heading">In deze periode</h2>
                    <p class="section-description tabular-nums">{{ $range['start']->format('d-m-Y') }} t/m {{ $range['end']->format('d-m-Y') }}</p>
                </div>
            </div>
            @php
                $periodRows = [
                    ['label' => 'Nieuw toegevoegd', 'value' => $kpis['leads_new'], 'icon' => 'plus', 'href' => $customersUrl],
                    ['label' => 'Demo aangevraagd', 'value' => $kpis['demo_requested'], 'icon' => 'inbox', 'href' => $customersUrl.'?status=demo_aangevraagd'],
                    ['label' => 'Demo gestart', 'value' => $kpis['demo_started'], 'icon' => 'sparkles', 'href' => $customersUrl.'?status=proefperiode'],
                    ['label' => 'Nieuw actief', 'value' => $kpis['active_new'], 'icon' => 'check-circle', 'href' => $customersUrl.'?status=actief'],
                    ['label' => 'Opgezegd', 'value' => $kpis['cancelled'], 'icon' => 'log-out', 'href' => $customersUrl.'?status=opgezegd', 'bad' => true],
                    ['label' => 'Verloren', 'value' => $kpis['lost'], 'icon' => 'x-circle', 'href' => $customersUrl.'?status=verloren', 'bad' => true],
                ];
            @endphp
            <ul class="-mx-2 divide-y divide-zinc-100">
                @foreach($periodRows as $row)
                    <li>
                        <a href="{{ $row['href'] }}" class="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                            <x-icon :name="$row['icon']" class="h-4 w-4 text-zinc-400 group-hover:text-zinc-600" />
                            <span class="min-w-0 flex-1 text-sm text-zinc-700">{{ $row['label'] }}</span>
                            <span class="text-sm font-semibold tabular-nums {{ ! empty($row['bad']) && (int) $row['value'] > 0 ? 'text-rose-700' : 'text-zinc-900' }}">{{ $nf($row['value']) }}</span>
                        </a>
                    </li>
                @endforeach
            </ul>
        </section>

        <section class="card card-body min-w-0 md:col-span-2 xl:col-span-1" aria-labelledby="sepa-heading">
            <div class="mb-4 flex items-start gap-3">
                <span class="icon-tile h-8 w-8 rounded-lg {{ $tileTones['success'] }}" aria-hidden="true"><x-icon name="credit-card" class="h-4 w-4" /></span>
                <div class="min-w-0">
                    <h2 id="sepa-heading" class="section-heading">Incasso en modules</h2>
                    <p class="section-description">SEPA-machtigingen en het module-aanbod.</p>
                </div>
            </div>
            <dl class="grid grid-cols-2 gap-3">
                <div class="rounded-xl bg-zinc-50 px-3 py-2.5 ring-1 ring-inset ring-zinc-100">
                    <dt class="text-xs text-zinc-500">Mandaten actief</dt>
                    <dd class="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">{{ $nf($kpis['mandates_active']) }}</dd>
                </div>
                <div class="rounded-xl bg-zinc-50 px-3 py-2.5 ring-1 ring-inset ring-zinc-100">
                    <dt class="text-xs text-zinc-500">In afwachting</dt>
                    <dd class="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">{{ $nf($kpis['mandates_pending']) }}</dd>
                </div>
                <div class="rounded-xl bg-zinc-50 px-3 py-2.5 ring-1 ring-inset ring-zinc-100">
                    <dt class="text-xs text-zinc-500">Modules in gebruik</dt>
                    <dd class="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">{{ $nf($kpis['modules_active']) }} <span class="text-sm font-normal text-zinc-500">van {{ $nf($kpis['modules_total']) }}</span></dd>
                </div>
                <div class="rounded-xl bg-zinc-50 px-3 py-2.5 ring-1 ring-inset ring-zinc-100">
                    <dt class="text-xs text-zinc-500">Modules beheren</dt>
                    <dd class="mt-1"><a href="{{ route('crm.modules.index') }}" class="link inline-flex items-center gap-1 text-sm">Naar modules<x-icon name="chevron-right" class="h-3.5 w-3.5" /></a></dd>
                </div>
            </dl>
            @if((int) $kpis['active_without_mandate'] > 0)
                <a href="{{ $dashboardUrl }}#sepa" class="mt-3 flex items-center gap-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-inset ring-amber-200 transition-colors hover:bg-amber-100 focus-ring">
                    <x-icon name="alert-triangle" class="h-4 w-4 text-amber-600" />
                    <span class="min-w-0 flex-1"><span class="font-semibold tabular-nums">{{ $nf($kpis['active_without_mandate']) }}</span> actief zonder complete SEPA</span>
                    <span class="font-medium">Bekijken</span>
                </a>
            @else
                <p class="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
                    <x-icon name="check-circle" class="h-4 w-4" />
                    SEPA van alle actieve klanten is compleet.
                </p>
            @endif
        </section>
    </div>

    {{-- Modules --}}
    <section id="modules" class="card scroll-mt-20 min-w-0 overflow-hidden" aria-labelledby="modules-heading">
        <div class="card-header">
            <div class="flex min-w-0 items-start gap-3">
                <span class="icon-tile h-8 w-8 rounded-lg {{ $tileTones['info'] }}" aria-hidden="true"><x-icon name="package" class="h-4 w-4" /></span>
                <div class="min-w-0">
                    <h2 id="modules-heading" class="section-heading">Modules prestaties</h2>
                    <p class="section-description">Alleen klanten met status Actief. Demo-klanten tellen niet mee.</p>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <a href="{{ route('crm.modules.index') }}" class="btn btn-ghost btn-xs">Modules beheren</a>
                <button type="button" class="{{ $csvBtn }}" wire:click="export('modules')" wire:loading.attr="disabled" wire:target="export" aria-label="Modules prestaties exporteren als CSV">
                    <x-icon name="download" class="h-3.5 w-3.5" /> CSV
                </button>
            </div>
        </div>

        @if($topModules->isNotEmpty() && (float) $topModules->first()->mrr_excl > 0)
            <div class="grid grid-cols-1 gap-3 border-b border-zinc-100 px-5 py-4 sm:grid-cols-3 sm:px-6">
                @foreach($topModules as $module)
                    <div class="flex min-w-0 items-center gap-3">
                        <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100/80 text-xs font-semibold tabular-nums text-indigo-800" aria-label="Plaats {{ $loop->iteration }}">{{ $loop->iteration }}</span>
                        <div class="min-w-0">
                            <div class="truncate text-sm font-medium text-zinc-800">{{ $module->naam }}</div>
                            <div class="text-xs tabular-nums text-zinc-500">{{ $money($module->mrr_excl) }} per maand, {{ (int) round(((float) $module->mrr_excl / $mrrTotal) * 100) }}%</div>
                        </div>
                    </div>
                @endforeach
            </div>
        @endif

        <div class="overflow-x-auto">
            <table class="table-base">
                <thead class="table-head">
                    <tr>
                        <th scope="col" class="table-th">Module</th>
                        <th scope="col" class="table-th text-right">Klanten</th>
                        <th scope="col" class="table-th text-right">Aantal</th>
                        <th scope="col" class="table-th text-right">MRR excl.</th>
                        <th scope="col" class="table-th hidden w-40 sm:table-cell"><span class="sr-only">Aandeel</span></th>
                        <th scope="col" class="table-th text-right">BTW %</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100">
                    @forelse($modulesOverview as $row)
                        @php
                            $btwMin = (float) $row->btw_min;
                            $btwMax = (float) $row->btw_max;
                            $share = (int) round(((float) $row->mrr_excl / $moduleMrrMax) * 100);
                        @endphp
                        <tr class="table-row">
                            <td class="table-td font-medium text-zinc-900">{{ $row->naam }}</td>
                            <td class="table-td text-right tabular-nums">{{ $nf($row->active_customers) }}</td>
                            <td class="table-td text-right tabular-nums">{{ $nf($row->total_aantal) }}</td>
                            <td class="table-td text-right font-semibold tabular-nums text-zinc-900">{{ $money($row->mrr_excl) }}</td>
                            <td class="table-td hidden sm:table-cell">
                                <div class="h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
                                    <div class="h-full rounded-full bg-sky-400" style="width: {{ min(100, max(0, $share)) }}%"></div>
                                </div>
                            </td>
                            <td class="table-td text-right tabular-nums text-zinc-600">
                                @if(abs($btwMin - $btwMax) < 0.001)
                                    {{ $nf($btwMin) }}
                                @else
                                    {{ $nf($btwMin) }}&ndash;{{ $nf($btwMax) }}
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="px-4 py-10 text-center text-sm text-zinc-500">Nog geen modules. <a href="{{ route('crm.modules.index') }}" class="link">Module toevoegen</a></td>
                        </tr>
                    @endforelse
                </tbody>
                @if($modulesOverview->isNotEmpty())
                    <tfoot class="border-t border-zinc-200 bg-zinc-50/70">
                        <tr>
                            <td class="table-td font-semibold text-zinc-900">Totaal</td>
                            <td class="table-td"></td>
                            <td class="table-td text-right font-semibold tabular-nums text-zinc-900">{{ $nf($kpis['modules_total_aantal']) }}</td>
                            <td class="table-td text-right font-semibold tabular-nums text-zinc-900">{{ $money($kpis['mrr_excl']) }}</td>
                            <td class="table-td hidden sm:table-cell"></td>
                            <td class="table-td"></td>
                        </tr>
                    </tfoot>
                @endif
            </table>
        </div>
    </section>

    {{-- Top klanten --}}
    <section class="card min-w-0 overflow-hidden" aria-labelledby="top-heading">
        <div class="card-header">
            <div class="flex min-w-0 items-start gap-3">
                <span class="icon-tile h-8 w-8 rounded-lg {{ $tileTones['brand'] }}" aria-hidden="true"><x-icon name="users" class="h-4 w-4" /></span>
                <div class="min-w-0">
                    <h2 id="top-heading" class="section-heading">Top 10 klanten op MRR</h2>
                    <p class="section-description">Alleen status Actief. De CSV bevat alle klanten.</p>
                </div>
            </div>
            <button type="button" class="{{ $csvBtn }}" wire:click="export('klanten')" wire:loading.attr="disabled" wire:target="export" aria-label="Alle klanten op MRR exporteren als CSV">
                <x-icon name="download" class="h-3.5 w-3.5" /> CSV
            </button>
        </div>
        @if($topCustomers->isEmpty())
            <div class="px-5 py-10 text-center sm:px-6">
                <p class="text-sm font-semibold text-zinc-900">Nog geen actieve klanten met module-omzet</p>
                <p class="mt-1 text-sm text-zinc-500">Koppel modules aan een actieve klant via Abonnement.</p>
                <a href="{{ $customersUrl }}?status=actief" class="btn btn-secondary btn-sm mt-4">Actieve klanten</a>
            </div>
        @else
            <ol class="divide-y divide-zinc-100">
                @foreach($topCustomers as $row)
                    @php $share = (int) round(((float) $row->mrr_excl / $topCustomerMax) * 100); @endphp
                    <li class="flex min-w-0 items-center gap-3 px-5 py-3 transition-colors hover:bg-zinc-50/70 sm:gap-4 sm:px-6">
                        <span class="w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-zinc-400">{{ $loop->iteration }}</span>
                        <x-avatar :name="$row->bedrijfsnaam" size="sm" />
                        <div class="min-w-0 flex-1">
                            <a href="{{ route('crm.garage_companies.show', ['garageCompany' => $row->id]) }}" class="block truncate rounded text-sm font-medium text-zinc-900 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">{{ $row->bedrijfsnaam }}</a>
                            <span class="mt-0.5 inline-flex min-w-0 max-w-full items-center gap-1 text-xs text-zinc-500">
                                <x-icon name="map-pin" class="h-3.5 w-3.5 text-zinc-400" />
                                <span class="truncate">{{ filled($row->plaats) ? $row->plaats : 'Plaats onbekend' }}</span>
                            </span>
                        </div>
                        <div class="hidden h-1.5 w-40 shrink-0 overflow-hidden rounded-full bg-zinc-100 md:block" aria-hidden="true">
                            <div class="h-full rounded-full bg-indigo-500" style="width: {{ min(100, max(0, $share)) }}%"></div>
                        </div>
                        <div class="w-24 shrink-0 text-right">
                            <div class="text-sm font-semibold tabular-nums text-zinc-900">{{ $money($row->mrr_excl) }}</div>
                            <a href="{{ route('crm.garage_companies.show', ['garageCompany' => $row->id, 'tab' => 'abonnement']) }}" class="rounded text-xs font-medium text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">Abonnement</a>
                        </div>
                    </li>
                @endforeach
            </ol>
        @endif
    </section>
</div>
