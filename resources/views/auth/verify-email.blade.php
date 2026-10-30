<x-guest-layout>
    <x-slot name="title">E-mailadres bevestigen</x-slot>

    <x-authentication-card title="Bevestig je e-mailadres" description="We hebben je een e-mail met een bevestigingslink gestuurd. Geen e-mail ontvangen? Dan sturen we graag een nieuwe.">
        @if (session('status') == 'verification-link-sent')
            <div class="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" role="status">
                Er is een nieuwe bevestigingslink naar je e-mailadres gestuurd.
            </div>
        @endif

        <form method="POST" action="{{ route('verification.send') }}">
            @csrf
            <x-button type="submit" class="h-10 w-full">
                Bevestigingsmail opnieuw versturen
            </x-button>
        </form>

        <div class="mt-6 flex items-center justify-center gap-4 text-sm">
            <a href="{{ route('profile.show') }}" class="rounded font-medium text-zinc-600 hover:text-zinc-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">Profiel bewerken</a>

            <form method="POST" action="{{ route('logout') }}" class="inline">
                @csrf
                <button type="submit" class="rounded font-medium text-zinc-600 hover:text-zinc-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">Uitloggen</button>
            </form>
        </div>
    </x-authentication-card>
</x-guest-layout>
