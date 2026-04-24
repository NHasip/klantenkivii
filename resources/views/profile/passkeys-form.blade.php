@php
    $passkeysEnabled = false;
    $passkeys = collect();
    $passkeysError = null;

    try {
        $passkeysEnabled = \Illuminate\Support\Facades\Schema::hasTable('passkeys');
        if ($passkeysEnabled && auth()->check()) {
            $passkeys = auth()->user()->passkeys()->latest()->get();
        }
    } catch (\Throwable $e) {
        report($e);
        $passkeysEnabled = false;
        $passkeysError = 'Passkeys konden niet geladen worden.';
    }
@endphp

<x-action-section>
    <x-slot name="title">
        {{ __('Passkeys') }}
    </x-slot>

    <x-slot name="description">
        {{ __('Gebruik een passkey voor sneller en veiliger inloggen zonder wachtwoord.') }}
    </x-slot>

    <x-slot name="content">
        @if ($passkeysError)
            <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {{ $passkeysError }}
            </div>
        @endif

        @if ($passkeysEnabled)
            <h3 class="text-lg font-medium text-gray-900">
                {{ __('Ingestelde passkeys') }}
            </h3>

            <div class="mt-3 max-w-xl text-sm text-gray-600">
                <p>
                    {{ __('Je kunt meerdere passkeys opslaan (bijvoorbeeld telefoon, laptop of security key).') }}
                </p>
            </div>

            <div class="mt-4 space-y-3">
                @forelse ($passkeys as $passkey)
                    <div class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <div>
                            <div class="text-sm font-semibold text-gray-800">{{ $passkey->name ?: 'Passkey' }}</div>
                            <div class="text-xs text-gray-500">
                                {{ __('Toegevoegd') }}: {{ optional($passkey->created_at)->format('d-m-Y H:i') }}
                                @if ($passkey->last_used_at)
                                    | {{ __('Laatst gebruikt') }}: {{ optional($passkey->last_used_at)->format('d-m-Y H:i') }}
                                @endif
                            </div>
                        </div>
                        <form method="POST" action="{{ route('profile.passkeys.destroy', ['passkey' => $passkey->id]) }}">
                            @csrf
                            @method('DELETE')
                            <x-danger-button>
                                {{ __('Verwijderen') }}
                            </x-danger-button>
                        </form>
                    </div>
                @empty
                    <div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-600">
                        {{ __('Nog geen passkeys ingesteld.') }}
                    </div>
                @endforelse
            </div>

            <div class="mt-5 flex items-center gap-3">
                <x-button id="passkey-register-button" type="button">
                    {{ __('Passkey toevoegen') }}
                </x-button>
                <span id="passkey-register-status" class="text-sm text-gray-600"></span>
            </div>
        @else
            <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {{ __('Passkeys zijn nog niet beschikbaar. Draai eerst de nieuwste database migraties.') }}
            </div>
        @endif
    </x-slot>
</x-action-section>

@if ($passkeysEnabled)
    <script>
    (() => {
        let simpleWebAuthnPromise = null;

        const loadSimpleWebAuthn = async () => {
            if (!simpleWebAuthnPromise) {
                simpleWebAuthnPromise = import('https://cdn.jsdelivr.net/npm/@simplewebauthn/browser@13/+esm');
            }
            return simpleWebAuthnPromise;
        };

        const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        const jsonPost = async (url, body) => {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify(body ?? {}),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                const firstError = payload?.errors ? Object.values(payload.errors).flat()?.[0] : null;
                throw new Error(firstError || payload?.message || 'Passkey actie mislukt.');
            }

            return payload;
        };

        const statusEl = document.getElementById('passkey-register-status');
        const button = document.getElementById('passkey-register-button');
        if (!statusEl || !button) return;

        const setStatus = (message, isError = false) => {
            statusEl.textContent = message || '';
            statusEl.classList.toggle('text-red-600', !!isError);
            statusEl.classList.toggle('text-gray-600', !isError);
        };

        button.addEventListener('click', async () => {
            button.disabled = true;
            setStatus('Passkey registratie starten...');

            try {
                const { startRegistration } = await loadSimpleWebAuthn();
                const options = await jsonPost('{{ route('profile.passkeys.options') }}', {});
                const credential = await startRegistration({ optionsJSON: options });
                const name = window.prompt('Naam voor deze passkey (optioneel)', '') ?? '';

                await jsonPost('{{ route('profile.passkeys.store') }}', {
                    credential,
                    name,
                });

                setStatus('Passkey toegevoegd. Pagina wordt ververst...');
                window.location.reload();
            } catch (error) {
                setStatus(error?.message || 'Passkey kon niet worden toegevoegd.', true);
            } finally {
                button.disabled = false;
            }
        });
    })();
    </script>
@endif
