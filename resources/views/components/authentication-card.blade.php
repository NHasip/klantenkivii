@props(['title' => null, 'description' => null])

{{-- Inlogscherm: merkpaneel links (vanaf lg), formulier rechts. Op mobiel alleen het formulier. --}}
<div class="flex min-h-screen">
    <aside class="relative hidden w-[44%] max-w-xl overflow-hidden bg-indigo-900 lg:flex lg:flex-col lg:justify-between lg:p-12" aria-hidden="true">
        <div class="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-indigo-700/40 blur-3xl"></div>

        <img src="{{ asset('brand/kivii-logo.png') }}" alt="" class="relative h-12 w-auto self-start" />

        <div class="relative">
            <p class="text-3xl font-semibold leading-tight tracking-tight text-white">Klanten, demo's en incasso op een plek.</p>
            <p class="mt-4 max-w-md text-base leading-relaxed text-indigo-100">Het CRM voor het Kivii-team: overzicht over garagebedrijven, taken en afspraken.</p>
        </div>

        <p class="relative text-sm text-indigo-200">&copy; {{ now()->year }} Kivii</p>
    </aside>

    <div class="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div class="w-full max-w-sm">
            <div class="mb-8 lg:hidden">
                @isset($logo)
                    {{ $logo }}
                @else
                    <x-authentication-card-logo />
                @endisset
            </div>

            @if ($title)
                <h1 class="text-2xl font-semibold tracking-tight text-zinc-900">{{ $title }}</h1>
            @endif
            @if ($description)
                <p class="mt-1.5 text-sm text-zinc-500">{{ $description }}</p>
            @endif

            <div @class(['mt-6' => $title || $description])>
                {{ $slot }}
            </div>
        </div>
    </div>
</div>
