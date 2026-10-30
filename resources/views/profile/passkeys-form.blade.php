@php
    $passkeysEnabled = \Illuminate\Support\Facades\Schema::hasTable('passkeys');
    $passkeys = $passkeysEnabled ? auth()->user()->passkeys()->latest()->get() : collect();
@endphp

<x-action-section>
    <x-slot name="title">Passkeys</x-slot>

    <x-slot name="description">Log sneller en veiliger in zonder wachtwoord, met je telefoon, laptop of beveiligingssleutel.</x-slot>

    @if ($passkeysEnabled && $passkeys->isNotEmpty())
        <x-slot name="aside">
            <span class="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200">{{ $passkeys->count() }} ingesteld</span>
        </x-slot>
    @endif

    <x-slot name="content">
        @if ($passkeysEnabled)
            @if ($passkeys->isNotEmpty())
                <ul class="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                    @foreach ($passkeys as $passkey)
                        <li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <div class="min-w-0">
                                <div class="truncate text-sm font-semibold text-zinc-900">{{ $passkey->name ?: 'Passkey' }}</div>
                                <div class="text-xs text-zinc-500">
                                    Toegevoegd {{ optional($passkey->created_at)->format('d-m-Y H:i') }}
                                    @if ($passkey->last_used_at)
                                        · Laatst gebruikt {{ optional($passkey->last_used_at)->format('d-m-Y H:i') }}
                                    @endif
                                </div>
                            </div>
                            <form method="POST" action="{{ route('profile.passkeys.destroy', ['passkey' => $passkey->id]) }}" onsubmit="return confirm('Weet je zeker dat je deze passkey wilt verwijderen?')">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600" aria-label="Passkey {{ $passkey->name ?: '' }} verwijderen">
                                    Verwijderen
                                </button>
                            </form>
                        </li>
                    @endforeach
                </ul>
            @else
                <div class="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-6 text-center">
                    <p class="text-sm font-semibold text-zinc-800">Nog geen passkeys</p>
                    <p class="mt-1 text-sm text-zinc-500">Voeg er een toe om voortaan met je vingerafdruk, gezicht of pincode in te loggen.</p>
                </div>
            @endif

            <div class="mt-5 flex flex-wrap items-center gap-3">
                <x-button id="passkey-register-button" type="button">
                    Passkey toevoegen
                </x-button>
                <span id="passkey-register-status" class="text-sm text-zinc-600" role="status" aria-live="polite"></span>
            </div>
        @else
            <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Passkeys zijn nog niet beschikbaar. Draai eerst de nieuwste databasemigraties.
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
                throw new Error(firstError || payload?.message || 'Passkey-actie mislukt.');
            }

            return payload;
        };

        const statusEl = document.getElementById('passkey-register-status');
        const button = document.getElementById('passkey-register-button');
        if (!statusEl || !button) return;

        const setStatus = (message, isError = false) => {
            statusEl.textContent = message || '';
            statusEl.classList.toggle('text-rose-700', !!isError);
            statusEl.classList.toggle('text-zinc-600', !isError);
        };

        button.addEventListener('click', async () => {
            if (!window.PublicKeyCredential) {
                setStatus('Deze browser ondersteunt geen passkeys.', true);
                return;
            }

            button.disabled = true;
            setStatus('Passkey toevoegen...');

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
                setStatus(error?.name === 'NotAllowedError' ? 'Toevoegen geannuleerd of verlopen.' : (error?.message || 'Passkey kon niet worden toegevoegd.'), true);
            } finally {
                button.disabled = false;
            }
        });
    })();
    </script>
@endif
