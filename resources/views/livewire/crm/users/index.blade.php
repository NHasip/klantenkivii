@php
    $isSelfEdit = $userId !== null && $userId === $currentUserId;
    $roleLabels = ['admin' => 'Admin', 'medewerker' => 'Medewerker'];
    $activeUsers = $users->where('active', true)->count();
    $req = '<span class="text-rose-600" aria-hidden="true">*</span>';
@endphp

<div class="space-y-6">
    <x-page-header title="Gebruikers" icon="users" description="Beheer wie toegang heeft tot het CRM. Klantlogins staan hier niet tussen.">
        @if($users->isNotEmpty())
            <div class="mt-3 flex flex-wrap items-center gap-2">
                <x-badge tone="success" dot>{{ $activeUsers }} actief</x-badge>
                @if($users->count() > $activeUsers)
                    <x-badge>{{ $users->count() - $activeUsers }} inactief</x-badge>
                @endif
                <x-badge tone="brand">{{ $activeAdminCount }} {{ $activeAdminCount === 1 ? 'actieve admin' : 'actieve admins' }}</x-badge>
            </div>
        @endif
        <x-slot name="actions">
            @unless($showForm && ! $userId)
                <button type="button" class="btn btn-primary" wire:click="startCreate" wire:loading.attr="disabled" wire:target="startCreate">
                    <x-icon name="plus" class="h-4 w-4" />
                    Nieuwe gebruiker
                </button>
            @endunless
        </x-slot>
    </x-page-header>

    @if(session('livewire_status'))
        <div role="status" class="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <x-icon name="check-circle" class="mt-0.5 h-4 w-4 text-emerald-600" />
            <span>{{ session('livewire_status') }}</span>
        </div>
    @endif

    @if($showForm)
        <section class="card" wire:key="user-form-{{ $userId ?? 'new' }}" aria-labelledby="user-form-title"
                 x-data x-init="$nextTick(() => { $el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); $el.querySelector('#user_name')?.focus() })">
            <form wire:submit="save">
                <div class="card-header">
                    <div class="flex items-center gap-3">
                        @if($userId)
                            <x-avatar :name="$name" size="md" />
                        @else
                            <span class="icon-tile h-10 w-10 bg-indigo-100/80 text-indigo-700" aria-hidden="true"><x-icon name="user" class="h-5 w-5" /></span>
                        @endif
                        <div>
                            <h2 id="user-form-title" class="section-heading">{{ $userId ? 'Gebruiker bewerken' : 'Nieuwe gebruiker' }}</h2>
                            <p class="section-description">Velden met {!! $req !!}<span class="sr-only">een sterretje</span> zijn verplicht.</p>
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    <div class="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                        <div>
                            <label for="user_name" class="label">Naam {!! $req !!}</label>
                            <input id="user_name" class="input mt-1.5" wire:model="name" required autocomplete="off" @error('name') aria-invalid="true" aria-describedby="user_name_error" @enderror />
                            @error('name') <p id="user_name_error" class="field-error">{{ $message }}</p> @enderror
                        </div>
                        <div>
                            <label for="user_email" class="label">E-mailadres {!! $req !!}</label>
                            <input id="user_email" type="email" class="input mt-1.5" wire:model="email" required autocomplete="off" @error('email') aria-invalid="true" aria-describedby="user_email_error" @enderror />
                            @error('email') <p id="user_email_error" class="field-error">{{ $message }}</p> @enderror
                        </div>

                        <div>
                            <label for="user_phone" class="label">Telefoon</label>
                            <input id="user_phone" type="tel" class="input mt-1.5" wire:model="phone" autocomplete="off" @error('phone') aria-invalid="true" @enderror />
                            @error('phone') <p class="field-error">{{ $message }}</p> @enderror
                        </div>
                        <div>
                            <label for="user_role" class="label">Rol</label>
                            <select id="user_role" class="input mt-1.5" wire:model="role" @disabled($isSelfEdit) @if($isSelfEdit) aria-describedby="user_role_hint" @endif>
                                @foreach($roles as $r)
                                    <option value="{{ $r->value }}">{{ $roleLabels[$r->value] ?? ucfirst($r->value) }}</option>
                                @endforeach
                            </select>
                            @if($isSelfEdit)
                                <p id="user_role_hint" class="field-hint">Je kunt je eigen rol niet wijzigen.</p>
                            @else
                                <p class="field-hint">Admins beheren gebruikers, modules en systeeminstellingen.</p>
                            @endif
                            @error('role') <p class="field-error">{{ $message }}</p> @enderror
                        </div>

                        <div>
                            <label for="user_password" class="label">
                                {{ $userId ? 'Nieuw wachtwoord' : 'Wachtwoord' }}
                                @unless($userId){!! $req !!}@endunless
                            </label>
                            <input id="user_password" type="password" autocomplete="new-password" class="input mt-1.5" wire:model="password" aria-describedby="user_password_hint" @unless($userId) required @endunless @error('password') aria-invalid="true" @enderror />
                            <p id="user_password_hint" class="field-hint">{{ $userId ? 'Laat leeg om het huidige wachtwoord te behouden. ' : '' }}Minimaal 10 tekens.</p>
                            @error('password') <p class="field-error">{{ $message }}</p> @enderror
                        </div>

                        <div class="sm:pt-7">
                            <label for="user_active" class="flex w-fit items-center gap-2.5 text-sm font-medium text-zinc-800 {{ $isSelfEdit ? 'cursor-not-allowed' : 'cursor-pointer' }}">
                                <input type="checkbox" class="checkbox" wire:model="active" id="user_active" @disabled($isSelfEdit)>
                                Account actief
                            </label>
                            <p class="field-hint">{{ $isSelfEdit ? 'Je kunt je eigen account niet deactiveren.' : 'Inactieve gebruikers kunnen niet inloggen.' }}</p>
                            @error('active') <p class="field-error">{{ $message }}</p> @enderror
                        </div>
                    </div>
                </div>

                <div class="card-footer">
                    <button type="button" class="btn btn-secondary" wire:click="cancel">Annuleren</button>
                    <button type="submit" class="btn btn-primary" wire:loading.attr="disabled" wire:target="save">
                        <svg wire:loading wire:target="save" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                        {{ $userId ? 'Wijzigingen opslaan' : 'Gebruiker toevoegen' }}
                    </button>
                </div>
            </form>
        </section>
    @endif

    @if($users->isEmpty())
        <div class="card flex flex-col items-center justify-center px-6 py-12 text-center">
            <span class="icon-tile mb-3 h-10 w-10 bg-zinc-100 text-zinc-600" aria-hidden="true"><x-icon name="users" class="h-5 w-5" /></span>
            <p class="section-heading">Nog geen gebruikers</p>
            <p class="mt-1 max-w-sm text-sm text-zinc-500">Voeg een collega toe om samen in het CRM te werken.</p>
            @unless($showForm)
                <button type="button" class="btn btn-primary mt-4" wire:click="startCreate">
                    <x-icon name="plus" class="h-4 w-4" />
                    Eerste gebruiker toevoegen
                </button>
            @endunless
        </div>
    @else
        {{-- Kaarten op mobiel --}}
        <ul class="space-y-3 md:hidden" aria-label="Gebruikers van het CRM">
            @foreach($users as $u)
                @php
                    $isSelf = $u->id === $currentUserId;
                    $isLastAdmin = $u->isAdmin() && $u->active && $activeAdminCount <= 1;
                @endphp
                <li wire:key="user-card-{{ $u->id }}" @class(['card p-4', 'ring-2 ring-indigo-200' => $userId === $u->id])>
                    <div class="flex min-w-0 items-center gap-3">
                        <x-avatar :name="$u->name" size="sm" @class(['opacity-60' => ! $u->active]) />
                        <div class="min-w-0 flex-1">
                            <div @class(['flex items-center gap-1.5 font-semibold', 'text-zinc-900' => $u->active, 'text-zinc-500' => ! $u->active])>
                                <span class="truncate">{{ $u->name }}</span>
                                @if($isSelf)<span class="text-xs font-normal text-zinc-500">(jij)</span>@endif
                            </div>
                            <div class="break-all text-xs text-zinc-500">{{ $u->email }}</div>
                        </div>
                    </div>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                        @if($u->isAdmin())
                            <x-badge tone="brand"><x-icon name="shield" class="h-3 w-3" />{{ $roleLabels[$u->role->value] ?? ucfirst($u->role->value) }}</x-badge>
                        @else
                            <x-badge>{{ $roleLabels[$u->role->value] ?? ucfirst($u->role->value) }}</x-badge>
                        @endif
                        @if($u->active)
                            <x-badge tone="success" dot>Actief</x-badge>
                        @else
                            <x-badge dot>Inactief</x-badge>
                        @endif
                    </div>
                    <p class="mt-2 text-xs text-zinc-500">
                        Laatste login:
                        @if($u->last_login_at)
                            <time datetime="{{ $u->last_login_at->toIso8601String() }}" title="{{ $u->last_login_at->format('d-m-Y H:i') }}" class="text-zinc-700">{{ $u->last_login_at->locale('nl')->diffForHumans() }}</time>
                        @else
                            <span class="text-zinc-400">Nog nooit</span>
                        @endif
                    </p>
                    <div class="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3">
                        <button type="button" class="btn btn-secondary min-h-[44px] flex-1" wire:click="startEdit({{ $u->id }})" aria-label="{{ $u->name }} bewerken">
                            <x-icon name="edit" class="h-4 w-4" />
                            Bewerken
                        </button>
                        @if($isSelf || $isLastAdmin)
                            <span class="inline-flex h-11 w-11 items-center justify-center text-zinc-300" title="{{ $isSelf ? 'Je kunt je eigen account niet verwijderen.' : 'De laatste actieve admin kan niet worden verwijderd.' }}">
                                <x-icon name="trash" class="h-4 w-4" title="{{ $isSelf ? 'Eigen account kan niet worden verwijderd' : 'Laatste admin kan niet worden verwijderd' }}" />
                            </span>
                        @else
                            <form method="POST" action="{{ route('crm.users.delete', ['user' => $u->id]) }}" class="inline" onsubmit="return confirm(@js('Weet je zeker dat je '.$u->name.' wilt verwijderen? Dit kan niet ongedaan worden gemaakt.'))">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn-danger-ghost btn-icon h-11 w-11" aria-label="{{ $u->name }} verwijderen" title="Verwijderen">
                                    <x-icon name="trash" class="h-4 w-4" />
                                </button>
                            </form>
                        @endif
                    </div>
                </li>
            @endforeach
        </ul>

        <div class="table-wrap hidden md:block">
            <table class="table-base">
                <caption class="sr-only">Gebruikers van het CRM</caption>
                <thead class="table-head">
                    <tr>
                        <th scope="col" class="table-th">Gebruiker</th>
                        <th scope="col" class="table-th">Rol</th>
                        <th scope="col" class="table-th">Status</th>
                        <th scope="col" class="table-th hidden lg:table-cell">Laatste login</th>
                        <th scope="col" class="table-th"><span class="sr-only">Acties</span></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100">
                    @foreach($users as $u)
                        @php
                            $isSelf = $u->id === $currentUserId;
                            $isLastAdmin = $u->isAdmin() && $u->active && $activeAdminCount <= 1;
                        @endphp
                        <tr wire:key="user-row-{{ $u->id }}" @class(['table-row', 'bg-indigo-50/50' => $userId === $u->id])>
                            <td class="table-td">
                                <div class="flex min-w-0 items-center gap-3">
                                    <x-avatar :name="$u->name" size="sm" @class(['opacity-60' => ! $u->active]) />
                                    <div class="min-w-0">
                                        <div @class(['flex items-center gap-1.5 font-semibold', 'text-zinc-900' => $u->active, 'text-zinc-500' => ! $u->active])>
                                            <span class="truncate">{{ $u->name }}</span>
                                            @if($isSelf)<span class="text-xs font-normal text-zinc-500">(jij)</span>@endif
                                        </div>
                                        <div class="truncate text-xs text-zinc-500">{{ $u->email }}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="table-td">
                                @if($u->isAdmin())
                                    <x-badge tone="brand"><x-icon name="shield" class="h-3 w-3" />{{ $roleLabels[$u->role->value] ?? ucfirst($u->role->value) }}</x-badge>
                                @else
                                    <x-badge>{{ $roleLabels[$u->role->value] ?? ucfirst($u->role->value) }}</x-badge>
                                @endif
                            </td>
                            <td class="table-td">
                                @if($u->active)
                                    <x-badge tone="success" dot>Actief</x-badge>
                                @else
                                    <x-badge dot>Inactief</x-badge>
                                @endif
                            </td>
                            <td class="table-td hidden whitespace-nowrap lg:table-cell">
                                @if($u->last_login_at)
                                    <time datetime="{{ $u->last_login_at->toIso8601String() }}" title="{{ $u->last_login_at->format('d-m-Y H:i') }}" class="text-zinc-600">{{ $u->last_login_at->locale('nl')->diffForHumans() }}</time>
                                @else
                                    <span class="text-zinc-400">Nog nooit</span>
                                @endif
                            </td>
                            <td class="table-td whitespace-nowrap text-right">
                                <div class="inline-flex items-center gap-1">
                                    <button type="button" class="btn btn-ghost btn-sm" wire:click="startEdit({{ $u->id }})" aria-label="{{ $u->name }} bewerken">
                                        <x-icon name="edit" class="h-4 w-4" />
                                        <span class="hidden sm:inline">Bewerken</span>
                                    </button>
                                    @if($isSelf || $isLastAdmin)
                                        <span class="inline-flex h-8 w-8 items-center justify-center text-zinc-300" title="{{ $isSelf ? 'Je kunt je eigen account niet verwijderen.' : 'De laatste actieve admin kan niet worden verwijderd.' }}">
                                            <x-icon name="trash" class="h-4 w-4" title="{{ $isSelf ? 'Eigen account kan niet worden verwijderd' : 'Laatste admin kan niet worden verwijderd' }}" />
                                        </span>
                                    @else
                                        <form method="POST" action="{{ route('crm.users.delete', ['user' => $u->id]) }}" class="inline" onsubmit="return confirm(@js('Weet je zeker dat je '.$u->name.' wilt verwijderen? Dit kan niet ongedaan worden gemaakt.'))">
                                            @csrf
                                            @method('DELETE')
                                            <button type="submit" class="btn btn-danger-ghost btn-icon btn-sm" aria-label="{{ $u->name }} verwijderen" title="Verwijderen">
                                                <x-icon name="trash" class="h-4 w-4" />
                                            </button>
                                        </form>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif
</div>
