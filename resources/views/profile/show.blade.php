<x-app-layout>
    <x-slot name="title">Profiel</x-slot>

    <x-slot name="header">
        <div class="flex flex-col gap-1">
            <h1 class="text-2xl font-bold text-zinc-900">
                {{ __('Profielinstellingen') }}
            </h1>
            <p class="text-sm text-slate-600">
                {{ __('Beheer accountgegevens, beveiliging en systeeminstellingen op een overzichtelijke manier.') }}
            </p>
        </div>
    </x-slot>

    @php
        $profileUser = auth()->user();
        $profileIsAdmin = (bool) $profileUser?->isAdmin();
        $profileIsLastAdmin = $profileUser ? \App\Livewire\Crm\Users\Index::isLastActiveAdmin($profileUser) : false;
        $profileCanDelete = Laravel\Jetstream\Jetstream::hasAccountDeletionFeatures() && ! $profileIsLastAdmin;
    @endphp

    <div class="bg-gradient-to-b from-slate-50 via-white to-white">
        <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div class="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
                <p class="text-sm font-semibold text-slate-900">{{ __('Accountcentrum') }}</p>
                <p class="mt-1 text-sm text-slate-600">
                    @if (auth()->user()?->isAdmin())
                        {{ __('Werk stap voor stap: pas eerst je profiel aan, controleer daarna beveiliging en beheer als admin de e-mailinstellingen.') }}
                    @else
                        {{ __('Werk stap voor stap: pas eerst je profiel aan en controleer daarna je beveiliging.') }}
                    @endif
                </p>
            </div>

            <div class="mt-8 grid gap-6 xl:grid-cols-[260px,minmax(0,1fr)]">
                <aside class="hidden xl:block">
                    <div class="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ __('Snelle navigatie') }}</p>
                        <nav class="mt-3 space-y-1 text-sm" aria-label="Snelle navigatie">
                            <p class="px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{{ __('Mijn account') }}</p>
                            <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#profile-info">{{ __('Profiel') }}</a>
                            <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#password">{{ __('Wachtwoord') }}</a>
                            <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#two-factor">{{ __('2FA') }}</a>
                            <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#passkeys">{{ __('Passkeys') }}</a>
                            <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#sessions">{{ __('Sessies') }}</a>
                            @if ($profileCanDelete)
                                <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#delete-account">{{ __('Account verwijderen') }}</a>
                            @endif
                            @if ($profileIsAdmin)
                                <p class="mt-3 border-t border-slate-100 px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{{ __('Systeeminstellingen (admin)') }}</p>
                                <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#admin-mail">{{ __('E-mailinstellingen') }}</a>
                            @endif
                        </nav>
                    </div>
                </aside>

                <div class="space-y-10">
                    <div class="space-y-6" aria-labelledby="profile-account-heading">
                        <div>
                            <h2 id="profile-account-heading" class="text-lg font-semibold text-zinc-900">{{ __('Mijn account') }}</h2>
                            <p class="mt-1 text-sm text-slate-600">{{ __('Je eigen gegevens, wachtwoord, 2FA, passkeys en sessies.') }}</p>
                        </div>

                        @if (Laravel\Fortify\Features::canUpdateProfileInformation())
                            <section id="profile-info" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                @livewire('profile.update-profile-information-form')
                            </section>
                        @endif

                        @if (Laravel\Fortify\Features::enabled(Laravel\Fortify\Features::updatePasswords()))
                            <section id="password" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                @livewire('profile.update-password-form')
                            </section>
                        @endif

                        @if (Laravel\Fortify\Features::canManageTwoFactorAuthentication())
                            <section id="two-factor" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                @livewire('profile.two-factor-authentication-form')
                            </section>
                        @endif

                        <section id="passkeys" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            @include('profile.passkeys-form')
                        </section>

                        <section id="sessions" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            @livewire('profile.logout-other-browser-sessions-form')
                        </section>

                        @if ($profileCanDelete)
                            <section id="delete-account" class="scroll-mt-24 rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm sm:p-5">
                                @livewire('profile.delete-user-form')
                            </section>
                        @elseif ($profileIsLastAdmin && Laravel\Jetstream\Jetstream::hasAccountDeletionFeatures())
                            <p class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                {{ __('Je bent de laatste actieve admin. Je account kan pas worden verwijderd als er een andere admin is.') }}
                            </p>
                        @endif
                    </div>

                    @if ($profileIsAdmin)
                        <div class="space-y-6 border-t border-slate-200 pt-8" aria-labelledby="profile-system-heading">
                            <div>
                                <h2 id="profile-system-heading" class="text-lg font-semibold text-zinc-900">{{ __('Systeeminstellingen (admin)') }}</h2>
                                <p class="mt-1 text-sm text-slate-600">{{ __('Instellingen die voor alle gebruikers van het CRM gelden.') }}</p>
                            </div>

                            <section id="admin-mail" class="scroll-mt-24 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-5">
                                @livewire('profile.admin-system-settings')
                            </section>
                        </div>
                    @endif
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
