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
                    <x-input id="smtp_host" type="text" class="mt-1 block w-full" wire:model.defer="smtp.host" placeholder="smtp.office365.com" />
                    <x-input-error for="smtp.host" class="mt-2" />
                </div>

                <div>
                    <x-label for="smtp_port" value="Poort" />
                    <x-input id="smtp_port" type="number" class="mt-1 block w-full" wire:model.defer="smtp.port" />
                    <x-input-error for="smtp.port" class="mt-2" />
                </div>

                <div>
                    <x-label for="smtp_encryption" value="Encryptie" />
                    <select id="smtp_encryption" class="mt-1 block w-full rounded-md border-gray-300 text-sm" wire:model.defer="smtp.encryption">
                        <option value="">Geen</option>
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                    </select>
                    <x-input-error for="smtp.encryption" class="mt-2" />
                </div>

                <div class="lg:col-span-2">
                    <x-label for="smtp_username" value="Gebruikersnaam" />
                    <x-input id="smtp_username" type="text" class="mt-1 block w-full" wire:model.defer="smtp.username" />
                    <x-input-error for="smtp.username" class="mt-2" />
                </div>

                <div class="lg:col-span-2">
                    <x-label for="smtp_password" value="Wachtwoord" />
                    <x-input id="smtp_password" type="password" class="mt-1 block w-full" wire:model.defer="smtp.password" autocomplete="new-password" />
                    <x-input-error for="smtp.password" class="mt-2" />
                </div>

                <div class="lg:col-span-2">
                    <x-label for="smtp_from_address" value="Afzender e-mail" />
                    <x-input id="smtp_from_address" type="email" class="mt-1 block w-full" wire:model.defer="smtp.from_address" />
                    <x-input-error for="smtp.from_address" class="mt-2" />
                </div>

                <div class="lg:col-span-2">
                    <x-label for="smtp_from_name" value="Afzender naam" />
                    <x-input id="smtp_from_name" type="text" class="mt-1 block w-full" wire:model.defer="smtp.from_name" />
                    <x-input-error for="smtp.from_name" class="mt-2" />
                </div>
            </div>

            <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <x-label for="smtp_test_email" value="Test e-mail versturen naar" />
                <x-input id="smtp_test_email" type="email" class="mt-1 block w-full sm:max-w-md" wire:model.defer="testEmail" />
                <x-input-error for="testEmail" class="mt-2" />
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <x-action-message class="me-2" on="smtp-saved">
                    {{ __('Opgeslagen.') }}
                </x-action-message>

                <x-secondary-button type="button" wire:click="sendTestEmail" wire:loading.attr="disabled" wire:target="sendTestEmail">
                    {{ __('Test mail sturen') }}
                </x-secondary-button>

                <x-button wire:loading.attr="disabled" wire:target="saveSmtp">
                    {{ __('SMTP opslaan') }}
                </x-button>
            </div>
        </form>
    </section>

    <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h3 class="text-base font-semibold text-gray-900">E-mail templates</h3>
                <p class="mt-1 text-sm text-gray-600">
                    Maak hier zelf templates aan en sla ze op. Deze zijn daarna direct beschikbaar bij verzenden.
                </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                @if ($advancedTemplatesUrl)
                    <a
                        href="{{ $advancedTemplatesUrl }}"
                        class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Geavanceerd beheer
                    </a>
                @endif
                <x-button type="button" wire:click="newTemplate">
                    {{ __('Nieuwe template') }}
                </x-button>
            </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[280px,minmax(0,1fr)]">
            <aside class="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Templatebibliotheek</div>
                <div class="mt-3 space-y-2">
                    @forelse ($templateItems as $item)
                        <button
                            type="button"
                            wire:click="selectTemplate({{ $item['id'] }})"
                            class="@if($editingTemplateId === $item['id']) bg-gray-900 text-white @else bg-white text-gray-700 hover:bg-gray-100 @endif w-full rounded-md border border-gray-200 px-3 py-2 text-left transition"
                        >
                            <div class="text-sm font-semibold">{{ $item['name'] }}</div>
                            <div class="@if($editingTemplateId === $item['id']) text-gray-200 @else text-gray-500 @endif mt-1 text-xs">
                                {{ $item['subject'] ?: 'Geen onderwerp' }}
                            </div>
                        </button>
                    @empty
                        <div class="rounded-md border border-dashed border-gray-300 bg-white px-3 py-3 text-xs text-gray-500">
                            Nog geen templates gevonden.
                        </div>
                    @endforelse
                </div>
            </aside>

            <form wire:submit.prevent="saveTemplate" class="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <x-label for="template_name" value="Template naam" />
                        <x-input id="template_name" type="text" class="mt-1 block w-full" wire:model.defer="templateForm.name" placeholder="Bijv. Herinnering factuur" />
                        <x-input-error for="templateForm.name" class="mt-2" />
                    </div>

                    <div>
                        <x-label for="template_subject" value="Onderwerp" />
                        <x-input id="template_subject" type="text" class="mt-1 block w-full" wire:model.defer="templateForm.subject" />
                        <x-input-error for="templateForm.subject" class="mt-2" />
                    </div>
                </div>

                <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Beschikbare placeholders</div>
                    <div class="mt-2 flex flex-wrap gap-2">
                        @foreach ($placeholders as $placeholder)
                            <span class="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700">
                                {{ $placeholder }}
                            </span>
                        @endforeach
                    </div>
                </div>

                <div>
                    <x-label for="template_body_text" value="Bericht (tekst)" />
                    <textarea
                        id="template_body_text"
                        class="mt-1 block w-full rounded-md border-gray-300 text-sm"
                        rows="12"
                        wire:model.defer="templateForm.body_text"
                    ></textarea>
                    <x-input-error for="templateForm.body_text" class="mt-2" />
                </div>

                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" class="rounded border-gray-300 text-gray-800" wire:model.defer="templateForm.is_active">
                    Template actief
                </label>

                <div class="flex flex-wrap items-center gap-2">
                    <x-action-message class="me-2" on="template-saved">
                        {{ __('Opgeslagen.') }}
                    </x-action-message>
                    <x-action-message class="me-2" on="template-deleted">
                        {{ __('Verwijderd.') }}
                    </x-action-message>

                    <x-danger-button
                        type="button"
                        wire:click="deleteTemplate"
                        wire:loading.attr="disabled"
                        wire:target="deleteTemplate"
                        @if(! $editingTemplateId || $editingTemplateIsSystem) disabled @endif
                        onclick="if(!confirm('Weet je zeker dat je deze template wilt verwijderen?')) return false;"
                    >
                        Template verwijderen
                    </x-danger-button>

                    <x-button wire:loading.attr="disabled" wire:target="saveTemplate">
                        {{ $editingTemplateId ? 'Template opslaan' : 'Template aanmaken' }}
                    </x-button>
                </div>

                @if ($editingTemplateIsSystem)
                    <p class="text-xs text-gray-500">
                        Dit is een standaard template en kan niet verwijderd worden.
                    </p>
                @endif
            </form>
        </div>
    </section>
</div>
