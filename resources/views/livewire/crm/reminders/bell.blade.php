@php
    // Icoon en kleur per soort melding (sleutels komen uit Bell::buildSignals()).
    $bellTypes = [
        'taken' => ['icon' => 'check-square', 'tile' => 'bg-rose-50 text-rose-700'],
        'afspraken' => ['icon' => 'calendar', 'tile' => 'bg-amber-50 text-amber-700'],
        'demos' => ['icon' => 'clock', 'tile' => 'bg-sky-50 text-sky-700'],
        'mandaten' => ['icon' => 'credit-card', 'tile' => 'bg-violet-50 text-violet-700'],
        'machtiging_ontvangen' => ['icon' => 'file-text', 'tile' => 'bg-emerald-50 text-emerald-700'],
        'machtiging_koppelen' => ['icon' => 'link', 'tile' => 'bg-rose-50 text-rose-700'],
        'mail_failed' => ['icon' => 'mail', 'tile' => 'bg-rose-50 text-rose-700'],
    ];
    $bellRelative = function ($value) {
        try {
            return $value ? \Illuminate\Support\Carbon::parse($value)->locale('nl') : null;
        } catch (\Throwable) {
            return null;
        }
    };
    $bellGroupHead = 'flex items-center justify-between gap-3 px-4 pb-1 pt-3';
    $bellGroupTitle = 'text-xs font-semibold text-zinc-500';
    $bellCount = 'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-100 px-1.5 text-2xs font-semibold tabular-nums text-zinc-700';
    $bellLink = 'tap-link focus-ring inline-flex items-center gap-1 rounded text-xs font-semibold text-indigo-700 hover:text-indigo-900';
@endphp
<div class="relative" wire:poll.30s
     x-data="{ open: false }"
     @kivii-menu-open.window="if ($event.detail !== 'bell') open = false"
     @keydown.escape.window="if (open) { open = false; $refs.bellButton.focus() }"
     @click.outside="open = false">
    <button type="button" x-ref="bellButton"
            class="btn btn-ghost btn-icon relative text-zinc-600"
            :class="open && 'bg-zinc-100 text-zinc-900'"
            @click="open = !open; if (open) { $dispatch('kivii-menu-open', 'bell'); $wire.$refresh() }"
            :aria-expanded="open.toString()" aria-controls="reminders-panel"
            aria-label="Meldingen{{ $count > 0 ? ' ('.$count.' open)' : ', geen open meldingen' }}">
        <x-icon name="bell" class="h-5 w-5" />
        @if($count > 0)
            <span aria-hidden="true" class="absolute -right-0.5 -top-0.5 inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold tabular-nums leading-none text-white ring-2 ring-white">{{ $count > 99 ? '99+' : $count }}</span>
        @endif
    </button>

    <div id="reminders-panel" x-cloak x-show="open"
         x-transition:enter="transition ease-out duration-150" x-transition:enter-start="opacity-0 -translate-y-1" x-transition:enter-end="opacity-100 translate-y-0"
         x-transition:leave="transition ease-in duration-100" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"
         role="region" aria-label="Meldingen"
         class="bell-panel fixed inset-x-2 top-16 z-40 flex max-h-dvh-80 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-pop motion-reduce:transition-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[25rem]">
        <div class="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
            <div class="flex items-center gap-2">
                <h2 class="text-sm font-semibold text-zinc-900">Meldingen</h2>
                @if($count > 0)
                    <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-50 px-1.5 text-xs font-semibold tabular-nums text-rose-700 ring-1 ring-inset ring-rose-200">{{ $count }}<span class="sr-only">&nbsp;open</span></span>
                @endif
            </div>
            <button type="button" class="btn btn-ghost btn-icon btn-sm -mr-1 text-zinc-500" @click="open = false; $refs.bellButton.focus()" aria-label="Meldingen sluiten">
                <x-icon name="x" class="h-4 w-4" />
            </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
            @if($reminders->isNotEmpty())
                <section aria-labelledby="bell-reminders-title">
                    <div class="{{ $bellGroupHead }}">
                        <h3 id="bell-reminders-title" class="{{ $bellGroupTitle }}">Herinneringen</h3>
                        <span class="{{ $bellCount }} bg-indigo-50 text-indigo-800">{{ $reminders->count() }}</span>
                    </div>
                    <ul class="px-2">
                        @foreach($reminders as $reminder)
                            @php $remindAt = $reminder->remind_at; @endphp
                            <li wire:key="bell-reminder-{{ $reminder->id }}" class="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-zinc-50">
                                @if($reminder->garageCompany)
                                    <x-avatar :name="$reminder->garageCompany->bedrijfsnaam" size="sm" class="mt-0.5" />
                                @else
                                    <span class="icon-tile mt-0.5 h-8 w-8 rounded-lg bg-indigo-100/80 text-indigo-700" aria-hidden="true"><x-icon name="bell" class="h-4 w-4" /></span>
                                @endif
                                <div class="min-w-0 flex-1">
                                    <div class="truncate text-sm font-semibold text-zinc-900">{{ $reminder->titel }}</div>
                                    @if($reminder->message)
                                        <div class="mt-0.5 line-clamp-2 text-xs leading-5 text-zinc-600">{{ \Illuminate\Support\Str::limit($reminder->message, 140) }}</div>
                                    @endif
                                    <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                                        @if($remindAt)
                                            <time datetime="{{ $remindAt->toIso8601String() }}" title="{{ $remindAt->format('d-m-Y H:i') }}">{{ $remindAt->copy()->locale('nl')->diffForHumans() }}</time>
                                        @endif
                                        @if($reminder->garage_company_id)
                                            <a class="{{ $bellLink }}" href="{{ route('crm.garage_companies.show', $reminder->garage_company_id) }}">
                                                {{ $reminder->garageCompany?->bedrijfsnaam ?: 'Naar klant' }}
                                                <x-icon name="arrow-up-right" class="h-3 w-3" />
                                            </a>
                                        @endif
                                    </div>
                                </div>
                                <button type="button"
                                        class="btn btn-secondary btn-xs shrink-0"
                                        wire:click="dismiss({{ $reminder->id }})" wire:loading.attr="disabled" wire:target="dismiss({{ $reminder->id }})"
                                        aria-label="{{ $reminder->titel }} afhandelen">
                                    <x-icon name="check" class="h-3.5 w-3.5" />
                                    Afhandelen
                                </button>
                            </li>
                        @endforeach
                    </ul>
                </section>
            @endif

            @foreach($signals as $signal)
                @php $bellType = $bellTypes[$signal['key']] ?? ['icon' => 'info', 'tile' => 'bg-zinc-100 text-zinc-600']; @endphp
                <section @class(['border-t border-zinc-100' => $reminders->isNotEmpty() || ! $loop->first]) aria-labelledby="bell-signal-{{ $signal['key'] }}">
                    <div class="{{ $bellGroupHead }}">
                        <h3 id="bell-signal-{{ $signal['key'] }}" class="{{ $bellGroupTitle }}">{{ $signal['title'] }}</h3>
                        <span class="{{ $bellCount }}">{{ $signal['count'] }}</span>
                    </div>
                    @if(! empty($signal['items']))
                        <ul class="px-2">
                            @foreach($signal['items'] as $item)
                                @php
                                    $itemAt = $bellRelative($item['at'] ?? null);
                                    $itemSub = $item['sub'] ?? null;
                                    $itemOverdueLabel = $item['overdue'] && ($item['overdueLabel'] ?? true);
                                @endphp
                                <li>
                                    <a href="{{ $item['url'] }}" class="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600">
                                        @if(! empty($item['avatar']))
                                            <x-avatar :name="$item['avatar']" size="sm" class="mt-0.5" />
                                        @else
                                            <span class="icon-tile mt-0.5 h-8 w-8 rounded-lg {{ $bellType['tile'] }}" aria-hidden="true"><x-icon :name="$bellType['icon']" class="h-4 w-4" /></span>
                                        @endif
                                        <span class="min-w-0 flex-1">
                                            <span class="block truncate text-sm font-medium text-zinc-900">{{ $item['label'] }}</span>
                                            <span class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                                                @if($itemOverdueLabel)
                                                    <span class="font-semibold text-rose-700">Te laat</span>
                                                @endif
                                                @if($itemAt)
                                                    @if($itemSub)<span class="truncate">{{ $itemSub }}</span>@endif
                                                    <time datetime="{{ $itemAt->toIso8601String() }}" title="{{ $itemAt->format('d-m-Y H:i') }}" @class(['font-medium text-rose-700' => $item['overdue']])>{{ $itemAt->diffForHumans() }}</time>
                                                @elseif($item['meta'])
                                                    <span @class(['truncate', 'font-medium text-rose-700' => $item['overdue']])>{{ $item['meta'] }}</span>
                                                @endif
                                            </span>
                                        </span>
                                    </a>
                                </li>
                            @endforeach
                        </ul>
                    @elseif($signal['link'])
                        <a href="{{ $signal['link'] }}" class="mx-2 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600">
                            <span class="icon-tile h-8 w-8 rounded-lg {{ $bellType['tile'] }}" aria-hidden="true"><x-icon :name="$bellType['icon']" class="h-4 w-4" /></span>
                            <span class="min-w-0 flex-1 text-sm text-zinc-700">
                                <span class="font-semibold tabular-nums text-zinc-900">{{ $signal['count'] }}</span> {{ $signal['summary'] ?? ($signal['count'] === 1 ? 'klant vraagt aandacht' : 'klanten vragen aandacht') }}
                            </span>
                            <x-icon name="chevron-right" class="h-4 w-4 text-zinc-400" />
                        </a>
                    @endif
                    @if($signal['link'] && ! empty($signal['items']))
                        <div class="px-4 pb-1 pt-0.5">
                            <a href="{{ $signal['link'] }}" class="{{ $bellLink }}">
                                {{ $signal['linkLabel'] ? $signal['linkLabel'].' bekijken' : 'Alles bekijken' }}
                                <x-icon name="chevron-right" class="h-3.5 w-3.5" />
                            </a>
                        </div>
                    @endif
                </section>
            @endforeach

            @if($reminders->isEmpty() && empty($signals))
                <div class="flex flex-col items-center px-6 py-10 text-center">
                    <span class="icon-tile h-12 w-12 bg-emerald-50 text-emerald-700" aria-hidden="true"><x-icon name="check-circle" class="h-6 w-6" /></span>
                    <p class="mt-3 text-sm font-semibold text-zinc-900">Alles bijgewerkt</p>
                    <p class="mt-0.5 text-sm text-zinc-500">Er zijn geen open meldingen.</p>
                </div>
            @endif
        </div>

        <div class="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/70 px-4 py-2.5">
            <a href="{{ route('crm.tasks.index') }}" class="{{ $bellLink }}">
                <x-icon name="check-square" class="h-3.5 w-3.5" />
                Alle taken bekijken
            </a>
            <span class="text-2xs text-zinc-400">Ververst elke 30 seconden</span>
        </div>
    </div>
</div>
