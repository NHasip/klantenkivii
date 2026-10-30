@php
    $kiviiUser = auth()->user();
    $kiviiIsAdmin = (bool) $kiviiUser?->isAdmin();
    $kiviiNavItems = [
        ['route' => 'dashboard', 'match' => 'dashboard', 'label' => 'Dashboard', 'icon' => 'home'],
        ['route' => 'crm.garage_companies.index', 'match' => 'crm.garage_companies.*', 'label' => 'Klanten', 'icon' => 'building'],
        ['route' => 'crm.tasks.index', 'match' => 'crm.tasks.*', 'label' => 'Taken', 'icon' => 'check-square'],
        ['route' => 'crm.reports.index', 'match' => 'crm.reports.*', 'label' => 'Rapportages', 'icon' => 'bar-chart'],
    ];
    $kiviiSettingsItems = $kiviiIsAdmin ? [
        ['route' => 'crm.users.index', 'match' => 'crm.users.*', 'label' => 'Gebruikers', 'icon' => 'users'],
        ['route' => 'crm.modules.index', 'match' => 'crm.modules.*', 'label' => 'Modules', 'icon' => 'package'],
        ['route' => 'crm.email_templates.index', 'match' => 'crm.email_templates.*', 'label' => 'E-mail templates', 'icon' => 'mail'],
    ] : [];
    $kiviiNeeds2fa = $kiviiIsAdmin && ! \App\Http\Middleware\RequireTwoFactorForAdmin::userHasTwoFactor($kiviiUser);
    $kiviiFocus = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1';
    $kiviiProfileActive = request()->routeIs('profile.show');
@endphp
{{--
    Gedeelde app-shell voor de Inertia-, Livewire- en Jetstream-layouts. Eén root-element (ook bruikbaar als Livewire-view).
    - Root is sticky (top-0) en bevat: 2FA-banner, slanke topbalk (zoeken, meldingen, hamburger) en de zijbalk.
    - Zijbalk: vanaf lg vast links (w-sidebar = 16rem); daaronder een off-canvas drawer via de hamburger.
    - De layout zet de inhoudskolom in <div class="app-shell"> (lg:pl-sidebar) en <main class="app-container">.
    - Menu-exclusiviteit: elk menu stuurt 'kivii-menu-open' met zijn naam (mobile, search, bell, user) en sluit bij een ander.
--}}
<div x-data="{ mobileOpen: false }" class="sticky top-0 z-30"
     @kivii-menu-open.window="if ($event.detail !== 'mobile') mobileOpen = false"
     @keydown.escape.window="if (mobileOpen) { mobileOpen = false; $refs.mobileButton.focus() }"
     @resize.window.debounce.150ms="if (mobileOpen && window.innerWidth >= 1024) mobileOpen = false">
    <script>
        window.kiviiSearch = window.kiviiSearch || function (endpoint) {
            return {
                open: false,
                q: '',
                groups: [],
                active: 0,
                loading: false,
                error: '',
                timer: null,
                controller: null,
                get flat() {
                    return this.groups.flatMap((group) => group.items);
                },
                indexOf(item) {
                    return this.flat.indexOf(item);
                },
                isTyping(target) {
                    if (!target) return false;
                    const tag = (target.tagName || '').toLowerCase();
                    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
                },
                onKey(event) {
                    const key = (event.key || '').toLowerCase();
                    if ((event.ctrlKey || event.metaKey) && key === 'k') {
                        event.preventDefault();
                        this.open ? this.close() : this.show();
                        return;
                    }
                    if (key === '/' && !this.open && !this.isTyping(event.target)) {
                        event.preventDefault();
                        this.show();
                    }
                },
                show() {
                    this.open = true;
                    // Direct tonen en focussen (niet wachten op Alpine/x-trap), zodat toetsen
                    // die meteen na Ctrl+K getypt worden in het zoekveld terechtkomen.
                    if (this.$refs.searchOverlay) this.$refs.searchOverlay.style.removeProperty('display');
                    if (this.$refs.searchInput) this.$refs.searchInput.focus();
                    this.$dispatch('kivii-menu-open', 'search');
                    this.$nextTick(() => {
                        if (this.$refs.searchInput && document.activeElement !== this.$refs.searchInput) this.$refs.searchInput.focus();
                    });
                },
                close() {
                    this.open = false;
                    if (this.$refs.searchTrigger) this.$refs.searchTrigger.focus();
                },
                queue() {
                    clearTimeout(this.timer);
                    this.timer = setTimeout(() => this.fetch(), 200);
                },
                async fetch() {
                    const term = this.q.trim();
                    this.error = '';
                    if (term.length < 2) {
                        this.groups = [];
                        this.active = 0;
                        return;
                    }
                    if (this.controller) this.controller.abort();
                    this.controller = new AbortController();
                    this.loading = true;
                    try {
                        const response = await fetch(endpoint + '?q=' + encodeURIComponent(term), {
                            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                            credentials: 'same-origin',
                            signal: this.controller.signal,
                        });
                        if (response.status === 429) {
                            this.error = 'Te veel zoekopdrachten. Wacht even en probeer opnieuw.';
                            return;
                        }
                        if (!response.ok) throw new Error('fout');
                        const data = await response.json();
                        this.groups = (data.groups || []).filter((group) => group.items.length > 0);
                        this.active = 0;
                    } catch (e) {
                        if (e.name !== 'AbortError') this.error = 'Zoeken mislukt. Probeer opnieuw.';
                    } finally {
                        this.loading = false;
                    }
                },
                move(step) {
                    const total = this.flat.length;
                    if (total === 0) return;
                    this.active = (this.active + step + total) % total;
                    this.$nextTick(() => {
                        const el = document.getElementById('kivii-search-item-' + this.active);
                        if (el) el.scrollIntoView({ block: 'nearest' });
                    });
                },
                go() {
                    const item = this.flat[this.active];
                    if (item) window.location.href = item.url;
                },
            };
        };
    </script>

    @if ($kiviiNeeds2fa)
        <div class="border-b border-amber-200 bg-amber-50 text-amber-950" role="alert">
            <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6 lg:px-10">
                <span class="flex items-center gap-2"><x-icon name="shield" class="h-4 w-4 text-amber-700" /><span><strong class="font-semibold">Beveilig je admin-account.</strong> Tweestapsverificatie (2FA) staat nog niet aan.</span></span>
                <a href="{{ route('profile.show') }}#two-factor" class="inline-flex h-8 items-center rounded-lg bg-amber-900 px-3 text-xs font-semibold text-white hover:bg-amber-950 {{ $kiviiFocus }}">2FA instellen</a>
            </div>
        </div>
    @endif

    {{-- Topbalk in de inhoudskolom --}}
    <header class="border-b border-zinc-200/70 bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
        <div class="flex h-14 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-10">
            <button type="button" x-ref="mobileButton" class="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-200/60 lg:hidden {{ $kiviiFocus }}"
                    @click="mobileOpen = true; $dispatch('kivii-menu-open', 'mobile')"
                    :aria-expanded="mobileOpen.toString()" aria-controls="app-sidebar" aria-label="Menu openen">
                <x-icon name="menu" class="h-6 w-6" />
            </button>
            <a href="{{ route('dashboard') }}" class="mr-1 flex shrink-0 items-center gap-2 rounded-lg lg:hidden {{ $kiviiFocus }}">
                <img src="{{ asset('brand/kivii-mark.png') }}" alt="Kivii CRM" class="h-8 w-8 rounded-lg bg-white" />
            </a>

            <div class="min-w-0 flex-1" x-data="kiviiSearch(@js(route('crm.search')))" @keydown.window="onKey($event)"
                 @kivii-menu-open.window="if ($event.detail !== 'search' && open) open = false">
                <button type="button" x-ref="searchTrigger" @click="show()"
                        class="group flex h-9 w-full max-w-md items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-white px-3 text-sm text-zinc-500 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-700 {{ $kiviiFocus }}"
                        aria-label="Zoeken (Ctrl+K of /)" aria-haspopup="dialog">
                    <x-icon name="search" class="h-4 w-4 text-zinc-400 group-hover:text-zinc-500" />
                    <span class="flex-1 truncate text-left"><span class="sm:hidden">Zoeken</span><span class="hidden sm:inline">Zoek klant, taak, e-mail of KVK</span></span>
                    <span class="hidden items-center gap-1 sm:flex" aria-hidden="true"><kbd class="kbd">Ctrl</kbd><kbd class="kbd">K</kbd></span>
                </button>

                    <template x-teleport="body">
                        <div x-cloak x-show="open" x-ref="searchOverlay" class="fixed inset-0 z-50 flex items-start justify-center bg-zinc-900/30 px-4 pt-[10vh] backdrop-blur-[2px]"
                             @click.self="close()" @keydown.escape.prevent.stop="close()">
                            <div class="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-pop" role="dialog" aria-modal="true" aria-label="Zoeken in Kivii CRM" x-trap.noscroll.noautofocus="open">
                                <div class="flex items-center gap-2 border-b border-zinc-200 px-4">
                                    <x-icon name="search" class="h-5 w-5 text-zinc-400" />
                                    <input x-ref="searchInput" type="search" x-model="q" @input="queue()"
                                           @keydown.arrow-down.prevent="move(1)" @keydown.arrow-up.prevent="move(-1)" @keydown.enter.prevent="go()"
                                           class="h-12 w-full border-0 bg-transparent text-sm focus:ring-0"
                                           placeholder="Zoek klant, e-mail, telefoon, plaats, KVK, IBAN of taak"
                                           role="combobox" aria-controls="kivii-search-results" :aria-expanded="(flat.length > 0).toString()"
                                           :aria-activedescendant="flat.length ? 'kivii-search-item-' + active : null" autocomplete="off" />
                                    <button type="button" @click="close()" class="kbd shrink-0 hover:bg-zinc-100 {{ $kiviiFocus }}" aria-label="Zoeken sluiten">Esc</button>
                                </div>
                                <div id="kivii-search-results" class="max-h-[60vh] overflow-y-auto py-2" role="listbox" aria-label="Zoekresultaten">
                                    <template x-if="error"><div class="px-4 py-3 text-sm text-rose-700" role="alert" x-text="error"></div></template>
                                    <template x-if="!error && q.trim().length < 2"><div class="px-4 py-3 text-sm text-zinc-500">Typ minimaal 2 tekens. Navigeer met de pijltjestoetsen en open met Enter.</div></template>
                                    <template x-if="!error && q.trim().length >= 2 && !loading && flat.length === 0"><div class="px-4 py-6 text-center text-sm text-zinc-500">Geen resultaten voor "<span class="font-medium text-zinc-700" x-text="q.trim()"></span>".</div></template>
                                    <template x-for="group in groups" :key="group.key">
                                        <div class="py-1">
                                            <div class="px-4 pb-1 pt-2 text-xs font-medium text-zinc-500" x-text="group.label"></div>
                                            <template x-for="item in group.items" :key="group.key + '-' + item.id">
                                                <a :href="item.url" :id="'kivii-search-item-' + indexOf(item)" role="option" :aria-selected="(indexOf(item) === active).toString()"
                                                   @mouseenter="active = indexOf(item)"
                                                   :class="indexOf(item) === active ? 'bg-zinc-100' : ''"
                                                   class="mx-2 block rounded-lg px-3 py-2 focus:outline-none">
                                                    <div class="truncate text-sm font-semibold text-zinc-900" x-text="item.title"></div>
                                                    <div class="truncate text-xs text-zinc-500" x-text="item.subtitle"></div>
                                                </a>
                                            </template>
                                        </div>
                                    </template>
                                    <template x-if="loading"><div class="flex items-center gap-2 px-4 py-2 text-xs text-zinc-500" role="status"><svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Zoeken...</div></template>
                                </div>
                            </div>
                        </div>
                    </template>
            </div>

            <div class="flex shrink-0 items-center gap-1">
                @livewire('crm.reminders.bell')
            </div>
        </div>
    </header>

    {{-- Achtergrond van de mobiele drawer --}}
    <div x-cloak x-show="mobileOpen" x-transition.opacity.duration.150ms class="fixed inset-0 z-30 bg-zinc-900/30 backdrop-blur-[2px] lg:hidden" @click="mobileOpen = false" aria-hidden="true"></div>

    {{-- Zijbalk: vast vanaf lg, drawer op kleinere schermen --}}
    <aside id="app-sidebar"
           class="fixed inset-y-0 left-0 z-40 flex w-[17.5rem] max-w-[85vw] flex-col border-r border-zinc-200/70 bg-white transition-[transform,visibility] duration-200 ease-out max-lg:invisible max-lg:-translate-x-full lg:w-sidebar lg:bg-white/70"
           :class="mobileOpen && '!visible !translate-x-0 shadow-pop'"
           x-trap.noscroll="mobileOpen"
           :role="mobileOpen ? 'dialog' : null" :aria-modal="mobileOpen ? 'true' : null"
           aria-label="Zijbalk">
        <div class="flex h-14 shrink-0 items-center justify-between gap-2 px-4 lg:h-16 lg:px-5">
            <a href="{{ route('dashboard') }}" class="flex items-center gap-2.5 rounded-lg {{ $kiviiFocus }}">
                <img src="{{ asset('brand/kivii-mark.png') }}" alt="" class="h-8 w-8 rounded-lg bg-white shadow-sm ring-1 ring-black/5" />
                <span class="text-[15px] font-semibold tracking-snug text-zinc-900">Kivii <span class="font-medium text-zinc-400">CRM</span></span>
            </a>
            <button type="button" class="-mr-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden {{ $kiviiFocus }}"
                    @click="mobileOpen = false; $refs.mobileButton.focus()" aria-label="Menu sluiten">
                <x-icon name="x" class="h-5 w-5" />
            </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 pb-4 pt-2 lg:px-4" aria-label="Hoofdmenu">
            <ul class="space-y-0.5">
                @foreach ($kiviiNavItems as $item)
                    <li>
                        @php($isActive = request()->routeIs($item['match']))
                        <a href="{{ route($item['route']) }}" class="nav-item" @if ($isActive) aria-current="page" @endif>
                            <x-icon :name="$item['icon']" />
                            <span class="truncate">{{ $item['label'] }}</span>
                        </a>
                    </li>
                @endforeach
            </ul>

            @if ($kiviiSettingsItems !== [])
                <div class="mt-7">
                    <p id="sidebar-settings-title" class="mb-1.5 px-3 text-xs font-medium text-zinc-400">Instellingen</p>
                    <ul class="space-y-0.5" aria-labelledby="sidebar-settings-title">
                        @foreach ($kiviiSettingsItems as $item)
                            <li>
                                @php($isActive = request()->routeIs($item['match']))
                                <a href="{{ route($item['route']) }}" class="nav-item" @if ($isActive) aria-current="page" @endif>
                                    <x-icon :name="$item['icon']" />
                                    <span class="truncate">{{ $item['label'] }}</span>
                                </a>
                            </li>
                        @endforeach
                    </ul>
                </div>
            @endif
        </nav>

        {{-- Gebruikerskaart met menu (opent naar boven) --}}
        <div class="shrink-0 border-t border-zinc-200/70 p-3 lg:px-4">
            <div x-data="{ open: false }" class="relative"
                 @kivii-menu-open.window="if ($event.detail !== 'user') open = false"
                 @keydown.escape.window="if (open) { open = false; $refs.userButton.focus() }"
                 @click.outside="open = false">
                <button type="button" x-ref="userButton"
                        class="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-zinc-100 {{ $kiviiFocus }}"
                        :class="open && 'bg-zinc-100'"
                        @click="open = !open; if (open) $dispatch('kivii-menu-open', 'user')"
                        :aria-expanded="open.toString()" aria-haspopup="true" aria-controls="user-menu"
                        aria-label="Gebruikersmenu van {{ $kiviiUser->name ?? 'account' }}">
                    <x-avatar :name="$kiviiUser->name ?? ''" size="sm" />
                    <span class="min-w-0 flex-1" aria-hidden="true">
                        <span class="block truncate text-sm font-semibold text-zinc-900">{{ $kiviiUser->name ?? 'Account' }}</span>
                        <span class="block truncate text-xs text-zinc-500">{{ $kiviiUser->email ?? '' }}</span>
                    </span>
                    <x-icon name="chevrons-up-down" class="h-4 w-4 text-zinc-400" />
                </button>
                <div id="user-menu" x-cloak x-show="open" x-transition.opacity.duration.100ms class="menu-panel absolute inset-x-0 bottom-full z-40 mb-2">
                    <a href="{{ route('profile.show') }}" class="menu-item {{ $kiviiProfileActive ? 'bg-zinc-100 font-semibold text-zinc-900' : '' }}" @if ($kiviiProfileActive) aria-current="page" @endif>
                        <x-icon name="user" class="h-4 w-4 text-zinc-400" />
                        Profiel en beveiliging
                    </a>
                    <form method="POST" action="{{ route('logout') }}">
                        @csrf
                        <button type="submit" class="menu-item">
                            <x-icon name="log-out" class="h-4 w-4 text-zinc-400" />
                            Uitloggen
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </aside>
</div>
