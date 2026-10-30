<div class="space-y-6">
    <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h3 class="text-base font-semibold text-gray-900">Systeem e-mail (SMTP)</h3>
                <p class="mt-1 text-sm text-gray-600">
                    Instellingen voor alle uitgaande systeemmails.
                </p>
            </div>
        </div>

        <form wire:submit.prevent="saveSmtp" class="mt-4 space-y-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div class="lg:col-span-2">
                    <x-label for="smtp_host" value="SMTP host" />
                    <x-input id="smtp_host" type="text" class="mt-1 block w-full" wire:model="smtp.host" placeholder="smtp.office365.com" />
                    <x-input-error for="smtp.host" class="mt-2" />
                </div>

                <div>
                    <x-label for="smtp_port" value="Poort" />
                    <x-input id="smtp_port" type="number" class="mt-1 block w-full" wire:model="smtp.port" />
                    <x-input-error for="smtp.port" class="mt-2" />
                </div>

                <div>
                    <x-label for="smtp_encryption" value="Encryptie" />
                    <select id="smtp_encryption" class="mt-1 block w-full rounded-md border-gray-300 text-sm" wire:model="smtp.encryption">
                        <option value="">Geen</option>
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                    </select>
                    <x-input-error for="smtp.encryption" class="mt-2" />
                </div>

                <div class="lg:col-span-2">
                    <x-label for="smtp_username" value="Gebruikersnaam" />
                    <x-input id="smtp_username" type="text" class="mt-1 block w-full" wire:model="smtp.username" />
                    <x-input-error for="smtp.username" class="mt-2" />
                </div>

                <div class="lg:col-span-2">
                    <x-label for="smtp_password" value="Wachtwoord" />
                    <x-input id="smtp_password" type="password" class="mt-1 block w-full" wire:model="smtp.password" autocomplete="new-password" />
                    @if ($hasSmtpPassword)
                        <p class="mt-1 text-xs text-gray-500">Er is een wachtwoord opgeslagen. Laat dit veld leeg om het te behouden.</p>
                    @endif
                    <x-input-error for="smtp.password" class="mt-2" />
                </div>

                <div class="lg:col-span-2">
                    <x-label for="smtp_from_address" value="Afzender e-mail" />
                    <x-input id="smtp_from_address" type="email" class="mt-1 block w-full" wire:model="smtp.from_address" />
                    <x-input-error for="smtp.from_address" class="mt-2" />
                </div>

                <div class="lg:col-span-2">
                    <x-label for="smtp_from_name" value="Afzender naam" />
                    <x-input id="smtp_from_name" type="text" class="mt-1 block w-full" wire:model="smtp.from_name" />
                    <x-input-error for="smtp.from_name" class="mt-2" />
                </div>
            </div>

            <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <x-label for="smtp_test_email" value="Test e-mail versturen naar" />
                <x-input id="smtp_test_email" type="email" class="mt-1 block w-full sm:max-w-md" wire:model="testEmail" />
                <x-input-error for="testEmail" class="mt-2" />
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <x-action-message class="me-2" on="smtp-saved">
                    {{ __('Opgeslagen.') }}
                </x-action-message>

                <x-action-message class="me-2" on="test-mail-sent">
                    Testmail verstuurd.
                </x-action-message>

                <x-secondary-button type="button" wire:click="sendTestEmail" wire:loading.attr="disabled" wire:target="sendTestEmail">
                    <span wire:loading.remove wire:target="sendTestEmail">{{ __('Test mail sturen') }}</span>
                    <span wire:loading wire:target="sendTestEmail">Versturen...</span>
                </x-secondary-button>

                <x-button wire:loading.attr="disabled" wire:target="saveSmtp">
                    {{ __('SMTP opslaan') }}
                </x-button>
            </div>
        </form>
    </section>

    <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h3 class="text-base font-semibold text-gray-900">E-mail templates</h3>
                <p class="mt-1 text-sm text-gray-600">
                    Templates maak en bewerk je op een aparte pagina.
                </p>
            </div>
            <a
                href="{{ $templatesUrl }}"
                class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
                E-mail templates beheren
            </a>
        </div>
    </section>
</div>
