    <div class="space-y-6">
        <div class="flex items-center justify-between gap-3">
            <div>
                <div class="text-sm font-semibold">Modules &amp; prijzen</div>
            <div class="mt-1 text-xs text-zinc-500">
                Activeer modules en leg prijsafspraken vast per maand.
                <span class="ml-2">Actief: {{ $actieveModules }} / {{ $totaalModules }}</span>
                <span class="ml-2">Actief &rarr; aantal &ge; 1 verplicht. Prijs 0 is toegestaan.</span>
            </div>
            </div>
            <button type="button" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" wire:click="save">
                Opslaan
            </button>
        </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div class="text-xs font-medium text-zinc-500">Totaal excl. btw</div>
            <div class="mt-1 text-xl font-semibold">&euro; {{ number_format($totaalExcl, 2, ',', '.') }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div class="text-xs font-medium text-zinc-500">BTW bedrag</div>
            <div class="mt-1 text-xl font-semibold">&euro; {{ number_format($btw, 2, ',', '.') }}</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div class="text-xs font-medium text-zinc-500">Totaal incl. btw</div>
            <div class="mt-1 text-xl font-semibold">&euro; {{ number_format($totaalIncl, 2, ',', '.') }}</div>
        </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table class="min-w-full divide-y divide-zinc-100">
            <thead class="bg-zinc-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Actief</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Module</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Aantal</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Prijs (excl. btw)</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">BTW %</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
                @foreach($rows as $i => $row)
                    <tr class="hover:bg-zinc-50">
                        <td class="px-4 py-3">
                            <input type="checkbox" class="rounded border-zinc-300" wire:model.live="rows.{{ $i }}.actief" />
                        </td>
                        <td class="px-4 py-3 text-sm font-semibold">
                            {{ $row['naam'] }}
                        </td>
                        <td class="px-4 py-3">
                            <input type="number" step="1" min="0" max="999" class="w-24 rounded-md border-zinc-300 text-sm" wire:model.live="rows.{{ $i }}.aantal" />
                            @error("rows.$i.aantal") <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                        </td>
                        <td class="px-4 py-3">
                            <input type="number" step="0.01" min="0" class="w-40 rounded-md border-zinc-300 text-sm" wire:model.live="rows.{{ $i }}.prijs_maand_excl" />
                            @error("rows.$i.prijs_maand_excl") <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                        </td>
                        <td class="px-4 py-3">
                            <input type="number" step="0.01" min="0" max="100" class="w-24 rounded-md border-zinc-300 text-sm" wire:model.live="rows.{{ $i }}.btw_percentage" />
                            @error("rows.$i.btw_percentage") <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="text-xs text-zinc-500">
        Tip: Voeg nieuwe modules toe via database seed of een eenvoudige module-admin pagina (kan later).
    </div>
</div>
