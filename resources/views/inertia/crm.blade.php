<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#aec22b">
    <link rel="icon" type="image/png" href="{{ asset('brand/favicon.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('brand/favicon.png') }}">

    {{-- Inertia root view (React) --}}
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @inertiaHead
    @livewireStyles
</head>
<body class="min-h-screen bg-zinc-50 text-zinc-900">
    <div x-data="{ mobileOpen: false }" class="min-h-screen">
        <header class="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div class="flex h-14 items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <button type="button" class="sm:hidden" @click="mobileOpen = !mobileOpen" aria-label="Menu">
                            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <a href="{{ route('dashboard') }}" class="flex items-center gap-2 font-semibold tracking-tight">
                            <img src="{{ asset('brand/kivii-mark.png') }}" alt="Kivii" class="h-8 w-8 rounded-lg bg-white" />
                            <span class="hidden sm:block">Kivii CRM</span>
                        </a>
                        <nav class="hidden sm:flex items-center gap-1">
                            <a href="{{ route('dashboard') }}" class="rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Dashboard</a>
                            <a href="{{ route('dashboard.old') }}" class="rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100">Dashboard (old)</a>
                            <a href="{{ route('crm.tasks.index') }}" class="rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Taken</a>
                            <a href="{{ route('crm.tasks.old') }}" class="rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100">Taken (old)</a>
                            <a href="{{ route('crm.garage_companies.index') }}" class="rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Klanten</a>
                            <a href="{{ route('crm.reports.index') }}" class="rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Rapportages</a>
                            @if(auth()->user()?->isAdmin())
                                <a href="{{ route('crm.users.index') }}" class="rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Gebruikers</a>
                                <a href="{{ route('crm.modules.index') }}" class="rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Modules</a>
                            @endif
                        </nav>
                    </div>

                    <div class="flex items-center gap-3">
                        @livewire('crm.reminders.bell')

                        <div x-data="{ open: false }" class="relative">
                            <button type="button" class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-100" @click="open = !open" @click.outside="open = false">
                                <span class="hidden sm:inline text-sm font-medium">{{ auth()->user()->name ?? 'Account' }}</span>
                                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" /></svg>
                            </button>
                            <div x-cloak x-show="open" class="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                                <div class="px-4 py-3">
                                    <div class="text-sm font-semibold">{{ auth()->user()->name }}</div>
                                    <div class="text-xs text-zinc-500">{{ auth()->user()->email }}</div>
                                </div>
                                <div class="border-t border-zinc-200">
                                    <a href="/user/profile" class="block px-4 py-2 text-sm hover:bg-zinc-50">Profiel &amp; 2FA</a>
                                    @if(auth()->user()?->isAdmin())
                                        <a href="{{ route('crm.email_templates.index') }}" class="block px-4 py-2 text-sm hover:bg-zinc-50">E-mail templates</a>
                                    @endif
                                    <form method="POST" action="/logout">
                                        @csrf
                                        <button type="submit" class="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-50">Uitloggen</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <nav class="sm:hidden" x-cloak x-show="mobileOpen">
                <div class="border-t border-zinc-200 bg-white">
                    <div class="mx-auto max-w-7xl px-4 py-2">
                        <a href="{{ route('dashboard') }}" class="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Dashboard</a>
                        <a href="{{ route('dashboard.old') }}" class="block rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100">Dashboard (old)</a>
                        <a href="{{ route('crm.tasks.index') }}" class="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Taken</a>
                        <a href="{{ route('crm.tasks.old') }}" class="block rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100">Taken (old)</a>
                        <a href="{{ route('crm.garage_companies.index') }}" class="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Klanten</a>
                        <a href="{{ route('crm.reports.index') }}" class="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Rapportages</a>
                        @if(auth()->user()?->isAdmin())
                            <a href="{{ route('crm.users.index') }}" class="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Gebruikers</a>
                            <a href="{{ route('crm.modules.index') }}" class="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100">Modules</a>
                        @endif
                    </div>
                </div>
            </nav>
        </header>

        <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            @if(session('status'))
                <div x-data="{ show: true }" x-show="show" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <div class="flex items-start justify-between gap-3">
                        <div>{{ session('status') }}</div>
                        <button type="button" class="text-emerald-700 hover:text-emerald-900" @click="show = false">Sluiten</button>
                    </div>
                </div>
            @endif

            @inertia
        </main>
    </div>

    @livewireScriptConfig
    @livewireScripts
</body>
</html>
