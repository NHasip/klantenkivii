<div class="max-w-3xl space-y-6">
    <div class="flex items-end justify-between gap-3">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight">Nieuwe klant</h1>
            <div class="mt-1 text-sm text-zinc-600">Leg een nieuwe klant vast, inclusief basis incasso gegevens.</div>
        </div>
        <a href="{{ route('crm.garage_companies.index') }}" class="text-sm font-semibold text-indigo-700 hover:text-indigo-900">Terug naar lijst</a>
    </div>

    <form wire:submit.prevent="save" class="space-y-4">
        <div class="rounded-xl border border-zinc-200 bg-white p-6">
            <div class="text-sm font-semibold">Klantgegevens</div>
            <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2 text-xs font-semibold text-zinc-500">Bedrijf</div>
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-zinc-600">Bedrijfsnaam *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="bedrijfsnaam" />
                    @error('bedrijfsnaam') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>

                <div>
                    <label class="block text-xs font-medium text-zinc-600">Land *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="land" />
                    @error('land') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>

                <div class="sm:col-span-2 border-t border-zinc-200 pt-4 text-xs font-semibold text-zinc-500">Contactpersoon</div>
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-zinc-600">Voor- en achternaam *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="voor_en_achternaam" placeholder="bijv. Jan Jansen" />
                    @error('voor_en_achternaam') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">E-mail *</label>
                    <input type="email" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="email" />
                    @error('email') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Telefoonnummer *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="telefoonnummer" />
                    @error('telefoonnummer') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>

                <div class="sm:col-span-2 border-t border-zinc-200 pt-4 text-xs font-semibold text-zinc-500">Adres</div>
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-zinc-600">Straatnaam en nummer *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="straatnaam_en_nummer" />
                    @error('straatnaam_en_nummer') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div class="sm:col-span-2 text-xs font-semibold text-zinc-500">Postcode &amp; plaats</div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Postcode *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="postcode" />
                    @error('postcode') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Plaats *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="plaats" />
                    @error('plaats') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-6">
            <div class="text-sm font-semibold">Incasso (SEPA)</div>
            <div class="mt-1 text-xs text-zinc-500">We leggen een mandaat aan met status pending. Je kunt dit later aanpassen in de tab Incasso.</div>
            <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2 text-xs font-semibold text-zinc-500">IBAN &amp; BIC</div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">IBAN *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="iban" />
                    @error('iban') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">BIC</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="bic" />
                    @error('bic') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div class="sm:col-span-2 pt-2 text-xs font-semibold text-zinc-500">Plaats &amp; datum van tekenen</div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Plaats van tekenen *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="plaats_van_tekenen" />
                    @error('plaats_van_tekenen') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Datum van tekenen *</label>
                    <input type="date" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="datum_van_tekenen" />
                    @error('datum_van_tekenen') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-6">
            <div class="text-sm font-semibold">Modules</div>
            <div class="mt-1 text-xs text-zinc-500">Geef aan welke modules actief zijn. Bij een actieve module is prijs &gt; 0 verplicht.</div>
            <div class="mt-3 text-sm text-zinc-700">
                <span class="font-semibold">Totaal:</span>
                &euro; {{ number_format($totaalExcl, 2, ',', '.') }} excl. btw
                &middot;
                BTW &euro; {{ number_format($btw, 2, ',', '.') }}
                &middot;
                &euro; {{ number_format($totaalIncl, 2, ',', '.') }} incl. btw
            </div>

            <div class="mt-4 overflow-hidden rounded-lg border border-zinc-200">
                <table class="min-w-full divide-y divide-zinc-100 bg-white">
                    <thead class="bg-zinc-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Actief</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Module</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Prijs (excl. btw)</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">BTW %</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                        @foreach($moduleRows as $i => $row)
                            <tr class="hover:bg-zinc-50">
                                <td class="px-4 py-3">
                                    <input type="checkbox" class="rounded border-zinc-300" wire:model.live="moduleRows.{{ $i }}.actief" />
                                </td>
                                <td class="px-4 py-3 text-sm font-semibold">{{ $row['naam'] }}</td>
                                <td class="px-4 py-3">
                                    <input type="number" step="0.01" min="0" class="w-40 rounded-md border-zinc-300 text-sm" wire:model.live="moduleRows.{{ $i }}.prijs_maand_excl" />
                                    @error("moduleRows.$i.prijs_maand_excl") <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                                </td>
                                <td class="px-4 py-3">
                                    <input type="number" step="0.01" min="0" max="100" class="w-24 rounded-md border-zinc-300 text-sm" wire:model.live="moduleRows.{{ $i }}.btw_percentage" />
                                    @error("moduleRows.$i.btw_percentage") <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-6">
            <div class="text-sm font-semibold">CRM</div>
            <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Status</label>
                    <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="status">
                        @foreach($statuses as $s)
                            <option value="{{ $s->value }}">{{ $s->value }}</option>
                        @endforeach
                    </select>
                    @error('status') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Bron</label>
                    <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="bron">
                        @foreach($sources as $s)
                            <option value="{{ $s->value }}">{{ $s->value }}</option>
                        @endforeach
                    </select>
                    @error('bron') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-zinc-600">Tags</label>
                    <textarea class="mt-1 w-full rounded-md border-zinc-300 text-sm" rows="2" wire:model.live="tags" placeholder="bijv. BMW, noord, referral"></textarea>
                    @error('tags') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
            </div>
        </div>

        <div class="flex items-center justify-end gap-2">
            <a href="{{ route('crm.garage_companies.index') }}" class="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">Annuleren</a>
            <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Opslaan
            </button>
        </div>
    </form>
</div>
