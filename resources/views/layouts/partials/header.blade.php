@php
    $kiviiNavItems = [
        ['route' => 'dashboard', 'match' => 'dashboard', 'label' => 'Dashboard'],
        ['route' => 'crm.tasks.index', 'match' => 'crm.tasks.*', 'label' => 'Taken'],
        ['route' => 'crm.garage_companies.index', 'match' => 'crm.garage_companies.*', 'label' => 'Klanten'],
        ['route' => 'crm.reports.index', 'match' => 'crm.reports.*', 'label' => 'Rapportages'],
    ];
    if (auth()->user()?->isAdmin()) {
        $kiviiNavItems[] = ['route' => 'crm.users.index', 'match' => 'crm.users.*', 'label' => 'Gebruikers'];
        $kiviiNavItems[] = ['route' => 'crm.modules.index', 'match' => 'crm.modules.*', 'label' => 'Modules'];
        $kiviiNavItems[] = ['route' => 'crm.email_templates.index', 'match' => 'crm.email_templates.*', 'label' => 'E-mail templates'];
    }
    $kiviiFocus = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1';
@endphp
{{-- Gedeelde kopbalk voor de Inertia-, Livewire- en Jetstream-layouts (één root-element, ook bruikbaar als Livewire-view). --}}
<header x-data="{ mobileOpen: false }" class="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-14 items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <button type="button" class="-ml-2 rounded-md p-2 hover:bg-zinc-100 sm:hidden {{ $kiviiFocus }}" @click="mobileOpen = !mobileOpen" :aria-expanded="mobileOpen.toString()" aria-controls="mobile-nav" aria-label="Menu openen of sluiten">
                    <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <a href="{{ route('dashboard') }}" class="flex items-center gap-2 rounded-md font-semibold tracking-tight {{ $kiviiFocus }}">
                    <img src="{{ asset('brand/kivii-mark.png') }}" alt="Kivii" class="h-8 w-8 rounded-lg bg-white" />
                    <span class="hidden sm:block">Kivii CRM</span>
                </a>
                <nav class="hidden sm:flex items-center gap-1" aria-label="Hoofdmenu">
                    @foreach ($kiviiNavItems as $item)
                        @php($isActive = request()->routeIs($item['match']))
                        <a href="{{ route($item['route']) }}" @class(['whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium', $kiviiFocus, 'bg-zinc-100 text-zinc-900' => $isActive, 'text-zinc-700 hover:bg-zinc-100' => ! $isActive]) @if ($isActive) aria-current="page" @endif>{{ $item['label'] }}</a>
                    @endforeach
                </nav>
            </div>

            <div class="flex items-center gap-3">
                @livewire('crm.reminders.bell')

                <div x-data="{ open: false }" class="relative"
                     @kivii-menu-open.window="if ($event.detail !== 'user') open = false"
                     @keydown.escape.window="if (open) { open = false; $refs.userButton.focus() }"
                     @click.outside="open = false">
                    <button type="button" x-ref="userButton" class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-100 {{ $kiviiFocus }}"
                            @click="open = !open; if (open) $dispatch('kivii-menu-open', 'user')"
                            :aria-expanded="open.toString()" aria-haspopup="true" aria-controls="user-menu"
                            aria-label="Gebruikersmenu van {{ auth()->user()->name ?? 'account' }}">
                        <span class="hidden sm:inline text-sm font-medium" aria-hidden="true">{{ auth()->user()->name ?? 'Account' }}</span>
                        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" /></svg>
                    </button>
                    <div id="user-menu" x-cloak x-show="open" class="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                        <div class="px-4 py-3">
                            <div class="text-sm font-semibold">{{ auth()->user()->name }}</div>
                            <div class="text-xs text-zinc-500">{{ auth()->user()->email }}</div>
                        </div>
                        <div class="border-t border-zinc-200">
                            <a href="{{ route('profile.show') }}" class="block px-4 py-2 text-sm hover:bg-zinc-50 focus:outline-none focus-visible:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600">Profiel &amp; 2FA</a>
                            <form method="POST" action="{{ route('logout') }}">
                                @csrf
                                <button type="submit" class="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 focus:outline-none focus-visible:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600">Uitloggen</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <nav id="mobile-nav" class="sm:hidden" x-cloak x-show="mobileOpen" aria-label="Hoofdmenu mobiel">
        <div class="border-t border-zinc-200 bg-white">
            <div class="mx-auto max-w-7xl px-4 py-2">
                @foreach ($kiviiNavItems as $item)
                    @php($isActive = request()->routeIs($item['match']))
                    <a href="{{ route($item['route']) }}" @class(['block rounded-md px-3 py-2 text-sm font-medium', $kiviiFocus, 'bg-zinc-100 text-zinc-900' => $isActive, 'text-zinc-700 hover:bg-zinc-100' => ! $isActive]) @if ($isActive) aria-current="page" @endif>{{ $item['label'] }}</a>
                @endforeach
            </div>
        </div>
    </nav>
</header>
