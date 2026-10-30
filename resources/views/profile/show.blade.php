<x-app-layout>
    <x-slot name="title">Profiel</x-slot>

    @php
        $profileUser = auth()->user();
        $profileIsAdmin = (bool) $profileUser?->isAdmin();
        $profileIsLastAdmin = $profileUser ? \App\Livewire\Crm\Users\Index::isLastActiveAdmin($profileUser) : false;
        $profileCanDelete = Laravel\Jetstream\Jetstream::hasAccountDeletionFeatures() && ! $profileIsLastAdmin;
        $profileHas2fa = \App\Http\Middleware\RequireTwoFactorForAdmin::userHasTwoFactor($profileUser);
        $profileCan2fa = Laravel\Fortify\Features::canManageTwoFactorAuthentication();

        $profileNav = array_values(array_filter([
            Laravel\Fortify\Features::canUpdateProfileInformation() ? ['id' => 'profile-info', 'label' => 'Profiel'] : null,
            Laravel\Fortify\Features::enabled(Laravel\Fortify\Features::updatePasswords()) ? ['id' => 'password', 'label' => 'Wachtwoord'] : null,
            $profileCan2fa ? ['id' => 'two-factor', 'label' => 'Tweestapsverificatie', 'badge' => $profileHas2fa ? 'Aan' : 'Uit', 'badgeOn' => $profileHas2fa] : null,
            ['id' => 'passkeys', 'label' => 'Passkeys'],
            ['id' => 'sessions', 'label' => 'Sessies'],
            $profileCanDelete ? ['id' => 'delete-account', 'label' => 'Account verwijderen'] : null,
        ]));
        $profileNavLink = 'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
    @endphp

    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
            <h1 class="text-2xl font-semibold tracking-tight text-zinc-900">Profiel en beveiliging</h1>
            <p class="mt-1 text-sm text-zinc-500">
                @if ($profileIsAdmin)
                    Beheer je accountgegevens, beveiliging en de systeeminstellingen voor alle gebruikers.
                @else
                    Beheer je accountgegevens en beveiliging.
                @endif
            </p>
        </div>
    </div>

    {{-- Snelle navigatie op mobiel: horizontaal scrollbare chips. --}}
    <nav class="-mx-4 mb-6 overflow-x-auto px-4 lg:hidden" aria-label="Snelle navigatie profiel">
        <ul class="flex gap-2 whitespace-nowrap">
            @foreach ($profileNav as $item)
                <li>
                    <a href="#{{ $item['id'] }}" class="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-sm text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">{{ $item['label'] }}</a>
                </li>
            @endforeach
            @if ($profileIsAdmin)
                <li>
                    <a href="#admin-mail" class="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-white px-3 text-sm text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">E-mailinstellingen</a>
                </li>
            @endif
        </ul>
    </nav>

    <div class="grid gap-6 lg:grid-cols-[220px,minmax(0,1fr)] lg:gap-8">
        <aside class="hidden lg:block">
            <nav class="sticky top-20 space-y-6" aria-label="Snelle navigatie profiel">
                <div>
                    <p class="px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Mijn account</p>
                    <ul class="mt-2 space-y-0.5">
                        @foreach ($profileNav as $item)
                            <li>
                                <a class="{{ $profileNavLink }}" href="#{{ $item['id'] }}">
                                    <span>{{ $item['label'] }}</span>
                                    @isset($item['badge'])
                                        <span @class(['rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', 'bg-emerald-50 text-emerald-800 ring-emerald-200' => $item['badgeOn'], 'bg-amber-50 text-amber-800 ring-amber-200' => ! $item['badgeOn']])>{{ $item['badge'] }}</span>
                                    @endisset
                                </a>
                            </li>
                        @endforeach
                    </ul>
                </div>
                @if ($profileIsAdmin)
                    <div>
                        <p class="px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Systeem (admin)</p>
                        <ul class="mt-2 space-y-0.5">
                            <li><a class="{{ $profileNavLink }}" href="#admin-mail">E-mailinstellingen</a></li>
                        </ul>
                    </div>
                @endif
            </nav>
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
                    <p class="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        Je bent de laatste actieve admin. Je account kan pas worden verwijderd als er een andere admin is.
                    </p>
                @endif
            </div>

            @if ($profileIsAdmin)
                <div class="space-y-4 border-t border-zinc-200 pt-8">
                    <div>
                        <h2 class="text-lg font-semibold text-zinc-900">Systeeminstellingen</h2>
                        <p class="mt-1 text-sm text-zinc-500">Instellingen die voor alle gebruikers van het CRM gelden. Alleen zichtbaar voor admins.</p>
                    </div>

                    <section id="admin-mail" class="scroll-mt-20">
                        @livewire('profile.admin-system-settings')
                    </section>
                </div>
            @endif
        </div>
    </div>
</x-app-layout>
