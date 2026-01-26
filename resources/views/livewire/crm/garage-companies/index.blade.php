<div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight">Klanten</h1>
            <div class="mt-1 text-sm text-zinc-600">Snel zoeken, filteren en beheren.</div>
        </div>
        <div class="flex items-center gap-2">
            <a href="{{ route('crm.garage_companies.create') }}" class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Nieuwe klant
            </a>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-6">
        <div class="lg:col-span-2">
            <label class="block text-xs font-medium text-zinc-600">Zoeken</label>
            <input
                type="text"
                class="mt-1 w-full rounded-md border-zinc-300 text-sm"
                placeholder="Bedrijfsnaam, e-mail, telefoon, IBAN, status"
                wire:model.live.debounce.350ms="search"
            />
        </div>
        <div>
            <label class="block text-xs font-medium text-zinc-600">Status</label>
            <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="status">
                <option value="alle">Alle</option>
                @foreach($statuses as $s)
                    <option value="{{ $s->value }}">{{ $s->value }}</option>
                @endforeach
            </select>
        </div>
        <div>
            <label class="block text-xs font-medium text-zinc-600">Bron</label>
            <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="bron">
                <option value="alle">Alle</option>
                @foreach($sources as $s)
                    <option value="{{ $s->value }}">{{ $s->value }}</option>
                @endforeach
            </select>
        </div>
        <div>
            <label class="block text-xs font-medium text-zinc-600">Tags</label>
            <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live.debounce.350ms="tag" placeholder="bijv. referral" />
        </div>
        <div>
            <label class="block text-xs font-medium text-zinc-600">Sorteren</label>
            <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="sort">
                <option value="updated_desc">Laatst bijgewerkt</option>
                <option value="actief_vanaf_desc">Actief vanaf</option>
                <option value="omzet_desc">Terugkerende omzet hoogste</option>
            </select>
        </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table class="min-w-full divide-y divide-zinc-100">
            <thead class="bg-zinc-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Klant</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Status</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Terugkerende omzet (excl. btw)</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Gebruikers</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Bijgewerkt</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
                @forelse($companies as $c)
                    <tr class="hover:bg-zinc-50">
                        <td class="px-4 py-3">
                            <a href="{{ route('crm.garage_companies.show', $c) }}" class="font-semibold text-indigo-700 hover:text-indigo-900">
                                {{ $c->bedrijfsnaam }}
                            </a>
                            <div class="mt-0.5 text-xs text-zinc-500">
                                {{ $c->hoofd_email }} &middot; {{ $c->hoofd_telefoon }} &middot; {{ $c->plaats }}
                            </div>
                        </td>
                        <td class="px-4 py-3 text-sm">
                            <span class="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                                {{ $c->status->value }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-sm font-semibold">&euro; {{ number_format((float) ($c->omzet_excl ?? 0), 2, ',', '.') }}</td>
                        <td class="px-4 py-3 text-sm">{{ $c->actieve_seats }}</td>
                        <td class="px-4 py-3 text-sm text-zinc-600">{{ $c->updated_at->format('d-m-Y H:i') }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="px-4 py-10 text-center text-sm text-zinc-600">
                            Geen resultaten. Pas filters aan of maak een nieuwe klant aan.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div>
        {{ $companies->links() }}
    </div>
</div>
