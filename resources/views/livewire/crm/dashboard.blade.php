<div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <div class="mt-1 text-sm text-zinc-600">
                Periode: {{ $from->format('d-m-Y') }} t/m {{ $to->format('d-m-Y') }}
            </div>
        </div>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
                <label class="block text-xs font-medium text-zinc-600">Periode</label>
                <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="periode">
                    <option value="deze_maand">Deze maand</option>
                    <option value="laatste_30">Laatste 30 dagen</option>
                    <option value="laatste_90">Laatste 90 dagen</option>
                    <option value="custom">Custom</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Status</label>
                <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="status">
                    <option value="alle">Alle</option>
                    @foreach(\App\Enums\GarageCompanyStatus::cases() as $case)
                        <option value="{{ $case->value }}">{{ $case->value }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Land</label>
                <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="land">
                    <option value="Nederland">Alleen Nederland</option>
                    <option value="alle">Alle landen</option>
                </select>
            </div>
        </div>
    </div>

    @if($periode === 'custom')
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
                <label class="block text-xs font-medium text-zinc-600">Start</label>
                <input type="date" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="start">
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Eind</label>
                <input type="date" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="end">
            </div>
        </div>
    @endif

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Maandelijks terugkerende omzet (excl. btw)</div>
            <div class="mt-2 text-2xl font-semibold">&euro; {{ number_format($mrrExcl, 2, ',', '.') }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Maandelijks terugkerende omzet (incl. btw)</div>
            <div class="mt-2 text-2xl font-semibold">&euro; {{ number_format($mrrIncl, 2, ',', '.') }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Nieuwe actief (periode)</div>
            <div class="mt-2 text-2xl font-semibold">{{ $newActief }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Opzeggingen (periode)</div>
            <div class="mt-2 text-2xl font-semibold">{{ $opzeggingen }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Demo aangevraagd (periode)</div>
            <div class="mt-2 text-2xl font-semibold">{{ $demoAangevraagd }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-xs font-medium text-zinc-500">Conversie demo &rarr; actief (30d)</div>
            <div class="mt-2 text-2xl font-semibold">
                @if(is_null($conversieDemoNaarActief30))
                    -
                @else
                    {{ $conversieDemoNaarActief30 }}%
                @endif
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="mb-3 flex items-center justify-between">
                <div class="text-sm font-semibold">Pipeline</div>
                <a href="{{ route('crm.garage_companies.index') }}" class="text-sm font-semibold text-indigo-700 hover:text-indigo-900">Open lijst</a>
            </div>
            <div class="space-y-2">
                @foreach(\App\Enums\GarageCompanyStatus::cases() as $case)
                    <a class="flex items-center justify-between rounded-md px-2 py-1 hover:bg-zinc-50" href="{{ route('crm.garage_companies.index', ['status' => $case->value]) }}">
                        <span class="text-sm">{{ $case->value }}</span>
                        <span class="text-sm font-semibold">{{ $pipeline[$case->value] ?? 0 }}</span>
                    </a>
                @endforeach
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-sm font-semibold">Incasso &amp; risico</div>
            <div class="mt-3 space-y-2 text-sm">
                <div class="flex items-center justify-between">
                    <span>Mandaten pending (klanten)</span>
                    <span class="font-semibold">{{ $mandatenPending }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Mandaten actief (klanten)</span>
                    <span class="font-semibold">{{ $mandatenActief }}</span>
                </div>
            </div>
            <div class="mt-4 text-xs font-semibold text-zinc-500">Top 10 aandacht</div>
            <div class="mt-2 space-y-2">
                <div class="text-xs text-zinc-500">Zonder mandaat &gt; 7 dagen na demo:</div>
                <ul class="space-y-1">
                    @forelse($zonderMandaatNaDemo7 as $c)
                        <li><a class="text-sm font-semibold text-indigo-700 hover:text-indigo-900" href="{{ route('crm.garage_companies.show', $c) }}">{{ $c->bedrijfsnaam }}</a></li>
                    @empty
                        <li class="text-sm text-zinc-500">Geen.</li>
                    @endforelse
                </ul>
                <div class="pt-2 text-xs text-zinc-500">Actief/proef zonder actief mandaat:</div>
                <ul class="space-y-1">
                    @forelse($actiefZonderActiefMandaat as $c)
                        <li><a class="text-sm font-semibold text-indigo-700 hover:text-indigo-900" href="{{ route('crm.garage_companies.show', $c) }}">{{ $c->bedrijfsnaam }}</a></li>
                    @empty
                        <li class="text-sm text-zinc-500">Geen.</li>
                    @endforelse
                </ul>
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-sm font-semibold">Modules &amp; upsell</div>
            <div class="mt-3">
                <div class="text-xs font-semibold text-zinc-500">Top 5 module adoptie</div>
                <ul class="mt-2 space-y-1">
                    @foreach($moduleAdoptie as $row)
                        <li class="flex items-center justify-between">
                            <span class="text-sm">{{ $row->naam }}</span>
                            <span class="text-sm font-semibold">{{ (int) $row->actief_aantal }}</span>
                        </li>
                    @endforeach
                </ul>
            </div>
            <div class="mt-4">
                <div class="text-xs font-semibold text-zinc-500">Top 10 actieve gebruikers</div>
                <ul class="mt-2 space-y-1">
                    @foreach($seatsTop10 as $c)
                        <li class="flex items-center justify-between">
                            <a class="truncate text-sm font-semibold text-indigo-700 hover:text-indigo-900" href="{{ route('crm.garage_companies.show', $c) }}">{{ $c->bedrijfsnaam }}</a>
                            <span class="text-sm font-semibold">{{ $c->actieve_seats }}</span>
                        </li>
                    @endforeach
                </ul>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-sm font-semibold">Actie pipeline</div>
            <div class="mt-3 space-y-2 text-sm">
                <div class="flex items-center justify-between">
                    <span>Over deadline</span>
                    <span class="font-semibold">{{ $actiesOverdue }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Komende 7 dagen</span>
                    <span class="font-semibold">{{ $actiesKomend7 }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Zonder deadline</span>
                    <span class="font-semibold">{{ $actiesZonderDeadline }}</span>
                </div>
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-sm font-semibold">Aandacht op termijn</div>
            <div class="mt-3 space-y-3">
                <div>
                    <div class="text-xs font-semibold text-zinc-500">Demo verloopt binnen 3 dagen</div>
                    <ul class="mt-2 space-y-1">
                        @forelse($demoVerlooptBinnen3 as $c)
                            <li class="flex items-center justify-between text-sm">
                                <a class="font-semibold text-indigo-700 hover:text-indigo-900" href="{{ route('crm.garage_companies.show', $c) }}">{{ $c->bedrijfsnaam }}</a>
                                <span class="text-xs text-zinc-500">{{ $c->demo_eind_op?->format('d-m') }}</span>
                            </li>
                        @empty
                            <li class="text-sm text-zinc-500">Geen.</li>
                        @endforelse
                    </ul>
                </div>
                <div>
                    <div class="text-xs font-semibold text-zinc-500">Demo verloopt binnen 7 dagen</div>
                    <ul class="mt-2 space-y-1">
                        @forelse($demoVerlooptBinnen7 as $c)
                            <li class="flex items-center justify-between text-sm">
                                <a class="font-semibold text-indigo-700 hover:text-indigo-900" href="{{ route('crm.garage_companies.show', $c) }}">{{ $c->bedrijfsnaam }}</a>
                                <span class="text-xs text-zinc-500">{{ $c->demo_eind_op?->format('d-m') }}</span>
                            </li>
                        @empty
                            <li class="text-sm text-zinc-500">Geen.</li>
                        @endforelse
                    </ul>
                </div>
                <div>
                    <div class="text-xs font-semibold text-zinc-500">Demo verlopen</div>
                    <ul class="mt-2 space-y-1">
                        @forelse($demoVerlopen as $c)
                            <li class="flex items-center justify-between text-sm">
                                <a class="font-semibold text-indigo-700 hover:text-indigo-900" href="{{ route('crm.garage_companies.show', $c) }}">{{ $c->bedrijfsnaam }}</a>
                                <span class="text-xs text-zinc-500">{{ $c->demo_eind_op?->format('d-m') }}</span>
                            </li>
                        @empty
                            <li class="text-sm text-zinc-500">Geen.</li>
                        @endforelse
                    </ul>
                </div>
                <div>
                    <div class="text-xs font-semibold text-zinc-500">Demo zonder einddatum</div>
                    <ul class="mt-2 space-y-1">
                        @forelse($demoZonderEind as $c)
                            <li class="text-sm">
                                <a class="font-semibold text-indigo-700 hover:text-indigo-900" href="{{ route('crm.garage_companies.show', $c) }}">{{ $c->bedrijfsnaam }}</a>
                            </li>
                        @empty
                            <li class="text-sm text-zinc-500">Geen.</li>
                        @endforelse
                    </ul>
                </div>
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-sm font-semibold">Notificaties &amp; alerts</div>
            <ul class="mt-3 space-y-2 text-sm">
                @forelse($alerts as $alert)
                    <li class="flex items-start justify-between gap-3 rounded-md border border-zinc-100 px-2 py-1">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                @php($level = $alert['level'] ?? 'laag')
                                <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold
                                    @if($level === 'kritiek') bg-red-100 text-red-800
                                    @elseif($level === 'hoog') bg-amber-100 text-amber-800
                                    @elseif($level === 'medium') bg-yellow-100 text-yellow-800
                                    @else bg-zinc-100 text-zinc-700 @endif">
                                    {{ ucfirst($level) }}
                                </span>
                                <span class="text-xs font-semibold text-zinc-500">{{ $alert['label'] }}</span>
                            </div>
                            <div class="truncate font-semibold">{{ $alert['company']->bedrijfsnaam }}</div>
                            <div class="text-xs text-zinc-500">{{ optional($alert['date'])->format('d-m-Y') }}</div>
                        </div>
                        <a href="{{ route('crm.garage_companies.show', $alert['company']) }}" class="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50">Open</a>
                    </li>
                @empty
                    <li class="text-sm text-zinc-500">Geen meldingen.</li>
                @endforelse
            </ul>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-sm font-semibold">Feedback &amp; wensen</div>
            <form wire:submit="addFeedback" class="mt-3 space-y-3">
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Klant</label>
                    <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="feedback_company_id">
                        <option value="">Selecteer klant</option>
                        @foreach($feedbackCompanies as $c)
                            <option value="{{ $c->id }}">{{ $c->bedrijfsnaam }}</option>
                        @endforeach
                    </select>
                    @error('feedback_company_id')
                        <div class="mt-1 text-xs text-red-600">{{ $message }}</div>
                    @enderror
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Wens/feedback</label>
                    <textarea class="mt-1 w-full rounded-md border-zinc-300 text-sm" rows="3" wire:model.live="feedback_inhoud" placeholder="Schrijf een korte wens of feedback"></textarea>
                    @error('feedback_inhoud')
                        <div class="mt-1 text-xs text-red-600">{{ $message }}</div>
                    @enderror
                </div>
                <div class="flex justify-end">
                    <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Toevoegen</button>
                </div>
            </form>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
            <div class="text-sm font-semibold">Open feedback</div>
            <ul class="mt-3 divide-y divide-zinc-100">
                @forelse($feedbackItems as $item)
                    <li class="py-3">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <div class="truncate text-sm font-semibold">{{ $item->garageCompany?->bedrijfsnaam ?? 'Onbekend' }}</div>
                                <div class="mt-0.5 text-xs text-zinc-600 @if($item->done_at) line-through text-zinc-400 @endif">{{ $item->inhoud }}</div>
                                <div class="mt-1 text-xs text-zinc-500">
                                    {{ $item->done_at ? 'Afgerond' : 'Open' }} · {{ $item->created_at->format('d-m-Y H:i') }}
                                </div>
                            </div>
                            <button type="button" wire:click="toggleFeedbackDone({{ $item->id }})" class="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50">
                                @if($item->done_at)
                                    Heropen
                                @else
                                    Afvinken
                                @endif
                            </button>
                        </div>
                    </li>
                @empty
                    <li class="py-6 text-sm text-zinc-500">Nog geen feedback.</li>
                @endforelse
            </ul>
        </div>
    </div>

    <details class="group rounded-xl border border-zinc-200 bg-white p-5">
        <summary class="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
            Meer details
            <span class="text-xs font-semibold text-zinc-500 group-open:hidden">Toon</span>
            <span class="text-xs font-semibold text-zinc-500 hidden group-open:inline">Verberg</span>
        </summary>
        <div class="mt-4 space-y-4">
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div class="rounded-xl border border-zinc-200 bg-white p-5">
                    <div class="text-sm font-semibold">Acties</div>
                    <div class="mt-3">
                        <div class="text-xs font-semibold text-zinc-500">Afspraken komende 7 dagen</div>
                        <ul class="mt-2 space-y-1">
                            @forelse($afsprakenKomend as $a)
                                <li class="text-sm">
                                    <a class="font-semibold text-indigo-700 hover:text-indigo-900" href="{{ route('crm.garage_companies.show', $a->garage_company_id) }}">{{ $a->titel }}</a>
                                    <div class="text-xs text-zinc-500">{{ optional($a->due_at)->format('d-m H:i') }}</div>
                                </li>
                            @empty
                                <li class="text-sm text-zinc-500">Geen afspraken.</li>
                            @endforelse
                        </ul>
                    </div>
                    <div class="mt-4">
                        <div class="text-xs font-semibold text-zinc-500">Taken open</div>
                        <ul class="mt-2 space-y-1">
                            @forelse($takenOpen as $t)
                                <li class="text-sm">
                                    <a class="font-semibold text-indigo-700 hover:text-indigo-900" href="{{ route('crm.garage_companies.show', $t->garage_company_id) }}">{{ $t->titel }}</a>
                                    <div class="text-xs text-zinc-500">{{ $t->due_at ? $t->due_at->format('d-m H:i') : 'Geen deadline' }}</div>
                                </li>
                            @empty
                                <li class="text-sm text-zinc-500">Geen taken.</li>
                            @endforelse
                        </ul>
                    </div>
                </div>

                <div class="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
                    <div class="mb-3 flex items-center justify-between">
                        <div class="text-sm font-semibold">Laatst gewijzigd</div>
                        <a href="{{ route('crm.garage_companies.index') }}" class="text-sm font-semibold text-indigo-700 hover:text-indigo-900">Zoek klant</a>
                    </div>
                    <ul class="divide-y divide-zinc-100">
                        @forelse($laatsteActiviteiten as $a)
                            <li class="py-3">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="min-w-0">
                                        <div class="truncate text-sm font-semibold">{{ $a->garageCompany?->bedrijfsnaam ?? 'Onbekend' }}</div>
                                        <div class="text-xs text-zinc-500">{{ $a->titel }}</div>
                                        @if($a->inhoud)
                                            <div class="mt-0.5 text-xs text-zinc-600">{{ \Illuminate\Support\Str::limit($a->inhoud, 160) }}</div>
                                        @endif
                                        <div class="mt-1 text-xs text-zinc-500">{{ $a->created_at->format('d-m-Y H:i') }}</div>
                                    </div>
                                    <a href="{{ route('crm.garage_companies.show', $a->garage_company_id) }}" class="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50">
                                        Open
                                    </a>
                                </div>
                            </li>
                        @empty
                            <li class="py-6 text-sm text-zinc-500">Nog geen activiteiten.</li>
                        @endforelse
                    </ul>
                </div>
            </div>

        </div>
    </details>
</div>
