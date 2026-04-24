<x-guest-layout>
    <x-authentication-card>
        <x-slot name="logo">
            <x-authentication-card-logo />
        </x-slot>

        <x-validation-errors class="mb-4" />

        @session('status')
            <div class="mb-4 font-medium text-sm text-green-600">
                {{ $value }}
            </div>
        @endsession

        <form method="POST" action="{{ route('login') }}">
            @csrf

            <div>
                <x-label for="email" value="{{ __('Email') }}" />
                <x-input id="email" class="block mt-1 w-full" type="email" name="email" :value="old('email')" required autofocus autocomplete="username" />
            </div>

            <div class="mt-4">
                <x-label for="password" value="{{ __('Password') }}" />
                <x-input id="password" class="block mt-1 w-full" type="password" name="password" required autocomplete="current-password" />
            </div>

            <div class="block mt-4">
                <label for="remember_me" class="flex items-center">
                    <x-checkbox id="remember_me" name="remember" />
                    <span class="ms-2 text-sm text-gray-600">{{ __('Remember me') }}</span>
                </label>
            </div>

            <div class="flex items-center justify-end mt-4">
                @if (Route::has('password.request'))
                    <a class="underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" href="{{ route('password.request') }}">
                        {{ __('Forgot your password?') }}
                    </a>
                @endif

                <x-button class="ms-4">
                    {{ __('Log in') }}
                </x-button>
            </div>
        </form>

        <div class="mt-6 border-t border-gray-200 pt-4">
            <div class="text-sm font-semibold text-gray-700">{{ __('Of log in met passkey') }}</div>
            <p class="mt-1 text-xs text-gray-500">{{ __('Gebruik hetzelfde e-mailadres en bevestig op je apparaat.') }}</p>

            <div class="mt-3 flex items-center gap-3">
                <x-secondary-button id="passkey-login-button" type="button">
                    {{ __('Log in met passkey') }}
                </x-secondary-button>
                <span id="passkey-login-status" class="text-xs text-gray-600"></span>
            </div>
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
            statusEl.classList.toggle('text-red-600', !!isError);
            statusEl.classList.toggle('text-gray-600', !isError);
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
                throw new Error(firstError || payload?.message || 'Passkey login mislukt.');
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

            button.disabled = true;
            setStatus('Passkey login starten...');

            try {
                const { startAuthentication } = await loadSimpleWebAuthn();
                const options = await jsonPost('{{ route('auth.passkeys.options') }}', { email });
                const credential = await startAuthentication({ optionsJSON: options });
                const result = await jsonPost('{{ route('auth.passkeys.verify') }}', { email, credential });

                setStatus('Inloggen gelukt, doorsturen...');
                window.location.href = result.redirect || '{{ route('dashboard') }}';
            } catch (error) {
                setStatus(error?.message || 'Passkey login mislukt.', true);
            } finally {
                button.disabled = false;
            }
        });
    })();
    </script>
</x-guest-layout>
