<x-action-section>
    <x-slot name="title">Tweestapsverificatie (2FA)</x-slot>

    <x-slot name="description">Extra beveiliging: naast je wachtwoord vul je bij het inloggen een code uit je authenticator-app in.</x-slot>

    <x-slot name="aside">
        @if ($this->enabled && ! $showingConfirmation)
            <x-badge tone="success" dot>Aan</x-badge>
        @elseif ($this->enabled)
            <x-badge tone="warning" dot>Nog bevestigen</x-badge>
        @else
            <x-badge dot>Uit</x-badge>
        @endif
    </x-slot>

    <x-slot name="content">
        @php
            $tfaState = ! $this->enabled ? 'off' : ($showingConfirmation ? 'pending' : 'on');
        @endphp
        <div @class([
            'flex items-start gap-3 rounded-xl border px-4 py-3.5',
            'border-emerald-200 bg-emerald-50/70' => $tfaState === 'on',
            'border-amber-200 bg-amber-50/70' => $tfaState === 'pending',
            'border-zinc-200 bg-zinc-50' => $tfaState === 'off',
        ])>
            <span @class([
                'icon-tile h-9 w-9 rounded-lg',
                'bg-emerald-100 text-emerald-700' => $tfaState === 'on',
                'bg-amber-100 text-amber-700' => $tfaState === 'pending',
                'bg-white text-zinc-500 ring-1 ring-inset ring-zinc-200' => $tfaState === 'off',
            ]) aria-hidden="true">
                <x-icon :name="$tfaState === 'on' ? 'check-circle' : ($tfaState === 'pending' ? 'clock' : 'shield')" class="h-5 w-5" />
            </span>
            <div class="min-w-0">
                <p class="text-sm font-semibold text-zinc-900">
                    @if ($tfaState === 'pending')
                        Rond het inschakelen van tweestapsverificatie af.
                    @elseif ($tfaState === 'on')
                        Tweestapsverificatie staat aan.
                    @else
                        Tweestapsverificatie staat nog uit.
                    @endif
                </p>
                <p class="mt-0.5 max-w-xl text-sm leading-6 text-zinc-600">
                    Met 2FA vraagt het CRM bij het inloggen om een veilige, willekeurige code. Die code vind je in een authenticator-app op je telefoon, zoals Google Authenticator of Microsoft Authenticator.
                </p>
            </div>
        </div>

        @if ($this->enabled)
            @if ($showingQrCode)
                <div class="mt-5 rounded-xl border border-zinc-200 p-4 sm:p-5">
                    <p class="max-w-xl text-sm font-medium text-zinc-800">
                        @if ($showingConfirmation)
                            Scan de QR-code met je authenticator-app (of vul de sleutel handmatig in) en vul daarna de code uit de app in.
                        @else
                            Tweestapsverificatie staat aan. Scan de QR-code met je authenticator-app of vul de sleutel handmatig in.
                        @endif
                    </p>

                    <div class="mt-4 flex flex-wrap items-start gap-5">
                        <div class="inline-block rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
                            {!! $this->user->twoFactorQrCodeSvg() !!}
                        </div>

                        <div class="min-w-0 space-y-4">
                            <div>
                                <p class="text-xs font-medium text-zinc-500">Sleutel</p>
                                <p class="mt-1 select-all break-all rounded-lg bg-zinc-50 px-2.5 py-1.5 font-mono text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200">{{ decrypt($this->user->two_factor_secret) }}</p>
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
                    <p class="flex max-w-xl items-start gap-2 text-sm font-medium text-zinc-800">
                        <x-icon name="alert-triangle" class="mt-0.5 h-4 w-4 text-amber-600" />
                        Bewaar deze herstelcodes op een veilige plek, bijvoorbeeld in je wachtwoordmanager. Je hebt ze nodig als je je telefoon kwijt bent.
                    </p>

                    <div class="mt-3 grid max-w-xl gap-x-6 gap-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm text-zinc-900 sm:grid-cols-2">
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
                    <x-icon name="shield" class="h-4 w-4" />
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
                    <button type="button" class="btn btn-danger-ghost"
                            wire:click="disableTwoFactorAuthentication" wire:confirm="Weet je zeker dat je tweestapsverificatie wilt uitschakelen?" wire:loading.attr="disabled">
                        2FA uitschakelen
                    </button>
                @endif
            @endif
        </div>
    </x-slot>
</x-action-section>
