<div class="space-y-6">
    <div class="flex items-end justify-between gap-3">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight">Gebruikers</h1>
            <div class="mt-1 text-sm text-zinc-600">Alleen admin kan gebruikers beheren.</div>
        </div>
        <button type="button" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" wire:click="startCreate">
            Nieuwe gebruiker
        </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table class="min-w-full divide-y divide-zinc-100">
            <thead class="bg-zinc-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Naam</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">E-mail</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Rol</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Actief</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Laatste login</th>
                    <th class="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
                @foreach($users as $u)
                    <tr class="hover:bg-zinc-50">
                        <td class="px-4 py-3 text-sm font-semibold">{{ $u->name }}</td>
                        <td class="px-4 py-3 text-sm">{{ $u->email }}</td>
                        <td class="px-4 py-3 text-sm">{{ $u->role->value }}</td>
                        <td class="px-4 py-3 text-sm">{{ $u->active ? 'Ja' : 'Nee' }}</td>
                        <td class="px-4 py-3 text-sm text-zinc-600">{{ $u->last_login_at?->format('d-m-Y H:i') ?? '—' }}</td>
                        <td class="px-4 py-3 text-right">
                            <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50" wire:click="startEdit({{ $u->id }})">Bewerken</button>
                            <button type="button" class="ml-2 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50" wire:click="delete({{ $u->id }})" onclick="return confirm('Verwijderen?')">Verwijderen</button>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    @if($showForm)
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold">{{ $userId ? 'Gebruiker bewerken' : 'Gebruiker toevoegen' }}</div>
                <button type="button" class="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="cancel">
                    Annuleren
                </button>
            </div>

            <form wire:submit="save" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Naam *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="name" />
                    @error('name') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">E-mail *</label>
                    <input type="email" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="email" />
                    @error('email') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>

                <div>
                    <label class="block text-xs font-medium text-zinc-600">Telefoon</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="phone" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Rol</label>
                    <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="role">
                        @foreach($roles as $r)
                            <option value="{{ $r->value }}">{{ $r->value }}</option>
                        @endforeach
                    </select>
                    @error('role') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>

                <div class="flex items-center gap-2 pt-6">
                    <input type="checkbox" class="rounded border-zinc-300" wire:model.live="active" id="user_active">
                    <label for="user_active" class="text-sm">Actief</label>
                </div>

                <div>
                    <label class="block text-xs font-medium text-zinc-600">{{ $userId ? 'Nieuw wachtwoord (optioneel)' : 'Wachtwoord *' }}</label>
                    <input type="password" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="password" />
                    @error('password') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>

                <div class="sm:col-span-2 flex justify-end">
                    <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Opslaan</button>
                </div>
            </form>
        </div>
    @endif
</div>
