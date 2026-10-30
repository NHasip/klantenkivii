<div class="space-y-6">
    <section class="card overflow-hidden" aria-labelledby="smtp-title">
        <form wire:submit.prevent="saveSmtp">
            <div class="card-body">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="flex min-w-0 items-start gap-3">
                        <span class="icon-tile h-10 w-10 bg-sky-50 text-sky-700" aria-hidden="true"><x-icon name="mail" class="h-5 w-5" /></span>
                        <div class="min-w-0">
                        <h3 id="smtp-title" class="section-heading">Systeem-e-mail (SMTP)</h3>
                        <p class="section-description">Deze server verstuurt alle uitgaande mails van het CRM.</p>
                        </div>
                    </div>
                    @if ($hasSmtpPassword && filled($smtp['host'] ?? null))
                        <x-badge tone="success" dot>Ingesteld</x-badge>
                    @else
                        <x-badge tone="warning" dot>Niet volledig</x-badge>
                    @endif
                </div>

                <fieldset class="mt-5">
                    <legend class="text-sm font-semibold text-zinc-900">Server</legend>
                    <div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div class="sm:col-span-2">
                            <x-label for="smtp_host" value="SMTP-host" />
                            <x-input id="smtp_host" type="text" class="mt-1 block w-full" wire:model="smtp.host" placeholder="smtp.office365.com" autocomplete="off" />
                            <x-input-error for="smtp.host" class="mt-1" />
                        </div>

                        <div>
                            <x-label for="smtp_port" value="Poort" />
                            <x-input id="smtp_port" type="number" min="1" max="65535" class="mt-1 block w-full" wire:model="smtp.port" />
                            <x-input-error for="smtp.port" class="mt-1" />
                        </div>

                        <div>
                            <x-label for="smtp_encryption" value="Versleuteling" />
                            <select id="smtp_encryption" class="input mt-1" wire:model="smtp.encryption">
                                <option value="">Geen</option>
                                <option value="tls">TLS</option>
                                <option value="ssl">SSL</option>
                            </select>
                            <x-input-error for="smtp.encryption" class="mt-1" />
                        </div>

                        <div class="sm:col-span-2">
                            <x-label for="smtp_username" value="Gebruikersnaam" />
                            <x-input id="smtp_username" type="text" class="mt-1 block w-full" wire:model="smtp.username" autocomplete="off" />
                            <x-input-error for="smtp.username" class="mt-1" />
                        </div>

                        <div class="sm:col-span-2">
                            <x-label for="smtp_password" value="Wachtwoord" />
                            <x-input id="smtp_password" type="password" class="mt-1 block w-full" wire:model="smtp.password" autocomplete="new-password" :placeholder="$hasSmtpPassword ? 'Opgeslagen, laat leeg om te behouden' : ''" aria-describedby="smtp_password_hint" />
                            @if ($hasSmtpPassword)
                                <p id="smtp_password_hint" class="field-hint">Er is een wachtwoord opgeslagen. Laat dit veld leeg om het te behouden.</p>
                            @endif
                            <x-input-error for="smtp.password" class="mt-1" />
                        </div>
                    </div>
                </fieldset>

                <fieldset class="mt-6 border-t border-zinc-100 pt-5">
                    <legend class="text-sm font-semibold text-zinc-900">Afzender</legend>
                    <div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <x-label for="smtp_from_address" value="E-mailadres afzender" />
                            <x-input id="smtp_from_address" type="email" class="mt-1 block w-full" wire:model="smtp.from_address" />
                            <x-input-error for="smtp.from_address" class="mt-1" />
                        </div>

                        <div>
                            <x-label for="smtp_from_name" value="Naam afzender" />
                            <x-input id="smtp_from_name" type="text" class="mt-1 block w-full" wire:model="smtp.from_name" placeholder="Kivii" />
                            <x-input-error for="smtp.from_name" class="mt-1" />
                        </div>
                    </div>
                </fieldset>

                <div class="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                    <x-label for="smtp_test_email" value="Testmail versturen naar" />
                    <p class="field-hint mt-0.5">Gebruikt de waarden hierboven, ook als die nog niet zijn opgeslagen.</p>
                    <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                        <div class="min-w-0 flex-1 sm:max-w-md">
                            <x-input id="smtp_test_email" type="email" class="block w-full" wire:model="testEmail" />
                            <x-input-error for="testEmail" class="mt-1" />
                        </div>
                        <x-secondary-button type="button" wire:click="sendTestEmail" wire:loading.attr="disabled" wire:target="sendTestEmail">
                            <x-icon name="mail" class="h-4 w-4" />
                            <span wire:loading.remove wire:target="sendTestEmail">Testmail sturen</span>
                            <span wire:loading wire:target="sendTestEmail">Versturen...</span>
                        </x-secondary-button>
                    </div>
                    <x-action-message class="mt-2" on="test-mail-sent">Testmail verstuurd.</x-action-message>
                </div>
            </div>

            <div class="card-footer gap-3 rounded-b-none">
                <x-action-message on="smtp-saved">Opgeslagen.</x-action-message>

                <x-button wire:loading.attr="disabled" wire:target="saveSmtp">
                    <span wire:loading.remove wire:target="saveSmtp">SMTP opslaan</span>
                    <span wire:loading wire:target="saveSmtp">Opslaan...</span>
                </x-button>
            </div>
        </form>
    </section>

    <section class="card card-body flex flex-wrap items-center justify-between gap-4" aria-labelledby="templates-title">
        <div class="flex min-w-0 items-start gap-3">
            <span class="icon-tile h-10 w-10 bg-violet-50 text-violet-700" aria-hidden="true"><x-icon name="file-text" class="h-5 w-5" /></span>
            <div class="min-w-0">
            <h3 id="templates-title" class="section-heading">E-mailtemplates</h3>
            <p class="section-description">Templates maak en bewerk je op een aparte pagina.</p>
            </div>
        </div>
        <a href="{{ $templatesUrl }}"
           class="btn btn-secondary">
            Templates beheren
            <x-icon name="arrow-right" class="h-4 w-4" />
        </a>
    </section>
</div>
