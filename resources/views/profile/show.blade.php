<x-app-layout>
    <x-slot name="header">
        <div class="flex flex-col gap-1">
            <h2 class="text-xl font-semibold leading-tight text-slate-900">
                {{ __('Profielinstellingen') }}
            </h2>
            <p class="text-sm text-slate-600">
                {{ __('Beheer accountgegevens, beveiliging en systeeminstellingen op een overzichtelijke manier.') }}
            </p>
        </div>
    </x-slot>

    <div class="bg-gradient-to-b from-slate-50 via-white to-white">
        <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div class="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
                <p class="text-sm font-semibold text-slate-900">{{ __('Accountcentrum') }}</p>
                <p class="mt-1 text-sm text-slate-600">
                    {{ __('Werk stap voor stap: pas eerst je profiel aan, controleer daarna beveiliging en beheer als admin de e-mailtemplates.') }}
                </p>
            </div>

            <div class="mt-8 grid gap-6 xl:grid-cols-[260px,minmax(0,1fr)]">
                <aside class="hidden xl:block">
                    <div class="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ __('Snelle navigatie') }}</p>
                        <nav class="mt-3 space-y-1 text-sm">
                            <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#profile-info">{{ __('Profiel') }}</a>
                            <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#password">{{ __('Wachtwoord') }}</a>
                            <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#two-factor">{{ __('2FA') }}</a>
                            <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#passkeys">{{ __('Passkeys') }}</a>
                            @if (auth()->user()?->isAdmin())
                                <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#admin-mail">{{ __('E-mailbeheer') }}</a>
                            @endif
                            <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#sessions">{{ __('Sessies') }}</a>
                            @if (Laravel\Jetstream\Jetstream::hasAccountDeletionFeatures())
                                <a class="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100" href="#delete-account">{{ __('Account verwijderen') }}</a>
                            @endif
                        </nav>
                    </div>
                </aside>

                <div class="space-y-6">
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

                    @if (auth()->user()?->isAdmin())
                        <section id="admin-mail" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            @php
                                try {
                                    echo \Livewire\Livewire::mount('profile.admin-system-settings')->html();
                                } catch (\Throwable $e) {
                                    report($e);
                                    echo '<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">E-mailbeheer kon niet geladen worden. Controleer migraties en cache op de server.</div>';
                                }
                            @endphp
                        </section>
                    @endif

                    <section id="sessions" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        @livewire('profile.logout-other-browser-sessions-form')
                    </section>

                    @if (Laravel\Jetstream\Jetstream::hasAccountDeletionFeatures())
                        <section id="delete-account" class="scroll-mt-24 rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm sm:p-5">
                            @livewire('profile.delete-user-form')
                        </section>
                    @endif
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
