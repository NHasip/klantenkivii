<x-guest-layout>
    <x-slot name="title">Nieuw wachtwoord</x-slot>

    <x-authentication-card title="Nieuw wachtwoord instellen" description="Kies een sterk wachtwoord dat je nergens anders gebruikt.">
        <x-validation-errors class="mb-5" />

        <form method="POST" action="{{ route('password.update') }}" class="space-y-4">
            @csrf

            <input type="hidden" name="token" value="{{ $request->route('token') }}">

            <div>
                <x-label for="email" value="E-mailadres" />
                <x-input id="email" class="mt-1 block w-full" type="email" name="email" :value="old('email', $request->email)" required autofocus autocomplete="username" />
            </div>

            <div>
                <x-label for="password" value="Nieuw wachtwoord" />
                <x-input id="password" class="mt-1 block w-full" type="password" name="password" required autocomplete="new-password" />
            </div>

            <div>
                <x-label for="password_confirmation" value="Herhaal nieuw wachtwoord" />
                <x-input id="password_confirmation" class="mt-1 block w-full" type="password" name="password_confirmation" required autocomplete="new-password" />
            </div>

            <x-button class="h-10 w-full">
                Wachtwoord opslaan
            </x-button>
        </form>
    </x-authentication-card>
</x-guest-layout>
