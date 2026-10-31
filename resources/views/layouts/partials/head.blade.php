{{-- Gedeelde <head>-basis voor alle layouts (Inertia, Livewire, Jetstream en gast). --}}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="csrf-token" content="{{ csrf_token() }}">
<meta name="theme-color" content="#aec22b">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" type="image/png" href="{{ asset('brand/favicon.png') }}">

{{-- Installeerbaar als app op het beginscherm (PWA / iOS). --}}
<link rel="manifest" href="{{ asset('manifest.webmanifest') }}">
<link rel="apple-touch-icon" sizes="180x180" href="{{ asset('icons/apple-touch-icon.png') }}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Kivii">
<meta name="application-name" content="Kivii CRM">

@production
    {{-- Service worker: cachet alleen statische /build-assets, nooit HTML of API-antwoorden. --}}
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
            });
        }
    </script>
@endproduction
