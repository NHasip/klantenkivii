<div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
        <div>
            <div class="text-sm font-semibold">Incasso (SEPA mandaten)</div>
            <div class="mt-1 text-xs text-zinc-500">0 of 1 actief mandaat per klant, historie blijft behouden.</div>
        </div>
        <button type="button" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" wire:click="startNew">
            Nieuw mandaat
        </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table class="min-w-full divide-y divide-zinc-100">
            <thead class="bg-zinc-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Mandaat</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">IBAN</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Status</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Ontvangen</th>
                    <th class="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
                @forelse($mandates as $m)
                    <tr class="hover:bg-zinc-50">
                        <td class="px-4 py-3 text-sm">
                            <div class="font-semibold">{{ $m->mandaat_id }}</div>
                            <div class="text-xs text-zinc-500">{{ $m->bedrijfsnaam }}</div>
                        </td>
                        <td class="px-4 py-3 text-sm">{{ $m->iban }}</td>
                        <td class="px-4 py-3 text-sm">
                            <span class="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">{{ $m->status->value }}</span>
                        </td>
                        <td class="px-4 py-3 text-sm text-zinc-600">{{ $m->ontvangen_op?->format('d-m-Y H:i') ?? '-' }}</td>
                        <td class="px-4 py-3 text-right text-sm">
                            <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50" wire:click="edit({{ $m->id }})">Bewerken</button>
                            <div class="mt-2 flex justify-end gap-2">
                                <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50" wire:click="setStatus({{ $m->id }}, 'pending')">Pending</button>
                                <button type="button" class="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50" wire:click="setStatus({{ $m->id }}, 'actief')">Actief</button>
                                <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50" wire:click="setStatus({{ $m->id }}, 'ingetrokken')">Ingetrokken</button>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="px-4 py-10 text-center text-sm text-zinc-600">Nog geen mandaten.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @if($creating)
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold">{{ $mandateId ? 'Mandaat bewerken' : 'Nieuw mandaat' }}</div>
                <button type="button" class="text-sm font-semibold text-zinc-600 hover:text-zinc-900" wire:click="cancel">Sluiten</button>
            </div>

            <form wire:submit.prevent="save" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-zinc-600">Bedrijfsnaam *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="bedrijfsnaam" />
                    @error('bedrijfsnaam') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-zinc-600">Voor- en achternaam *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="voor_en_achternaam" />
                </div>
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-zinc-600">Straat + nummer *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="straatnaam_en_nummer" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Postcode *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="postcode" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Plaats *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="plaats" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Land</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="land" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">IBAN *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="iban" />
                    @error('iban') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">BIC</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="bic" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">E-mail *</label>
                    <input type="email" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="email" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Telefoon *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="telefoonnummer" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Plaats van tekenen *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="plaats_van_tekenen" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Datum van tekenen *</label>
                    <input type="date" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="datum_van_tekenen" />
                </div>

                <div class="sm:col-span-2">
                    <div class="text-xs font-semibold text-zinc-500">Ondertekening (typed naam)</div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Ondertekenaar naam</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="ondertekenaar_naam" />
                </div>
                <div class="flex items-center gap-2 pt-6">
                    <input type="checkbox" class="rounded border-zinc-300" wire:model.live="akkoord_checkbox" id="akkoord_checkbox">
                    <label for="akkoord_checkbox" class="text-sm">Akkoord</label>
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Akkoord op</label>
                    <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="akkoord_op" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Ontvangen op</label>
                    <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="ontvangen_op" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Status</label>
                    <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="status">
                        @foreach($statuses as $s)
                            <option value="{{ $s->value }}">{{ $s->value }}</option>
                        @endforeach
                    </select>
                </div>

                <div class="sm:col-span-2 flex justify-end gap-2">
                    <button type="button" class="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="cancel">Annuleren</button>
                    <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Opslaan</button>
                </div>
            </form>
        </div>
    @endif
</div>
