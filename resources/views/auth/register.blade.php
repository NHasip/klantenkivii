<x-guest-layout>
    <x-slot name="title">Registreren</x-slot>

    <x-authentication-card title="Account aanmaken">
        <x-validation-errors class="mb-5" />

        <form method="POST" action="{{ route('register') }}" class="space-y-4">
            @csrf

            <div>
                <x-label for="name" value="Naam" />
                <x-input id="name" class="mt-1 block w-full" type="text" name="name" :value="old('name')" required autofocus autocomplete="name" />
            </div>

            <div>
                <x-label for="email" value="E-mailadres" />
                <x-input id="email" class="mt-1 block w-full" type="email" name="email" :value="old('email')" required autocomplete="username" />
            </div>

            <div>
                <x-label for="password" value="Wachtwoord" />
                <x-input id="password" class="mt-1 block w-full" type="password" name="password" required autocomplete="new-password" />
            </div>

            <div>
                <x-label for="password_confirmation" value="Herhaal wachtwoord" />
                <x-input id="password_confirmation" class="mt-1 block w-full" type="password" name="password_confirmation" required autocomplete="new-password" />
            </div>

            @if (Laravel\Jetstream\Jetstream::hasTermsAndPrivacyPolicyFeature())
                <label for="terms" class="flex items-start gap-2 text-sm text-zinc-700">
                    <x-checkbox name="terms" id="terms" required class="mt-0.5" />
                    <span>
                        Ik ga akkoord met de
                        <a target="_blank" href="{{ route('terms.show') }}" class="rounded font-medium text-indigo-700 underline hover:text-indigo-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">voorwaarden</a>
                        en het
                        <a target="_blank" href="{{ route('policy.show') }}" class="rounded font-medium text-indigo-700 underline hover:text-indigo-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">privacybeleid</a>.
                    </span>
                </label>
            @endif

            <x-button class="h-10 w-full">
                Account aanmaken
            </x-button>
        </form>

        <p class="mt-6 text-center text-sm text-zinc-600">
            Al een account?
            <a class="rounded font-medium text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" href="{{ route('login') }}">Inloggen</a>
        </p>
    </x-authentication-card>
</x-guest-layout>
