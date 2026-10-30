<x-guest-layout>
    <x-slot name="title">Wachtwoord vergeten</x-slot>

    <x-authentication-card title="Wachtwoord vergeten" description="Vul je e-mailadres in. Je ontvangt een link om een nieuw wachtwoord in te stellen.">
        @session('status')
            <div class="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" role="status">
                {{ $value }}
            </div>
        @endsession

        <x-validation-errors class="mb-5" />

        <form method="POST" action="{{ route('password.email') }}" class="space-y-4">
            @csrf

            <div>
                <x-label for="email" value="E-mailadres" />
                <x-input id="email" class="mt-1 block w-full" type="email" name="email" :value="old('email')" required autofocus autocomplete="username" inputmode="email" />
            </div>

            <x-button class="h-10 w-full">
                Herstellink versturen
            </x-button>
        </form>

        <p class="mt-6 text-center text-sm text-zinc-600">
            <a href="{{ route('login') }}" class="rounded font-medium text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">&larr; Terug naar inloggen</a>
        </p>
    </x-authentication-card>
</x-guest-layout>
