<div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
            <h1 class="text-2xl font-semibold tracking-tight">Modules</h1>
            <div class="mt-1 text-sm text-zinc-600">Voeg modules toe of pas naam, standaardprijs en btw aan.</div>
        </div>
        <button type="button" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" wire:click="startCreate">
            Nieuwe module
        </button>
    </div>

    @if(session('livewire_status'))
        <div role="status" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ session('livewire_status') }}</div>
    @endif
    @if(session('livewire_error'))
        <div role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{{ session('livewire_error') }}</div>
    @endif

    @if($showForm)
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold">{{ $moduleId ? 'Module bewerken' : 'Module toevoegen' }}</div>
                <button type="button" class="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="cancel">
                    Annuleren
                </button>
            </div>

            <form wire:submit="save" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label for="module_naam" class="block text-xs font-medium text-zinc-600">Naam *</label>
                    <input id="module_naam" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="naam" />
                    @error('naam') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div class="flex items-center gap-2 pt-6">
                    <input type="checkbox" class="rounded border-zinc-300" wire:model="default_visible" id="default_visible">
                    <label for="default_visible" class="text-sm">Standaard zichtbaar</label>
                </div>
                @if($supportsDefaultPricing)
                    <div>
                        <label for="module_prijs" class="block text-xs font-medium text-zinc-600">Prijs (excl.) *</label>
                        <input id="module_prijs" type="number" step="0.01" min="0" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="default_prijs_maand_excl" />
                        @error('default_prijs_maand_excl') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                    </div>
                    <div>
                        <label for="module_btw" class="block text-xs font-medium text-zinc-600">BTW percentage *</label>
                        <input id="module_btw" type="number" step="0.01" min="0" max="100" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="default_btw_percentage" />
                        @error('default_btw_percentage') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                    </div>
                @else
                    <div class="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Standaard moduleprijzen zijn nog niet beschikbaar. Draai eerst de nieuwste migraties.
                    </div>
                @endif
                <div class="sm:col-span-2">
                    <label for="module_omschrijving" class="block text-xs font-medium text-zinc-600">Omschrijving</label>
                    <textarea id="module_omschrijving" class="mt-1 w-full rounded-md border-zinc-300 text-sm" rows="3" wire:model="omschrijving"></textarea>
                    @error('omschrijving') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div class="sm:col-span-2 flex justify-end">
                    <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60" wire:loading.attr="disabled" wire:target="save">
                        <span wire:loading.remove wire:target="save">Opslaan</span>
                        <span wire:loading wire:target="save">Opslaan...</span>
                    </button>
                </div>
            </form>
        </div>
    @endif

    <div class="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table class="min-w-full divide-y divide-zinc-100">
            <thead class="bg-zinc-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Naam</th>
                    @if($supportsDefaultPricing)
                        <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Prijs (excl.)</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">BTW %</th>
                    @endif
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Standaard zichtbaar</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Omschrijving</th>
                    <th class="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
                @forelse($modules as $m)
                    <tr class="hover:bg-zinc-50">
                        <td class="px-4 py-3 text-sm font-semibold">{{ $m->naam }}</td>
                        @if($supportsDefaultPricing)
                            <td class="whitespace-nowrap px-4 py-3 text-sm">&euro; {{ number_format((float) $m->default_prijs_maand_excl, 2, ',', '.') }}</td>
                            @php
                                $btw = (float) $m->default_btw_percentage;
                                $btwDecimals = abs($btw - round($btw)) < 0.001 ? 0 : 2;
                            @endphp
                            <td class="whitespace-nowrap px-4 py-3 text-sm">{{ number_format($btw, $btwDecimals, ',', '.') }}%</td>
                        @endif
                        <td class="px-4 py-3 text-sm">{{ $m->default_visible ? 'Ja' : 'Nee' }}</td>
                        <td class="px-4 py-3 text-sm text-zinc-600">{{ \Illuminate\Support\Str::limit($m->omschrijving ?? '', 80) ?: '-' }}</td>
                        <td class="whitespace-nowrap px-4 py-3 text-right">
                            <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50" wire:click="startEdit({{ $m->id }})">Bewerken</button>
                            <button type="button" class="ml-2 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50" wire:click="deleteModule({{ $m->id }})" wire:confirm="Weet je zeker dat je deze module wilt verwijderen?">Verwijderen</button>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="{{ $supportsDefaultPricing ? 6 : 4 }}" class="px-4 py-10 text-center text-sm text-zinc-600">Nog geen modules.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

</div>
