<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'Laravel') }}</title>
        <meta name="theme-color" content="#aec22b">
        <link rel="icon" type="image/png" href="{{ asset('brand/favicon.png') }}">
        <link rel="apple-touch-icon" href="{{ asset('brand/favicon.png') }}">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])

        <!-- Styles -->
        @livewireStyles
    </head>
    <body>
        <div class="font-sans text-gray-900 antialiased">
            {{ $slot }}
        </div>

        @livewireScriptConfig
        @livewireScripts
        <script data-navigate-once>
            document.addEventListener('DOMContentLoaded', () => {
                if (window.Livewire && typeof window.Livewire.start === 'function' && !window.Livewire.initialRenderIsFinished) {
                    window.Livewire.start();
                }
            });
        </script>
    </body>
</html>
