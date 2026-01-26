<div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
        <div>
            <div class="text-sm font-semibold">Gebruikers</div>
            <div class="mt-1 text-xs text-zinc-500">Totaal actieve gebruikers: <span class="font-semibold">{{ $actieveSeats }}</span></div>
        </div>
        <button type="button" class="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="startCreate">Nieuwe gebruiker</button>
    </div>

    <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table class="min-w-full divide-y divide-zinc-100">
            <thead class="bg-zinc-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Naam</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">E-mail</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Rol</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Actief</th>
                    <th class="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
                @forelse($seats as $s)
                    <tr class="hover:bg-zinc-50">
                        <td class="px-4 py-3 text-sm font-semibold">{{ $s->naam }}</td>
                        <td class="px-4 py-3 text-sm">{{ $s->email }}</td>
                        <td class="px-4 py-3 text-sm text-zinc-600">{{ $s->rol_in_kivii ?? '—' }}</td>
                        <td class="px-4 py-3 text-sm">{{ $s->actief ? 'Ja' : 'Nee' }}</td>
                        <td class="px-4 py-3 text-right">
                            <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50" wire:click="startEdit({{ $s->id }})">Bewerken</button>
                            <button type="button" class="ml-2 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50" wire:click="delete({{ $s->id }})" onclick="return confirm('Verwijderen?')">Verwijderen</button>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="px-4 py-10 text-center text-sm text-zinc-600">Nog geen gebruikers.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @if($showForm)
    <div class="rounded-xl border border-zinc-200 bg-white p-5">
        <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-semibold">{{ $seatId ? 'Gebruiker bewerken' : 'Gebruiker toevoegen' }}</div>
            <button type="button" class="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="cancel">
                Annuleren
            </button>
        </div>

        <form wire:submit="save" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
                <label class="block text-xs font-medium text-zinc-600">Naam *</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="naam" />
                @error('naam') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">E-mail *</label>
                <input type="email" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="email" />
                @error('email') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Rol in Kivii</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="rol_in_kivii" />
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Aangemaakt op</label>
                <input type="date" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="aangemaakt_op" />
            </div>
            <div class="flex items-center gap-2 pt-6">
                <input type="checkbox" class="rounded border-zinc-300" wire:model.live="actief" id="seat_actief">
                <label for="seat_actief" class="text-sm">Actief</label>
            </div>
            <div class="sm:col-span-2 flex justify-end">
                <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Opslaan</button>
            </div>
        </form>
    </div>
    @endif
</div>
