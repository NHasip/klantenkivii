<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ isset($title) && trim((string) $title) !== '' ? trim((string) $title).' - Kivii CRM' : 'Kivii CRM' }}</title>
        <meta name="theme-color" content="#aec22b">
        <link rel="icon" type="image/png" href="{{ asset('brand/favicon.png') }}">
        <link rel="apple-touch-icon" href="{{ asset('brand/favicon.png') }}">

        <!-- Scripts -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])

        <!-- Styles -->
        @livewireStyles
    </head>
    <body class="min-h-screen bg-zinc-50 text-zinc-900">
        <x-banner />

        <div class="min-h-screen">
            @livewire('navigation-menu')

            <!-- Page Heading -->
            @if (isset($header))
                <div class="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
                    {{ $header }}
                </div>
            @endif

            @if (session('status'))
                <div class="max-w-7xl mx-auto px-4 pt-6 sm:px-6 lg:px-8">
                    <div x-data="{ show: true }" x-show="show" role="status" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <div class="flex items-start justify-between gap-3">
                            <div>{{ session('status') }}</div>
                            <button type="button" class="rounded text-emerald-700 hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" @click="show = false">Sluiten</button>
                        </div>
                    </div>
                </div>
            @endif

            <!-- Page Content -->
            <main>
                {{ $slot }}
            </main>
        </div>

        @stack('modals')

        @livewireScripts
    </body>
</html>
