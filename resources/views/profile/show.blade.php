<x-app-layout>
    <x-slot name="title">Profiel</x-slot>

    @php
        $profileUser = auth()->user();
        $profileIsAdmin = (bool) $profileUser?->isAdmin();
        $profileIsLastAdmin = $profileUser ? \App\Livewire\Crm\Users\Index::isLastActiveAdmin($profileUser) : false;
        $profileCanDelete = Laravel\Jetstream\Jetstream::hasAccountDeletionFeatures() && ! $profileIsLastAdmin;
        $profileHas2fa = \App\Http\Middleware\RequireTwoFactorForAdmin::userHasTwoFactor($profileUser);
        $profileCan2fa = Laravel\Fortify\Features::canManageTwoFactorAuthentication();

        $profilePasskeyCount = \Illuminate\Support\Facades\Schema::hasTable('passkeys') && $profileUser ? $profileUser->passkeys()->count() : 0;

        $profileNav = array_values(array_filter([
            Laravel\Fortify\Features::canUpdateProfileInformation() ? ['id' => 'profile-info', 'label' => 'Profiel', 'icon' => 'user'] : null,
            Laravel\Fortify\Features::enabled(Laravel\Fortify\Features::updatePasswords()) ? ['id' => 'password', 'label' => 'Wachtwoord', 'icon' => 'key'] : null,
            $profileCan2fa ? ['id' => 'two-factor', 'label' => 'Tweestapsverificatie', 'icon' => 'shield', 'badge' => $profileHas2fa ? 'Aan' : 'Uit', 'tone' => $profileHas2fa ? 'success' : 'warning'] : null,
            ['id' => 'passkeys', 'label' => 'Passkeys', 'icon' => 'key', 'badge' => $profilePasskeyCount > 0 ? (string) $profilePasskeyCount : null, 'tone' => 'neutral'],
            ['id' => 'sessions', 'label' => 'Sessies', 'icon' => 'globe'],
            $profileCanDelete ? ['id' => 'delete-account', 'label' => 'Account verwijderen', 'icon' => 'trash'] : null,
        ]));
    @endphp

    <x-page-header title="Profiel en beveiliging" icon="user"
        :description="$profileIsAdmin ? 'Beheer je accountgegevens, beveiliging en de systeeminstellingen voor alle gebruikers.' : 'Beheer je accountgegevens en beveiliging.'" />

    {{-- Snelle navigatie op mobiel: horizontaal scrollbare chips. --}}
    <nav class="-mx-4 mb-6 overflow-x-auto px-4 lg:hidden" aria-label="Snelle navigatie profiel">
        <ul class="flex gap-2 whitespace-nowrap">
            @foreach ($profileNav as $item)
                <li>
                    <a href="#{{ $item['id'] }}" class="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
                        <x-icon :name="$item['icon']" class="h-4 w-4 text-zinc-400" />
                        {{ $item['label'] }}
                        @if (! empty($item['badge']))<x-badge :tone="$item['tone']">{{ $item['badge'] }}</x-badge>@endif
                    </a>
                </li>
            @endforeach
            @if ($profileIsAdmin)
                <li>
                    <a href="#admin-mail" class="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"><x-icon name="mail" class="h-4 w-4 text-zinc-400" />E-mailinstellingen</a>
                </li>
            @endif
        </ul>
    </nav>

    <div class="grid gap-6 lg:grid-cols-[248px,minmax(0,1fr)] lg:gap-8">
        <aside class="hidden lg:block">
            <div class="sticky top-20 space-y-6">
                @if ($profileUser)
                    <div class="card flex items-center gap-3 p-4">
                        <x-avatar :name="$profileUser->name" size="md" />
                        <div class="min-w-0">
                            <p class="truncate text-sm font-semibold text-zinc-900">{{ $profileUser->name }}</p>
                            <p class="truncate text-xs text-zinc-500">{{ $profileUser->email }}</p>
                            <div class="mt-1.5">
                                @if ($profileIsAdmin)
                                    <x-badge tone="brand"><x-icon name="shield" class="h-3 w-3" />Admin</x-badge>
                                @else
                                    <x-badge>Medewerker</x-badge>
                                @endif
                            </div>
                        </div>
                    </div>
                @endif

                <nav class="space-y-5" aria-label="Snelle navigatie profiel">
                    <div>
                        <p class="px-3 text-xs font-medium text-zinc-500">Mijn account</p>
                        <ul class="mt-1.5 space-y-0.5">
                            @foreach ($profileNav as $item)
                                <li>
                                    <a class="nav-item" href="#{{ $item['id'] }}">
                                        <x-icon :name="$item['icon']" />
                                        <span class="min-w-0 flex-1 truncate">{{ $item['label'] }}</span>
                                        @if (! empty($item['badge']))
                                            <x-badge :tone="$item['tone']">{{ $item['badge'] }}<span class="sr-only">{{ $item['id'] === 'passkeys' ? ' ingesteld' : '' }}</span></x-badge>
                                        @endif
                                    </a>
                                </li>
                            @endforeach
                        </ul>
                    </div>
                    @if ($profileIsAdmin)
                        <div>
                            <p class="px-3 text-xs font-medium text-zinc-500">Systeem, alleen admins</p>
                            <ul class="mt-1.5 space-y-0.5">
                                <li><a class="nav-item" href="#admin-mail"><x-icon name="mail" /><span>E-mailinstellingen</span></a></li>
                            </ul>
                        </div>
                    @endif
                </nav>
            </div>
        </aside>

        <div class="min-w-0 space-y-10">
            <div class="space-y-6">
                <h2 class="sr-only">Mijn account</h2>

                @if (Laravel\Fortify\Features::canUpdateProfileInformation())
                    <section id="profile-info" class="scroll-mt-20">
                        @livewire('profile.update-profile-information-form')
                    </section>
                @endif

                @if (Laravel\Fortify\Features::enabled(Laravel\Fortify\Features::updatePasswords()))
                    <section id="password" class="scroll-mt-20">
                        @livewire('profile.update-password-form')
                    </section>
                @endif

                @if ($profileCan2fa)
                    <section id="two-factor" class="scroll-mt-20">
                        @livewire('profile.two-factor-authentication-form')
                    </section>
                @endif

                <section id="passkeys" class="scroll-mt-20">
                    @include('profile.passkeys-form')
                </section>

                <section id="sessions" class="scroll-mt-20">
                    @livewire('profile.logout-other-browser-sessions-form')
                </section>

                @if ($profileCanDelete)
                    <section id="delete-account" class="scroll-mt-20">
                        @livewire('profile.delete-user-form')
                    </section>
                @elseif ($profileIsLastAdmin && Laravel\Jetstream\Jetstream::hasAccountDeletionFeatures())
                    <p class="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        <x-icon name="info" class="mt-0.5 h-4 w-4 text-zinc-400" />
                        Je bent de laatste actieve admin. Je account kan pas worden verwijderd als er een andere admin is.
                    </p>
                @endif
            </div>

            @if ($profileIsAdmin)
                <div class="space-y-4 border-t border-zinc-200 pt-8">
                    <div class="flex items-start gap-3">
                        <span class="icon-tile h-10 w-10 bg-zinc-100 text-zinc-600" aria-hidden="true"><x-icon name="settings" class="h-5 w-5" /></span>
                        <div>
                        <h2 class="text-lg font-semibold tracking-snug text-zinc-900">Systeeminstellingen</h2>
                        <p class="section-description">Instellingen die voor alle gebruikers van het CRM gelden. Alleen zichtbaar voor admins.</p>
                        </div>
                    </div>

                    <section id="admin-mail" class="scroll-mt-20">
                        @livewire('profile.admin-system-settings')
                    </section>
                </div>
            @endif
        </div>
    </div>
</x-app-layout>
