<x-guest-layout>
    <x-slot name="title">Wachtwoord bevestigen</x-slot>

    <x-authentication-card title="Wachtwoord bevestigen" description="Dit is een beveiligd onderdeel. Bevestig je wachtwoord om verder te gaan.">
        <x-validation-errors class="mb-5" />

        <form method="POST" action="{{ route('password.confirm') }}" class="space-y-4">
            @csrf

            <div>
                <x-label for="password" value="Wachtwoord" />
                <x-input id="password" class="mt-1 block w-full" type="password" name="password" required autocomplete="current-password" autofocus />
            </div>

            <x-button class="h-10 w-full">
                Bevestigen
            </x-button>
        </form>
    </x-authentication-card>
</x-guest-layout>
