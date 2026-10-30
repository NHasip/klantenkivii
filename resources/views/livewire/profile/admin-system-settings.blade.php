<div class="space-y-6">
    <section class="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm" aria-labelledby="smtp-title">
        <form wire:submit.prevent="saveSmtp">
            <div class="p-4 sm:p-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0">
                        <h3 id="smtp-title" class="text-base font-semibold text-zinc-900">Systeem-e-mail (SMTP)</h3>
                        <p class="mt-0.5 text-sm text-zinc-500">Deze server verstuurt alle uitgaande mails van het CRM.</p>
                    </div>
                    @if ($hasSmtpPassword && filled($smtp['host'] ?? null))
                        <span class="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">Ingesteld</span>
                    @else
                        <span class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">Niet volledig</span>
                    @endif
                </div>

                <fieldset class="mt-5">
                    <legend class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Server</legend>
                    <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                            <select id="smtp_encryption" class="mt-1 block w-full rounded-lg border-zinc-300 text-sm text-zinc-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600" wire:model="smtp.encryption">
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
                                <p id="smtp_password_hint" class="mt-1 text-xs text-zinc-500">Er is een wachtwoord opgeslagen. Laat dit veld leeg om het te behouden.</p>
                            @endif
                            <x-input-error for="smtp.password" class="mt-1" />
                        </div>
                    </div>
                </fieldset>

                <fieldset class="mt-6">
                    <legend class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Afzender</legend>
                    <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                <div class="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <x-label for="smtp_test_email" value="Testmail versturen naar" />
                    <p class="mt-0.5 text-xs text-zinc-500">Gebruikt de waarden hierboven, ook als die nog niet zijn opgeslagen.</p>
                    <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                        <div class="min-w-0 flex-1 sm:max-w-md">
                            <x-input id="smtp_test_email" type="email" class="block w-full" wire:model="testEmail" />
                            <x-input-error for="testEmail" class="mt-1" />
                        </div>
                        <x-secondary-button type="button" wire:click="sendTestEmail" wire:loading.attr="disabled" wire:target="sendTestEmail">
                            <span wire:loading.remove wire:target="sendTestEmail">Testmail sturen</span>
                            <span wire:loading wire:target="sendTestEmail">Versturen...</span>
                        </x-secondary-button>
                    </div>
                    <x-action-message class="mt-2" on="test-mail-sent">Testmail verstuurd.</x-action-message>
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/70 px-4 py-3 sm:px-5">
                <x-action-message on="smtp-saved">Opgeslagen.</x-action-message>

                <x-button wire:loading.attr="disabled" wire:target="saveSmtp">
                    <span wire:loading.remove wire:target="saveSmtp">SMTP opslaan</span>
                    <span wire:loading wire:target="saveSmtp">Opslaan...</span>
                </x-button>
            </div>
        </form>
    </section>

    <section class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="templates-title">
        <div class="min-w-0">
            <h3 id="templates-title" class="text-base font-semibold text-zinc-900">E-mailtemplates</h3>
            <p class="mt-0.5 text-sm text-zinc-500">Templates maak en bewerk je op een aparte pagina.</p>
        </div>
        <a href="{{ $templatesUrl }}"
           class="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-sm font-semibold text-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2">
            Templates beheren &rarr;
        </a>
    </section>
</div>
