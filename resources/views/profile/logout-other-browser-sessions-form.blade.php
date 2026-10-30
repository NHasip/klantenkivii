<x-action-section>
    <x-slot name="title">Browsersessies</x-slot>

    <x-slot name="description">Bekijk waar je bent ingelogd en log andere apparaten uit.</x-slot>

    <x-slot name="content">
        <p class="max-w-xl text-sm text-zinc-600">
            Je kunt je zo nodig afmelden op al je andere browsers en apparaten. Hieronder staan je recente sessies; de lijst is mogelijk niet volledig. Denk je dat je account niet veilig is? Wijzig dan ook je wachtwoord.
        </p>

        @if (count($this->sessions) > 0)
            <ul class="mt-5 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                @foreach ($this->sessions as $session)
                    <li class="flex items-center gap-3 px-4 py-3">
                        <div class="shrink-0 text-zinc-400">
                            @if ($session->agent->isDesktop())
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                                </svg>
                            @else
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                                </svg>
                            @endif
                        </div>

                        <div class="min-w-0">
                            <div class="text-sm font-medium text-zinc-800">
                                {{ $session->agent->platform() ?: 'Onbekend' }} · {{ $session->agent->browser() ?: 'Onbekend' }}
                            </div>
                            <div class="text-xs text-zinc-500">
                                {{ $session->ip_address }} ·
                                @if ($session->is_current_device)
                                    <span class="font-semibold text-emerald-700">Dit apparaat</span>
                                @else
                                    Laatst actief {{ $session->last_active }}
                                @endif
                            </div>
                        </div>
                    </li>
                @endforeach
            </ul>
        @endif

        <div class="mt-5 flex flex-wrap items-center gap-3">
            <x-secondary-button wire:click="confirmLogout" wire:loading.attr="disabled">
                Andere sessies uitloggen
            </x-secondary-button>

            <x-action-message on="loggedOut">Klaar.</x-action-message>
        </div>

        <x-dialog-modal wire:model.live="confirmingLogout">
            <x-slot name="title">Andere sessies uitloggen</x-slot>

            <x-slot name="content">
                Vul je wachtwoord in om je af te melden op al je andere browsers en apparaten.

                <div class="mt-4" x-data="{}" x-on:confirming-logout-other-browser-sessions.window="setTimeout(() => $refs.password.focus(), 250)">
                    <x-label for="logout_sessions_password" value="Wachtwoord" class="sr-only" />
                    <x-input id="logout_sessions_password" type="password" class="mt-1 block w-full sm:w-3/4"
                                autocomplete="current-password"
                                placeholder="Wachtwoord"
                                x-ref="password"
                                wire:model="password"
                                wire:keydown.enter="logoutOtherBrowserSessions" />

                    <x-input-error for="password" class="mt-1" />
                </div>
            </x-slot>

            <x-slot name="footer">
                <x-secondary-button wire:click="$toggle('confirmingLogout')" wire:loading.attr="disabled">
                    Annuleren
                </x-secondary-button>

                <x-button type="button" wire:click="logoutOtherBrowserSessions" wire:loading.attr="disabled">
                    Uitloggen
                </x-button>
            </x-slot>
        </x-dialog-modal>
    </x-slot>
</x-action-section>
