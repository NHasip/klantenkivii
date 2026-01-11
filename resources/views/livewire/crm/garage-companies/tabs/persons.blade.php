<div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
        <div>
            <div class="text-sm font-semibold">Klantpersonen</div>
            <div class="text-xs text-zinc-500">Meerdere contactpersonen per klant.</div>
        </div>
        <button type="button" class="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="startCreate">
            Nieuwe klantpersoon
        </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-zinc-200">
        <table class="min-w-full divide-y divide-zinc-100 bg-white">
            <thead class="bg-zinc-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Naam</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Rol</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Contact</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Actief</th>
                    <th class="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
                @forelse($persons as $p)
                    <tr class="hover:bg-zinc-50">
                        <td class="px-4 py-3 text-sm">
                            <div class="font-semibold">{{ $p->voornaam }} {{ $p->achternaam }}</div>
                            @if($p->is_primary)
                                <div class="mt-0.5 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">Primair</div>
                            @endif
                        </td>
                        <td class="px-4 py-3 text-sm text-zinc-600">{{ $p->rol ?? '-' }}</td>
                        <td class="px-4 py-3 text-sm">
                            <div>{{ $p->email }}</div>
                            <div class="text-xs text-zinc-500">{{ $p->telefoon ?? '-' }}</div>
                        </td>
                        <td class="px-4 py-3 text-sm">{{ $p->active ? 'Ja' : 'Nee' }}</td>
                        <td class="px-4 py-3 text-right text-sm">
                            <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50" wire:click="startEdit({{ $p->id }})">Bewerken</button>
                            <button type="button" class="ml-2 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50" wire:click="delete({{ $p->id }})" onclick="return confirm('Verwijderen?')">Verwijderen</button>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="px-4 py-10 text-center text-sm text-zinc-600">Nog geen klantpersonen.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="rounded-xl border border-zinc-200 bg-white p-5">
        <div class="text-sm font-semibold">{{ $personId ? 'Klantpersoon bewerken' : 'Klantpersoon toevoegen' }}</div>

        <form wire:submit.prevent="save" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
                <label class="block text-xs font-medium text-zinc-600">Voornaam *</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="voornaam" />
                @error('voornaam') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Achternaam *</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="achternaam" />
                @error('achternaam') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>

            <div>
                <label class="block text-xs font-medium text-zinc-600">E-mail *</label>
                <input type="email" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="email" />
                @error('email') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Telefoon</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="telefoon" />
            </div>

            <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-zinc-600">Rol</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="rol" placeholder="bijv. eigenaar, administratie, monteur" />
            </div>

            <div class="flex items-center gap-2">
                <input type="checkbox" class="rounded border-zinc-300" wire:model.live="is_primary" id="is_primary">
                <label for="is_primary" class="text-sm">Primair</label>
            </div>
            <div class="flex items-center gap-2">
                <input type="checkbox" class="rounded border-zinc-300" wire:model.live="active" id="active">
                <label for="active" class="text-sm">Actief</label>
            </div>

            <div class="sm:col-span-2 flex justify-end">
                <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Opslaan</button>
            </div>
        </form>
    </div>
</div>
