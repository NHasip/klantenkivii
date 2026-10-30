<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
    <head>
        @include('layouts.partials.head')
        <title>{{ isset($title) && trim((string) $title) !== '' ? trim((string) $title).' - Kivii CRM' : 'Kivii CRM' }}</title>

        @vite(['resources/css/app.css', 'resources/js/app.js'])
        @livewireStyles
    </head>
    <body class="min-h-full bg-zinc-50 font-sans text-zinc-900 antialiased">
        <a href="#hoofdinhoud" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg focus:ring-2 focus:ring-indigo-600">Naar inhoud</a>
        <x-banner />

        <div class="min-h-screen">
            @livewire('navigation-menu')

            <main id="hoofdinhoud" tabindex="-1" class="mx-auto max-w-7xl px-4 py-6 focus:outline-none sm:px-6 sm:py-8 lg:px-8">
                @include('layouts.partials.status', ['statusClass' => 'mb-6'])

                @if (isset($header))
                    <div class="mb-6">
                        {{ $header }}
                    </div>
                @endif

                {{ $slot }}
            </main>
        </div>

        @stack('modals')

        @livewireScripts
    </body>
</html>
