<div class="mt-10 sm:mt-0">
    <x-section-border />

    <div class="mt-10 sm:mt-0">
        <x-form-section submit="saveSmtp">
            <x-slot name="title">
                {{ __('Systeem-instellingen (SMTP)') }}
            </x-slot>

            <x-slot name="description">
                {{ __('Globale Office 365 SMTP instellingen voor het hele systeem.') }}
            </x-slot>

            <x-slot name="form">
                <div class="col-span-6 sm:col-span-4">
                    <x-label value="SMTP host" />
                    <x-input type="text" class="mt-1 block w-full" wire:model.defer="smtp.host" placeholder="smtp.office365.com" />
                    <x-input-error for="smtp.host" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-2">
                    <x-label value="Poort" />
                    <x-input type="number" class="mt-1 block w-full" wire:model.defer="smtp.port" />
                    <x-input-error for="smtp.port" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-4">
                    <x-label value="Gebruikersnaam" />
                    <x-input type="text" class="mt-1 block w-full" wire:model.defer="smtp.username" />
                    <x-input-error for="smtp.username" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-4">
                    <x-label value="Wachtwoord" />
                    <x-input type="password" class="mt-1 block w-full" wire:model.defer="smtp.password" />
                    <x-input-error for="smtp.password" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-2">
                    <x-label value="Encryptie" />
                    <select class="mt-1 block w-full rounded-md border-gray-300 text-sm" wire:model.defer="smtp.encryption">
                        <option value="">Geen</option>
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                    </select>
                </div>

                <div class="col-span-6 sm:col-span-4">
                    <x-label value="From e-mail" />
                    <x-input type="email" class="mt-1 block w-full" wire:model.defer="smtp.from_address" />
                    <x-input-error for="smtp.from_address" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-4">
                    <x-label value="From naam" />
                    <x-input type="text" class="mt-1 block w-full" wire:model.defer="smtp.from_name" />
                    <x-input-error for="smtp.from_name" class="mt-2" />
                </div>

                <div class="col-span-6 sm:col-span-4">
                    <x-label value="Test e-mail naar" />
                    <x-input type="email" class="mt-1 block w-full" wire:model.defer="testEmail" />
                    <x-input-error for="testEmail" class="mt-2" />
                </div>
            </x-slot>

            <x-slot name="actions">
                <x-action-message class="me-3" on="saved">
                    {{ __('Opgeslagen.') }}
                </x-action-message>

                <x-secondary-button type="button" wire:click="sendTestEmail">
                    {{ __('Test mail') }}
                </x-secondary-button>

                <x-button class="ms-2">
                    {{ __('Opslaan') }}
                </x-button>
            </x-slot>
        </x-form-section>
    </div>

    <div class="mt-10 sm:mt-0">
        <x-form-section submit="saveTemplate">
            <x-slot name="title">
                {{ __('Welkomstmail template') }}
            </x-slot>

            <x-slot name="description">
                {{ __('Gebruik placeholders:') }}
                <div class="mt-2 flex flex-wrap gap-2 text-xs">
                    @foreach ($placeholders as $placeholder)
                        <span class="rounded-full bg-gray-100 px-2 py-1">{{ $placeholder }}</span>
                    @endforeach
                </div>
            </x-slot>

            <x-slot name="form">
                <div class="col-span-6">
                    <x-label value="Onderwerp" />
                    <x-input type="text" class="mt-1 block w-full" wire:model.defer="template.subject" />
                    <x-input-error for="template.subject" class="mt-2" />
                </div>

                <div class="col-span-6">
                    <x-label value="HTML template" />
                    <textarea class="mt-1 block w-full rounded-md border-gray-300 text-sm" rows="10" wire:model.defer="template.body_html"></textarea>
                    <x-input-error for="template.body_html" class="mt-2" />
                </div>

                <div class="col-span-6">
                    <x-label value="Tekst template" />
                    <textarea class="mt-1 block w-full rounded-md border-gray-300 text-sm" rows="10" wire:model.defer="template.body_text"></textarea>
                    <x-input-error for="template.body_text" class="mt-2" />
                </div>

                <div class="col-span-6">
                    <div class="text-xs font-semibold text-gray-500">Preview (HTML)</div>
                    <div class="mt-2 rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-700">
                        {!! $this->previewHtml !!}
                    </div>
                </div>

                <div class="col-span-6">
                    <div class="text-xs font-semibold text-gray-500">Preview (tekst)</div>
                    <pre class="mt-2 whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">{{ $this->previewText }}</pre>
                </div>
            </x-slot>

            <x-slot name="actions">
                <x-action-message class="me-3" on="saved">
                    {{ __('Opgeslagen.') }}
                </x-action-message>

                <x-button>
                    {{ __('Template opslaan') }}
                </x-button>
            </x-slot>
        </x-form-section>
    </div>
</div>
