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

    @if(session('livewire_status'))
        <div role="status" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ session('livewire_status') }}</div>
    @endif

    @if($showForm)
        <div class="rounded-xl border border-zinc-200 bg-white p-5" wire:key="user-form-{{ $userId ?? 'new' }}">
            <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold">{{ $userId ? 'Gebruiker bewerken' : 'Gebruiker toevoegen' }}</div>
                <button type="button" class="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="cancel">
                    Annuleren
                </button>
            </div>

            <form wire:submit="save" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label for="user_name" class="block text-xs font-medium text-zinc-600">Naam *</label>
                    <input id="user_name" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="name" />
                    @error('name') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div>
                    <label for="user_email" class="block text-xs font-medium text-zinc-600">E-mail *</label>
                    <input id="user_email" type="email" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="email" />
                    @error('email') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>

                <div>
                    <label for="user_phone" class="block text-xs font-medium text-zinc-600">Telefoon</label>
                    <input id="user_phone" type="tel" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="phone" />
                    @error('phone') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div>
                    <label for="user_role" class="block text-xs font-medium text-zinc-600">Rol</label>
                    <select id="user_role" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="role">
                        @foreach($roles as $r)
                            <option value="{{ $r->value }}">{{ ucfirst($r->value) }}</option>
                        @endforeach
                    </select>
                    @error('role') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>

                <div class="pt-6">
                    <div class="flex items-center gap-2">
                        <input type="checkbox" class="rounded border-zinc-300 disabled:opacity-50" wire:model="active" id="user_active" @disabled($userId !== null && $userId === $currentUserId)>
                        <label for="user_active" class="text-sm">Actief</label>
                    </div>
                    @if($userId !== null && $userId === $currentUserId)
                        <div class="mt-1 text-xs text-zinc-500">Je kunt je eigen account niet deactiveren.</div>
                    @endif
                    @error('active') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>

                <div>
                    <label for="user_password" class="block text-xs font-medium text-zinc-600">{{ $userId ? 'Nieuw wachtwoord (optioneel)' : 'Wachtwoord *' }}</label>
                    <input id="user_password" type="password" autocomplete="new-password" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model="password" />
                    @error('password') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
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
                        <td class="px-4 py-3 text-sm">{{ ucfirst($u->role->value) }}</td>
                        <td class="px-4 py-3 text-sm">{{ $u->active ? 'Ja' : 'Nee' }}</td>
                        <td class="px-4 py-3 text-sm text-zinc-600">{{ $u->last_login_at?->format('d-m-Y H:i') ?? '-' }}</td>
                        <td class="whitespace-nowrap px-4 py-3 text-right">
                            <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50" wire:click="startEdit({{ $u->id }})">Bewerken</button>
                            @php
                                $isSelf = $u->id === $currentUserId;
                                $isLastAdmin = $u->isAdmin() && $u->active && $activeAdminCount <= 1;
                            @endphp
                            @if($isSelf || $isLastAdmin)
                                <span class="ml-2 inline-block text-xs text-zinc-500" title="{{ $isSelf ? 'Je kunt je eigen account niet verwijderen.' : 'De laatste actieve admin kan niet worden verwijderd.' }}">
                                    {{ $isSelf ? 'Eigen account' : 'Laatste admin' }}
                                </span>
                            @else
                                <form method="POST" action="{{ route('crm.users.delete', ['user' => $u->id]) }}" class="ml-2 inline" onsubmit="return confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Verwijderen</button>
                                </form>
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

</div>
