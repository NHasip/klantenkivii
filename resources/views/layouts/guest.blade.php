<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
    <head>
        @include('layouts.partials.head')
        <title>{{ isset($title) && trim((string) $title) !== '' ? trim((string) $title).' - Kivii CRM' : 'Kivii CRM' }}</title>

        @vite(['resources/css/app.css', 'resources/js/app.js'])
        @livewireStyles
    </head>
    <body class="min-h-full bg-canvas font-sans text-zinc-900 antialiased">
        {{ $slot }}

        @livewireScripts
    </body>
</html>
