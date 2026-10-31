<div class="space-y-6">
    <section class="card overflow-hidden" aria-labelledby="mail-title">
        <div class="card-body">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex min-w-0 items-start gap-3">
                    <span class="icon-tile h-10 w-10 bg-sky-50 text-sky-700" aria-hidden="true"><x-icon name="mail" class="h-5 w-5" /></span>
                    <div class="min-w-0">
                    <h3 id="mail-title" class="section-heading">Systeem-e-mail</h3>
                    <p class="section-description">Alle uitgaande mails van het CRM gaan via Microsoft 365 vanuit {{ $sender }}. Er wordt nooit via de hosting (SMTP) verstuurd.</p>
                    </div>
                </div>
                @if ($graphConfigured)
                    <x-badge tone="success" dot>Ingesteld</x-badge>
                @else
                    <x-badge tone="warning" dot>Niet ingesteld</x-badge>
                @endif
            </div>

            <dl class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <dt class="text-sm font-medium text-zinc-500">Verzending</dt>
                    <dd class="mt-1 text-sm text-zinc-900">
                        Verzending via Microsoft 365 ({{ $sender }}):
                        <span class="font-semibold {{ $graphConfigured ? 'text-emerald-700' : 'text-amber-700' }}">{{ $graphConfigured ? 'ingesteld' : 'niet ingesteld' }}</span>
                    </dd>
                </div>
                <div>
                    <dt class="text-sm font-medium text-zinc-500">Afzender</dt>
                    <dd class="mt-1 text-sm text-zinc-900">{{ $senderName }} &lt;{{ $sender }}&gt;, kopie in Verzonden items</dd>
                </div>
            </dl>

            @unless ($graphConfigured)
                <div class="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
                    <x-icon name="alert-triangle" class="mt-0.5 h-4 w-4 text-amber-600" />
                    <p>Zonder koppeling worden er geen mails verstuurd (welkomstmails, herinneringen, wachtwoordherstel). Stel <code class="rounded bg-white/70 px-1">MSGRAPH_TENANT_ID</code>, <code class="rounded bg-white/70 px-1">MSGRAPH_CLIENT_ID</code> en <code class="rounded bg-white/70 px-1">MSGRAPH_CLIENT_SECRET</code> in op de server. Zie docs/MAIL_MICROSOFT365.md.</p>
                </div>
            @endunless

            <div class="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                <x-label for="mail_test_email" value="Testmail versturen naar" />
                <p class="field-hint mt-0.5">Verstuurt een testmail via Microsoft 365 vanuit {{ $sender }}.</p>
                <form wire:submit.prevent="sendTestEmail" class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                    <div class="min-w-0 flex-1 sm:max-w-md">
                        <x-input id="mail_test_email" type="email" class="block w-full" wire:model="testEmail" autocomplete="email" />
                        <x-input-error for="testEmail" class="mt-1" />
                    </div>
                    <x-secondary-button type="submit" wire:loading.attr="disabled" wire:target="sendTestEmail" :disabled="! $graphConfigured">
                        <x-icon name="mail" class="h-4 w-4" />
                        <span wire:loading.remove wire:target="sendTestEmail">Testmail sturen</span>
                        <span wire:loading wire:target="sendTestEmail">Versturen...</span>
                    </x-secondary-button>
                </form>
                <x-action-message class="mt-2" on="test-mail-sent">Testmail verstuurd.</x-action-message>
                @if ($emailLogUrl)
                    <p class="field-hint mt-2">Mislukte mails zie je in het <a href="{{ $emailLogUrl }}" class="rounded font-medium text-indigo-700 underline hover:text-indigo-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">e-maillog</a>.</p>
                @endif
            </div>
        </div>
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
