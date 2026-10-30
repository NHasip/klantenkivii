<x-action-section>
    <x-slot name="title">Tweestapsverificatie (2FA)</x-slot>

    <x-slot name="description">Extra beveiliging: naast je wachtwoord vul je bij het inloggen een code uit je authenticator-app in.</x-slot>

    <x-slot name="aside">
        @if ($this->enabled && ! $showingConfirmation)
            <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">Aan</span>
        @elseif ($this->enabled)
            <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">Nog bevestigen</span>
        @else
            <span class="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200">Uit</span>
        @endif
    </x-slot>

    <x-slot name="content">
        <p class="text-sm font-semibold text-zinc-900">
            @if ($this->enabled)
                @if ($showingConfirmation)
                    Rond het inschakelen van tweestapsverificatie af.
                @else
                    Tweestapsverificatie staat aan.
                @endif
            @else
                Tweestapsverificatie staat nog uit.
            @endif
        </p>

        <p class="mt-1 max-w-xl text-sm text-zinc-600">
            Met 2FA vraagt het CRM bij het inloggen om een veilige, willekeurige code. Die code vind je in een authenticator-app op je telefoon, zoals Google Authenticator of Microsoft Authenticator.
        </p>

        @if ($this->enabled)
            @if ($showingQrCode)
                <div class="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p class="max-w-xl text-sm font-medium text-zinc-800">
                        @if ($showingConfirmation)
                            Scan de QR-code met je authenticator-app (of vul de sleutel handmatig in) en vul daarna de code uit de app in.
                        @else
                            Tweestapsverificatie staat aan. Scan de QR-code met je authenticator-app of vul de sleutel handmatig in.
                        @endif
                    </p>

                    <div class="mt-4 flex flex-wrap items-start gap-5">
                        <div class="inline-block rounded-lg bg-white p-2 ring-1 ring-zinc-200">
                            {!! $this->user->twoFactorQrCodeSvg() !!}
                        </div>

                        <div class="min-w-0 space-y-4">
                            <div>
                                <p class="text-xs font-medium uppercase tracking-wide text-zinc-500">Sleutel</p>
                                <p class="mt-1 select-all break-all font-mono text-sm text-zinc-900">{{ decrypt($this->user->two_factor_secret) }}</p>
                            </div>

                            @if ($showingConfirmation)
                                <div>
                                    <x-label for="code" value="Code uit de app" />
                                    <x-input id="code" type="text" name="code" class="mt-1 block w-40 text-center font-mono tracking-[0.3em]" inputmode="numeric" autofocus autocomplete="one-time-code"
                                        wire:model="code"
                                        wire:keydown.enter="confirmTwoFactorAuthentication" />
                                    <x-input-error for="code" class="mt-1" />
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
            @endif

            @if ($showingRecoveryCodes)
                <div class="mt-5">
                    <p class="max-w-xl text-sm font-medium text-zinc-800">
                        Bewaar deze herstelcodes op een veilige plek, bijvoorbeeld in je wachtwoordmanager. Je hebt ze nodig als je je telefoon kwijt bent.
                    </p>

                    <div class="mt-3 grid max-w-xl gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm text-zinc-900 sm:grid-cols-2">
                        @foreach (json_decode(decrypt($this->user->two_factor_recovery_codes), true) as $code)
                            <div class="select-all">{{ $code }}</div>
                        @endforeach
                    </div>
                </div>
            @endif
        @endif

        <div class="mt-5 flex flex-wrap items-center gap-2">
            @if (! $this->enabled)
                <x-button type="button" wire:click="enableTwoFactorAuthentication" wire:loading.attr="disabled" wire:target="enableTwoFactorAuthentication">
                    2FA inschakelen
                </x-button>
            @else
                @if ($showingRecoveryCodes)
                    <x-secondary-button wire:click="regenerateRecoveryCodes" wire:loading.attr="disabled">
                        Nieuwe herstelcodes maken
                    </x-secondary-button>
                @elseif ($showingConfirmation)
                    <x-button type="button" wire:click="confirmTwoFactorAuthentication" wire:loading.attr="disabled" wire:target="confirmTwoFactorAuthentication">
                        Bevestigen
                    </x-button>
                @else
                    <x-secondary-button wire:click="showRecoveryCodes" wire:loading.attr="disabled">
                        Herstelcodes tonen
                    </x-secondary-button>
                @endif

                @if ($showingConfirmation)
                    <x-secondary-button wire:click="disableTwoFactorAuthentication" wire:loading.attr="disabled">
                        Annuleren
                    </x-secondary-button>
                @else
                    <button type="button" class="inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:opacity-50"
                            wire:click="disableTwoFactorAuthentication" wire:confirm="Weet je zeker dat je tweestapsverificatie wilt uitschakelen?" wire:loading.attr="disabled">
                        2FA uitschakelen
                    </button>
                @endif
            @endif
        </div>
    </x-slot>
</x-action-section>
