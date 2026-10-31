<x-guest-layout>
    <x-slot name="title">Inloggen</x-slot>

    <x-authentication-card title="Inloggen" description="Welkom terug. Log in met je Kivii CRM-account.">
        <x-validation-errors class="mb-5" />

        @session('status')
            <div class="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" role="status">
                {{ $value }}
            </div>
        @endsession

        <form method="POST" action="{{ route('login') }}" class="space-y-4">
            @csrf

            <div>
                <x-label for="email" value="E-mailadres" />
                <x-input id="email" class="mt-1 block w-full" type="email" name="email" :value="old('email')" required autofocus autocomplete="username" inputmode="email" />
            </div>

            <div>
                <div class="flex items-center justify-between gap-3">
                    <x-label for="password" value="Wachtwoord" />
                    @if (Route::has('password.request'))
                        <a class="tap-link rounded text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" href="{{ route('password.request') }}">
                            Wachtwoord vergeten?
                        </a>
                    @endif
                </div>
                <x-input id="password" class="mt-1 block w-full" type="password" name="password" required autocomplete="current-password" />
            </div>

            <label for="remember_me" class="flex w-fit cursor-pointer items-center gap-2">
                <x-checkbox id="remember_me" name="remember" />
                <span class="text-sm text-zinc-700">Ingelogd blijven</span>
            </label>

            <x-button class="h-10 w-full">
                Inloggen
            </x-button>
        </form>

        <div class="my-6 flex items-center gap-3" aria-hidden="true">
            <div class="h-px flex-1 bg-zinc-200"></div>
            <span class="text-xs font-medium text-zinc-400">of</span>
            <div class="h-px flex-1 bg-zinc-200"></div>
        </div>

        <div>
            <x-secondary-button id="passkey-login-button" type="button" class="h-10 w-full">
                <svg class="h-4 w-4 text-zinc-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8 7a5 5 0 113.61 4.804l-1.903 1.903A1 1 0 019 14H8v1a1 1 0 01-1 1H6v1a1 1 0 01-1 1H3a1 1 0 01-1-1v-2a1 1 0 01.293-.707L8.196 8.39A5.002 5.002 0 018 7zm5-3a.75.75 0 000 1.5A1.5 1.5 0 0114.5 7 .75.75 0 0016 7a3 3 0 00-3-3z" clip-rule="evenodd" /></svg>
                Inloggen met passkey
            </x-secondary-button>
            <p class="mt-2 text-center text-xs text-zinc-500">Vul eerst je e-mailadres in en bevestig daarna op je apparaat.</p>
            <p id="passkey-login-status" class="mt-2 min-h-[1rem] text-center text-xs text-zinc-600" role="status" aria-live="polite"></p>
        </div>
    </x-authentication-card>

    <script>
    (() => {
        let simpleWebAuthnPromise = null;
        const button = document.getElementById('passkey-login-button');
        const statusEl = document.getElementById('passkey-login-status');
        const emailEl = document.getElementById('email');
        if (!button || !statusEl || !emailEl) return;

        const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        const loadSimpleWebAuthn = async () => {
            if (!simpleWebAuthnPromise) {
                simpleWebAuthnPromise = import('https://cdn.jsdelivr.net/npm/@simplewebauthn/browser@13/+esm');
            }
            return simpleWebAuthnPromise;
        };

        const setStatus = (message, isError = false) => {
            statusEl.textContent = message || '';
            statusEl.classList.toggle('text-rose-700', !!isError);
            statusEl.classList.toggle('font-medium', !!isError);
            statusEl.classList.toggle('text-zinc-600', !isError);
        };

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
                throw new Error(firstError || payload?.message || 'Inloggen met passkey mislukt.');
            }

            return payload;
        };

        button.addEventListener('click', async () => {
            const email = (emailEl.value || '').trim();
            if (!email) {
                setStatus('Vul eerst je e-mailadres in.', true);
                emailEl.focus();
                return;
            }

            if (!window.PublicKeyCredential) {
                setStatus('Deze browser ondersteunt geen passkeys.', true);
                return;
            }

            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            setStatus('Passkey-login starten...');

            try {
                const { startAuthentication } = await loadSimpleWebAuthn();
                const options = await jsonPost('{{ route('auth.passkeys.options') }}', { email });
                const credential = await startAuthentication({ optionsJSON: options });
                const result = await jsonPost('{{ route('auth.passkeys.verify') }}', { email, credential });

                setStatus('Inloggen gelukt, doorsturen...');
                window.location.href = result.redirect || '{{ route('dashboard') }}';
            } catch (error) {
                setStatus(error?.name === 'NotAllowedError' ? 'Passkey-login geannuleerd of verlopen. Probeer het opnieuw.' : (error?.message || 'Inloggen met passkey mislukt.'), true);
            } finally {
                button.disabled = false;
                button.removeAttribute('aria-busy');
            }
        });
    })();
    </script>
</x-guest-layout>
