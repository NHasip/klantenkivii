@php
    $kiviiUser = auth()->user();
    $kiviiIsAdmin = (bool) $kiviiUser?->isAdmin();
    $kiviiNavItems = [
        ['route' => 'dashboard', 'match' => 'dashboard', 'label' => 'Dashboard'],
        ['route' => 'crm.garage_companies.index', 'match' => 'crm.garage_companies.*', 'label' => 'Klanten'],
        ['route' => 'crm.tasks.index', 'match' => 'crm.tasks.*', 'label' => 'Taken'],
        ['route' => 'crm.reports.index', 'match' => 'crm.reports.*', 'label' => 'Rapportages'],
    ];
    $kiviiSettingsItems = $kiviiIsAdmin ? [
        ['route' => 'crm.users.index', 'match' => 'crm.users.*', 'label' => 'Gebruikers'],
        ['route' => 'crm.modules.index', 'match' => 'crm.modules.*', 'label' => 'Modules'],
        ['route' => 'crm.email_templates.index', 'match' => 'crm.email_templates.*', 'label' => 'E-mail templates'],
    ] : [];
    $kiviiSettingsActive = collect($kiviiSettingsItems)->contains(fn ($item) => request()->routeIs($item['match']));
    $kiviiNeeds2fa = $kiviiIsAdmin && ! \App\Http\Middleware\RequireTwoFactorForAdmin::userHasTwoFactor($kiviiUser);
    $kiviiFocus = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1';
    $kiviiInitials = collect(preg_split('/\s+/', trim((string) ($kiviiUser->name ?? ''))) ?: [])
        ->filter()
        ->take(2)
        ->map(fn ($part) => mb_strtoupper(mb_substr($part, 0, 1)))
        ->implode('') ?: '?';
@endphp
{{-- Gedeelde kopbalk voor de Inertia-, Livewire- en Jetstream-layouts (één root-element, ook bruikbaar als Livewire-view). --}}
<header x-data="{ mobileOpen: false }" class="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80"
        @kivii-menu-open.window="if ($event.detail !== 'mobile') mobileOpen = false"
        @keydown.escape.window="if (mobileOpen) { mobileOpen = false; $refs.mobileButton.focus() }">
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
                    this.$dispatch('kivii-menu-open', 'search');
                    this.$nextTick(() => this.$refs.searchInput && this.$refs.searchInput.focus());
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
        <div class="border-b border-amber-300 bg-amber-100 text-amber-950" role="alert">
            <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6 lg:px-8">
                <span><strong class="font-semibold">Beveilig je admin-account.</strong> Tweestapsverificatie (2FA) staat nog niet aan.</span>
                <a href="{{ route('profile.show') }}#two-factor" class="inline-flex h-8 items-center rounded-lg bg-amber-900 px-3 text-xs font-semibold text-white hover:bg-amber-950 {{ $kiviiFocus }}">2FA instellen</a>
            </div>
        </div>
    @endif

    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-14 items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <button type="button" x-ref="mobileButton" class="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 md:hidden {{ $kiviiFocus }}"
                        @click="mobileOpen = !mobileOpen; if (mobileOpen) $dispatch('kivii-menu-open', 'mobile')"
                        :aria-expanded="mobileOpen.toString()" aria-controls="mobile-nav" :aria-label="mobileOpen ? 'Menu sluiten' : 'Menu openen'">
                    <svg x-show="!mobileOpen" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    <svg x-cloak x-show="mobileOpen" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <a href="{{ route('dashboard') }}" class="flex items-center gap-2 rounded-md font-semibold tracking-tight {{ $kiviiFocus }}">
                    <img src="{{ asset('brand/kivii-mark.png') }}" alt="Kivii" class="h-8 w-8 rounded-lg bg-white" />
                    <span class="hidden text-zinc-900 lg:block">Kivii <span class="font-medium text-zinc-500">CRM</span></span>
                </a>
                <nav class="hidden md:flex items-center gap-1" aria-label="Hoofdmenu">
                    @foreach ($kiviiNavItems as $item)
                        @php($isActive = request()->routeIs($item['match']))
                        <a href="{{ route($item['route']) }}" @class(['whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors', $kiviiFocus, 'bg-zinc-100 text-zinc-900' => $isActive, 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900' => ! $isActive]) @if ($isActive) aria-current="page" @endif>{{ $item['label'] }}</a>
                    @endforeach

                    @if ($kiviiSettingsItems !== [])
                        <div x-data="{ open: false }" class="relative"
                             @kivii-menu-open.window="if ($event.detail !== 'settings') open = false"
                             @keydown.escape.window="if (open) { open = false; $refs.settingsButton.focus() }"
                             @click.outside="open = false">
                            <button type="button" x-ref="settingsButton"
                                    @class(['flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors', $kiviiFocus, 'bg-zinc-100 text-zinc-900' => $kiviiSettingsActive, 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900' => ! $kiviiSettingsActive])
                                    @click="open = !open; if (open) $dispatch('kivii-menu-open', 'settings')"
                                    :aria-expanded="open.toString()" aria-haspopup="true" aria-controls="settings-menu">
                                Instellingen
                                <svg class="h-4 w-4 text-zinc-400 transition-transform" :class="open && 'rotate-180'" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" /></svg>
                            </button>
                            <div id="settings-menu" x-cloak x-show="open" x-transition.opacity.duration.100ms class="absolute left-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
                                @foreach ($kiviiSettingsItems as $item)
                                    @php($isActive = request()->routeIs($item['match']))
                                    <a href="{{ route($item['route']) }}" @class(['block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100 focus:outline-none focus-visible:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600', 'bg-zinc-100 font-semibold text-zinc-900' => $isActive, 'text-zinc-700' => ! $isActive]) @if ($isActive) aria-current="page" @endif>{{ $item['label'] }}</a>
                                @endforeach
                            </div>
                        </div>
                    @endif
                </nav>
            </div>

            <div class="flex items-center gap-1.5 sm:gap-2">
                <div x-data="kiviiSearch(@js(route('crm.search')))" @keydown.window="onKey($event)"
                     @kivii-menu-open.window="if ($event.detail !== 'search' && open) open = false">
                    <button type="button" x-ref="searchTrigger" @click="show()"
                            class="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm text-zinc-500 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 sm:w-56 sm:px-3 {{ $kiviiFocus }}"
                            aria-label="Zoeken (Ctrl+K of /)" aria-haspopup="dialog">
                        <svg class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a.75.75 0 11-1.06 1.06l-3.08-3.08A7 7 0 012 9z" clip-rule="evenodd" /></svg>
                        <span class="hidden flex-1 text-left sm:inline">Zoeken...</span>
                        <kbd class="hidden rounded border border-zinc-200 bg-zinc-50 px-1.5 font-sans text-[11px] font-medium text-zinc-500 sm:inline">Ctrl K</kbd>
                    </button>

                    <template x-teleport="body">
                        <div x-cloak x-show="open" class="fixed inset-0 z-50 flex items-start justify-center bg-zinc-900/40 px-4 pt-[10vh]"
                             @click.self="close()" @keydown.escape.prevent.stop="close()">
                            <div class="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Zoeken in Kivii CRM" x-trap.noscroll="open">
                                <div class="flex items-center gap-2 border-b border-zinc-200 px-4">
                                    <svg class="h-5 w-5 shrink-0 text-zinc-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a.75.75 0 11-1.06 1.06l-3.08-3.08A7 7 0 012 9z" clip-rule="evenodd" /></svg>
                                    <input x-ref="searchInput" type="search" x-model="q" @input="queue()"
                                           @keydown.arrow-down.prevent="move(1)" @keydown.arrow-up.prevent="move(-1)" @keydown.enter.prevent="go()"
                                           class="h-12 w-full border-0 bg-transparent text-sm focus:ring-0"
                                           placeholder="Zoek klant, e-mail, telefoon, plaats, KVK, IBAN of taak"
                                           role="combobox" aria-controls="kivii-search-results" :aria-expanded="(flat.length > 0).toString()"
                                           :aria-activedescendant="flat.length ? 'kivii-search-item-' + active : null" autocomplete="off" />
                                    <button type="button" @click="close()" class="shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 {{ $kiviiFocus }}" aria-label="Zoeken sluiten">Esc</button>
                                </div>
                                <div id="kivii-search-results" class="max-h-[60vh] overflow-y-auto py-2" role="listbox" aria-label="Zoekresultaten">
                                    <template x-if="error"><div class="px-4 py-3 text-sm text-rose-700" role="alert" x-text="error"></div></template>
                                    <template x-if="!error && q.trim().length < 2"><div class="px-4 py-3 text-sm text-zinc-500">Typ minimaal 2 tekens. Navigeer met de pijltjestoetsen en open met Enter.</div></template>
                                    <template x-if="!error && q.trim().length >= 2 && !loading && flat.length === 0"><div class="px-4 py-6 text-center text-sm text-zinc-500">Geen resultaten voor "<span class="font-medium text-zinc-700" x-text="q.trim()"></span>".</div></template>
                                    <template x-for="group in groups" :key="group.key">
                                        <div class="py-1">
                                            <div class="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500" x-text="group.label"></div>
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

                @livewire('crm.reminders.bell')

                <div x-data="{ open: false }" class="relative"
                     @kivii-menu-open.window="if ($event.detail !== 'user') open = false"
                     @keydown.escape.window="if (open) { open = false; $refs.userButton.focus() }"
                     @click.outside="open = false">
                    <button type="button" x-ref="userButton" class="flex h-9 items-center gap-2 rounded-lg pl-1 pr-1.5 hover:bg-zinc-100 sm:pr-2 {{ $kiviiFocus }}"
                            @click="open = !open; if (open) $dispatch('kivii-menu-open', 'user')"
                            :aria-expanded="open.toString()" aria-haspopup="true" aria-controls="user-menu"
                            aria-label="Gebruikersmenu van {{ $kiviiUser->name ?? 'account' }}">
                        <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-800" aria-hidden="true">{{ $kiviiInitials }}</span>
                        <span class="hidden max-w-[10rem] truncate text-sm font-medium text-zinc-800 lg:inline" aria-hidden="true">{{ $kiviiUser->name ?? 'Account' }}</span>
                        <svg class="h-4 w-4 text-zinc-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" /></svg>
                    </button>
                    <div id="user-menu" x-cloak x-show="open" x-transition.opacity.duration.100ms class="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                        <div class="px-4 py-3">
                            <div class="truncate text-sm font-semibold text-zinc-900">{{ $kiviiUser->name }}</div>
                            <div class="truncate text-xs text-zinc-500">{{ $kiviiUser->email }}</div>
                        </div>
                        <div class="border-t border-zinc-100 p-1">
                            <a href="{{ route('profile.show') }}" @class(['block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100 focus:outline-none focus-visible:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600', 'bg-zinc-100 font-semibold text-zinc-900' => request()->routeIs('profile.show'), 'text-zinc-700' => ! request()->routeIs('profile.show')]) @if (request()->routeIs('profile.show')) aria-current="page" @endif>Profiel en beveiliging</a>
                            <form method="POST" action="{{ route('logout') }}">
                                @csrf
                                <button type="submit" class="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600">Uitloggen</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <nav id="mobile-nav" class="md:hidden" x-cloak x-show="mobileOpen" x-transition.opacity.duration.100ms aria-label="Hoofdmenu mobiel">
        <div class="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-zinc-200 bg-white shadow-sm">
            <div class="mx-auto max-w-7xl space-y-0.5 px-4 py-3">
                @foreach ($kiviiNavItems as $item)
                    @php($isActive = request()->routeIs($item['match']))
                    <a href="{{ route($item['route']) }}" @class(['block rounded-lg px-3 py-2.5 text-sm font-medium', $kiviiFocus, 'bg-zinc-100 text-zinc-900' => $isActive, 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900' => ! $isActive]) @if ($isActive) aria-current="page" @endif>{{ $item['label'] }}</a>
                @endforeach
                @if ($kiviiSettingsItems !== [])
                    <div class="mt-2 border-t border-zinc-100 pt-2">
                        <div class="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Instellingen</div>
                        @foreach ($kiviiSettingsItems as $item)
                            @php($isActive = request()->routeIs($item['match']))
                            <a href="{{ route($item['route']) }}" @class(['block rounded-lg px-3 py-2.5 pl-5 text-sm font-medium', $kiviiFocus, 'bg-zinc-100 text-zinc-900' => $isActive, 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900' => ! $isActive]) @if ($isActive) aria-current="page" @endif>{{ $item['label'] }}</a>
                        @endforeach
                    </div>
                @endif
            </div>
        </div>
    </nav>
</header>
