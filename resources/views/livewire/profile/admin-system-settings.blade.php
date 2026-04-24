<div class="space-y-6" x-data="{ tab: 'smtp' }">
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p class="text-sm font-semibold text-slate-900">E-mailbeheer</p>
                <p class="mt-1 text-sm text-slate-600">
                    Werk per onderdeel: kies bovenin een tab voor SMTP of welkomstmail.
                </p>
            </div>

            <div class="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
                <button
                    type="button"
                    class="rounded-md px-3 py-1.5 transition"
                    :class="tab === 'smtp' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'"
                    @click="tab = 'smtp'"
                >
                    SMTP
                </button>
                <button
                    type="button"
                    class="rounded-md px-3 py-1.5 transition"
                    :class="tab === 'template' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'"
                    @click="tab = 'template'"
                >
                    Welkomstmail
                </button>
            </div>
        </div>
    </div>

    <div x-show="tab === 'smtp'">
        <x-form-section submit="saveSmtp">
            <x-slot name="title">
                {{ __('Systeem e-mail (SMTP)') }}
            </x-slot>

            <x-slot name="description">
                {{ __('Deze instellingen gelden voor alle uitgaande systeemmails.') }}
            </x-slot>

            <x-slot name="form">
                <div class="col-span-6 sm:col-span-4">
                    <x-label for="smtp_host" value="SMTP host" />
                    <x-input id="smtp_host" type="text" class="mt-1 block w-full" wire:model.defer="smtp.host" placeholder="smtp.office365.com" />
                    <x-input-error for="smtp.host" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-1">
                    <x-label for="smtp_port" value="Poort" />
                    <x-input id="smtp_port" type="number" class="mt-1 block w-full" wire:model.defer="smtp.port" />
                    <x-input-error for="smtp.port" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-1">
                    <x-label for="smtp_encryption" value="Encryptie" />
                    <select id="smtp_encryption" class="mt-1 block w-full rounded-md border-gray-300 text-sm" wire:model.defer="smtp.encryption">
                        <option value="">Geen</option>
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                    </select>
                    <x-input-error for="smtp.encryption" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-3">
                    <x-label for="smtp_username" value="Gebruikersnaam" />
                    <x-input id="smtp_username" type="text" class="mt-1 block w-full" wire:model.defer="smtp.username" />
                    <x-input-error for="smtp.username" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-3">
                    <x-label for="smtp_password" value="Wachtwoord" />
                    <x-input id="smtp_password" type="password" class="mt-1 block w-full" wire:model.defer="smtp.password" autocomplete="new-password" />
                    <x-input-error for="smtp.password" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-3">
                    <x-label for="smtp_from_address" value="Afzender e-mail" />
                    <x-input id="smtp_from_address" type="email" class="mt-1 block w-full" wire:model.defer="smtp.from_address" />
                    <x-input-error for="smtp.from_address" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-3">
                    <x-label for="smtp_from_name" value="Afzender naam" />
                    <x-input id="smtp_from_name" type="text" class="mt-1 block w-full" wire:model.defer="smtp.from_name" />
                    <x-input-error for="smtp.from_name" class="mt-2" />
                </div>

                <div class="col-span-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                    <x-label for="smtp_test_email" value="Test e-mail versturen naar" />
                    <x-input id="smtp_test_email" type="email" class="mt-1 block w-full sm:max-w-md" wire:model.defer="testEmail" />
                    <x-input-error for="testEmail" class="mt-2" />
                    <p class="mt-2 text-xs text-slate-600">
                        Gebruik "Test mail sturen" om direct te checken of alles werkt.
                    </p>
                </div>
            </x-slot>

            <x-slot name="actions">
                <x-action-message class="me-3" on="saved">
                    {{ __('Opgeslagen.') }}
                </x-action-message>

                <x-secondary-button type="button" wire:click="sendTestEmail" wire:loading.attr="disabled" wire:target="sendTestEmail">
                    {{ __('Test mail sturen') }}
                </x-secondary-button>

                <x-button class="ms-2" wire:loading.attr="disabled" wire:target="saveSmtp">
                    {{ __('Instellingen opslaan') }}
                </x-button>
            </x-slot>
        </x-form-section>
    </div>

    <div x-show="tab === 'template'" style="display: none;">
        <x-form-section submit="saveTemplate">
            <x-slot name="title">
                {{ __('Welkomstmail template') }}
            </x-slot>

            <x-slot name="description">
                {{ __('Gebruik placeholders en schrijf de mail in platte tekst. HTML wordt automatisch opgebouwd.') }}
            </x-slot>

            <x-slot name="form">
                <div class="col-span-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-600">Beschikbare placeholders</div>
                    <div class="mt-2 flex flex-wrap gap-2">
                        @foreach ($placeholders as $placeholder)
                            <span class="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                                {{ $placeholder }}
                            </span>
                        @endforeach
                    </div>
                </div>

                <div class="col-span-6">
                    <x-label for="template_subject" value="Onderwerp" />
                    <x-input id="template_subject" type="text" class="mt-1 block w-full" wire:model.defer="template.subject" />
                    <x-input-error for="template.subject" class="mt-2" />
                </div>

                <div class="col-span-6">
                    <x-label for="template_body_text" value="Bericht" />
                    <textarea
                        id="template_body_text"
                        class="mt-1 block w-full rounded-md border-gray-300 text-sm"
                        rows="12"
                        wire:model.defer="template.body_text"
                    ></textarea>
                    <x-input-error for="template.body_text" class="mt-2" />
                    <p class="mt-2 text-xs text-slate-600">
                        Gebruik per alinea een nieuwe regel voor duidelijke opmaak in de uiteindelijke e-mail.
                    </p>
                </div>
            </x-slot>

            <x-slot name="actions">
                <x-action-message class="me-3" on="saved">
                    {{ __('Opgeslagen.') }}
                </x-action-message>

                <x-button wire:loading.attr="disabled" wire:target="saveTemplate">
                    {{ __('Template opslaan') }}
                </x-button>
            </x-slot>
        </x-form-section>
    </div>
</div>
