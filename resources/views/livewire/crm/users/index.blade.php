@php
    $input = 'mt-1 block w-full rounded-lg border-zinc-300 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500';
    $label = 'block text-sm font-medium text-zinc-800';
    $error = 'mt-1 text-xs font-medium text-rose-700';
    $btnPrimary = 'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    $btnSecondary = 'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-white px-3.5 text-sm font-semibold text-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50';
    $btnSmall = 'inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
    $isSelfEdit = $userId !== null && $userId === $currentUserId;
    $roleLabels = ['admin' => 'Admin', 'medewerker' => 'Medewerker'];
@endphp

<div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
            <h1 class="text-2xl font-semibold tracking-tight text-zinc-900">Gebruikers</h1>
            <p class="mt-1 text-sm text-zinc-500">Beheer wie toegang heeft tot het CRM. Klantlogins staan hier niet tussen.</p>
        </div>
        @unless($showForm && ! $userId)
            <button type="button" class="{{ $btnPrimary }}" wire:click="startCreate" wire:loading.attr="disabled" wire:target="startCreate">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                Nieuwe gebruiker
            </button>
        @endunless
    </div>

    @if(session('livewire_status'))
        <div role="status" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">{{ session('livewire_status') }}</div>
    @endif

    @if($showForm)
        <section class="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm" wire:key="user-form-{{ $userId ?? 'new' }}" aria-labelledby="user-form-title"
                 x-data x-init="$nextTick(() => { $el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); $el.querySelector('#user_name')?.focus() })">
            <form wire:submit="save">
                <div class="p-4 sm:p-5">
                    <div>
                        <h2 id="user-form-title" class="text-base font-semibold text-zinc-900">{{ $userId ? 'Gebruiker bewerken' : 'Nieuwe gebruiker' }}</h2>
                        <p class="mt-0.5 text-sm text-zinc-500">Velden met <span class="text-rose-600" aria-hidden="true">*</span><span class="sr-only">een sterretje</span> zijn verplicht.</p>
                    </div>

                    <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label for="user_name" class="{{ $label }}">Naam <span class="text-rose-600" aria-hidden="true">*</span></label>
                            <input id="user_name" class="{{ $input }}" wire:model="name" required autocomplete="off" @error('name') aria-invalid="true" aria-describedby="user_name_error" @enderror />
                            @error('name') <p id="user_name_error" class="{{ $error }}">{{ $message }}</p> @enderror
                        </div>
                        <div>
                            <label for="user_email" class="{{ $label }}">E-mailadres <span class="text-rose-600" aria-hidden="true">*</span></label>
                            <input id="user_email" type="email" class="{{ $input }}" wire:model="email" required autocomplete="off" @error('email') aria-invalid="true" aria-describedby="user_email_error" @enderror />
                            @error('email') <p id="user_email_error" class="{{ $error }}">{{ $message }}</p> @enderror
                        </div>

                        <div>
                            <label for="user_phone" class="{{ $label }}">Telefoon</label>
                            <input id="user_phone" type="tel" class="{{ $input }}" wire:model="phone" autocomplete="off" />
                            @error('phone') <p class="{{ $error }}">{{ $message }}</p> @enderror
                        </div>
                        <div>
                            <label for="user_role" class="{{ $label }}">Rol</label>
                            <select id="user_role" class="{{ $input }}" wire:model="role" @disabled($isSelfEdit) @if($isSelfEdit) aria-describedby="user_role_hint" @endif>
                                @foreach($roles as $r)
                                    <option value="{{ $r->value }}">{{ $roleLabels[$r->value] ?? ucfirst($r->value) }}</option>
                                @endforeach
                            </select>
                            @if($isSelfEdit)
                                <p id="user_role_hint" class="mt-1 text-xs text-zinc-500">Je kunt je eigen rol niet wijzigen.</p>
                            @else
                                <p class="mt-1 text-xs text-zinc-500">Admins beheren gebruikers, modules en systeeminstellingen.</p>
                            @endif
                            @error('role') <p class="{{ $error }}">{{ $message }}</p> @enderror
                        </div>

                        <div>
                            <label for="user_password" class="{{ $label }}">
                                {{ $userId ? 'Nieuw wachtwoord' : 'Wachtwoord' }}
                                @unless($userId)<span class="text-rose-600" aria-hidden="true">*</span>@endunless
                            </label>
                            <input id="user_password" type="password" autocomplete="new-password" class="{{ $input }}" wire:model="password" aria-describedby="user_password_hint" @unless($userId) required @endunless />
                            <p id="user_password_hint" class="mt-1 text-xs text-zinc-500">{{ $userId ? 'Laat leeg om het huidige wachtwoord te behouden. ' : '' }}Minimaal 10 tekens.</p>
                            @error('password') <p class="{{ $error }}">{{ $message }}</p> @enderror
                        </div>

                        <div class="sm:pt-6">
                            <label for="user_active" class="flex w-fit items-center gap-2 text-sm text-zinc-800 {{ $isSelfEdit ? 'cursor-not-allowed' : 'cursor-pointer' }}">
                                <input type="checkbox" class="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600 disabled:opacity-50" wire:model="active" id="user_active" @disabled($isSelfEdit)>
                                Account actief
                            </label>
                            <p class="mt-1 text-xs text-zinc-500">{{ $isSelfEdit ? 'Je kunt je eigen account niet deactiveren.' : 'Inactieve gebruikers kunnen niet inloggen.' }}</p>
                            @error('active') <p class="{{ $error }}">{{ $message }}</p> @enderror
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/70 px-4 py-3 sm:px-5">
                    <button type="button" class="{{ $btnSecondary }}" wire:click="cancel">Annuleren</button>
                    <button type="submit" class="{{ $btnPrimary }}" wire:loading.attr="disabled" wire:target="save">
                        <svg wire:loading wire:target="save" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                        {{ $userId ? 'Wijzigingen opslaan' : 'Gebruiker toevoegen' }}
                    </button>
                </div>
            </form>
        </section>
    @endif

    @if($users->isEmpty())
        <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-10 text-center">
            <p class="text-sm font-semibold text-zinc-800">Nog geen gebruikers</p>
            <p class="mt-1 max-w-sm text-sm text-zinc-500">Voeg een collega toe om samen in het CRM te werken.</p>
        </div>
    @else
        <div class="min-w-0 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table class="min-w-full divide-y divide-zinc-200 text-sm">
                <caption class="sr-only">Gebruikers van het CRM</caption>
                <thead class="bg-zinc-50">
                    <tr>
                        <th scope="col" class="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Naam</th>
                        <th scope="col" class="hidden px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 md:table-cell">E-mailadres</th>
                        <th scope="col" class="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Rol</th>
                        <th scope="col" class="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
                        <th scope="col" class="hidden px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 lg:table-cell">Laatste login</th>
                        <th scope="col" class="px-4 py-2.5"><span class="sr-only">Acties</span></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100">
                    @foreach($users as $u)
                        @php
                            $isSelf = $u->id === $currentUserId;
                            $isLastAdmin = $u->isAdmin() && $u->active && $activeAdminCount <= 1;
                        @endphp
                        <tr wire:key="user-row-{{ $u->id }}" @class(['hover:bg-zinc-50/80', 'bg-indigo-50/40' => $userId === $u->id])>
                            <td class="px-4 py-3 align-middle">
                                <div class="font-semibold text-zinc-900">
                                    {{ $u->name }}
                                    @if($isSelf)<span class="ml-1 text-xs font-normal text-zinc-500">(jij)</span>@endif
                                </div>
                                <div class="truncate text-xs text-zinc-500 md:hidden">{{ $u->email }}</div>
                            </td>
                            <td class="hidden px-4 py-3 align-middle text-zinc-700 md:table-cell">{{ $u->email }}</td>
                            <td class="px-4 py-3 align-middle">
                                <span @class(['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', 'bg-indigo-50 text-indigo-800 ring-indigo-200' => $u->isAdmin(), 'bg-zinc-100 text-zinc-700 ring-zinc-200' => ! $u->isAdmin()])>{{ $roleLabels[$u->role->value] ?? ucfirst($u->role->value) }}</span>
                            </td>
                            <td class="px-4 py-3 align-middle">
                                @if($u->active)
                                    <span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>Actief</span>
                                @else
                                    <span class="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500"><span class="h-1.5 w-1.5 rounded-full bg-zinc-400" aria-hidden="true"></span>Inactief</span>
                                @endif
                            </td>
                            <td class="hidden whitespace-nowrap px-4 py-3 align-middle tabular-nums text-zinc-600 lg:table-cell">{{ $u->last_login_at?->format('d-m-Y H:i') ?? 'Nog nooit' }}</td>
                            <td class="whitespace-nowrap px-4 py-3 text-right align-middle">
                                <div class="inline-flex items-center gap-1">
                                    <button type="button" class="{{ $btnSmall }} text-zinc-700 hover:bg-zinc-100" wire:click="startEdit({{ $u->id }})" aria-label="{{ $u->name }} bewerken">Bewerken</button>
                                    @if($isSelf || $isLastAdmin)
                                        <span class="px-2.5 text-xs text-zinc-400" title="{{ $isSelf ? 'Je kunt je eigen account niet verwijderen.' : 'De laatste actieve admin kan niet worden verwijderd.' }}">
                                            {{ $isSelf ? 'Eigen account' : 'Laatste admin' }}
                                        </span>
                                    @else
                                        <form method="POST" action="{{ route('crm.users.delete', ['user' => $u->id]) }}" class="inline" onsubmit="return confirm(@js('Weet je zeker dat je '.$u->name.' wilt verwijderen? Dit kan niet ongedaan worden gemaakt.'))">
                                            @csrf
                                            @method('DELETE')
                                            <button type="submit" class="{{ $btnSmall }} text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-600" aria-label="{{ $u->name }} verwijderen">Verwijderen</button>
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
