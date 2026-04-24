<div class="mt-10 space-y-8 sm:mt-0">
    <x-section-border />

    <div class="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700 sm:p-5">
        <p class="text-sm font-semibold text-slate-900">Beheer e-mailinstellingen</p>
        <p class="mt-1">
            Stel hier SMTP en de standaard welkomstmail in. De pagina is vereenvoudigd zodat je alleen de velden ziet die echt nodig zijn.
        </p>
    </div>

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
                    Klik op "Test mail sturen" om direct te controleren of de SMTP-configuratie werkt.
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

    <x-form-section submit="saveTemplate">
        <x-slot name="title">
            {{ __('Welkomstmail template') }}
        </x-slot>

        <x-slot name="description">
            {{ __('Houd de template compact en gebruik placeholders voor persoonlijke gegevens.') }}
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
                    Regels uit dit tekstveld worden automatisch omgezet naar nette HTML-opmaak voor e-mail.
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
