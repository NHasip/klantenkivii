<div class="relative" wire:poll.30s
     x-data="{ open: false }"
     @kivii-menu-open.window="if ($event.detail !== 'bell') open = false"
     @keydown.escape.window="if (open) { open = false; $refs.bellButton.focus() }"
     @click.outside="open = false">
    <button type="button" x-ref="bellButton"
            class="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
            :class="open && 'bg-zinc-100 text-zinc-900'"
            @click="open = !open; if (open) { $dispatch('kivii-menu-open', 'bell'); $wire.$refresh() }"
            :aria-expanded="open.toString()" aria-controls="reminders-panel"
            aria-label="Meldingen{{ $count > 0 ? ' ('.$count.' open)' : ', geen open meldingen' }}">
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 004 13h12a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6z"/><path d="M10 18a3 3 0 01-2.995-2.824L7 15h6a3 3 0 01-3 3z"/></svg>
        @if($count > 0)
            <span aria-hidden="true" class="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-semibold tabular-nums text-white ring-2 ring-white">{{ $count > 99 ? '99+' : $count }}</span>
        @endif
    </button>

    <div id="reminders-panel" x-cloak x-show="open" x-transition.opacity.duration.100ms role="region" aria-label="Meldingen"
         class="fixed inset-x-2 top-16 z-40 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
        <div class="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
            <div class="flex items-center gap-2">
                <h2 class="text-sm font-semibold text-zinc-900">Meldingen</h2>
                @if($count > 0)
                    <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-100 px-1.5 text-xs font-semibold tabular-nums text-zinc-700">{{ $count }}</span>
                @endif
            </div>
            <button type="button" class="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" @click="open = false; $refs.bellButton.focus()" aria-label="Meldingen sluiten">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
            </button>
        </div>

        <div class="max-h-[70vh] overflow-y-auto">
            @if($reminders->isNotEmpty())
                <section class="border-b border-zinc-100 px-4 py-3" aria-labelledby="bell-reminders-title">
                    <div class="flex items-center justify-between gap-3">
                        <h3 id="bell-reminders-title" class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Herinneringen</h3>
                        <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-50 px-1.5 text-xs font-semibold tabular-nums text-indigo-800">{{ $reminders->count() }}</span>
                    </div>
                    <ul class="mt-2 space-y-2">
                        @foreach($reminders as $reminder)
                            <li wire:key="bell-reminder-{{ $reminder->id }}" class="rounded-lg border border-zinc-200 p-3">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="min-w-0">
                                        <div class="truncate text-sm font-semibold text-zinc-900">{{ $reminder->titel }}</div>
                                        @if($reminder->message)
                                            <div class="mt-0.5 text-xs text-zinc-600">{{ \Illuminate\Support\Str::limit($reminder->message, 140) }}</div>
                                        @endif
                                        <div class="mt-1 text-xs tabular-nums text-zinc-500">{{ $reminder->remind_at?->format('d-m-Y H:i') }}</div>
                                    </div>
                                    <button type="button"
                                            class="inline-flex h-8 shrink-0 items-center rounded-lg bg-white px-2.5 text-xs font-semibold text-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50"
                                            wire:click="dismiss({{ $reminder->id }})" wire:loading.attr="disabled" wire:target="dismiss({{ $reminder->id }})">
                                        Afhandelen
                                    </button>
                                </div>
                                @if($reminder->garage_company_id)
                                    <a class="mt-2 inline-block rounded text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" href="{{ route('crm.garage_companies.show', $reminder->garage_company_id) }}">
                                        Naar klant &rarr;
                                    </a>
                                @endif
                            </li>
                        @endforeach
                    </ul>
                </section>
            @endif

            @foreach($signals as $signal)
                <section class="border-b border-zinc-100 px-4 py-3 last:border-b-0" aria-labelledby="bell-signal-{{ $signal['key'] }}">
                    <div class="flex items-center justify-between gap-3">
                        <h3 id="bell-signal-{{ $signal['key'] }}" class="text-xs font-semibold uppercase tracking-wide text-zinc-500">{{ $signal['title'] }}</h3>
                        <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-100 px-1.5 text-xs font-semibold tabular-nums text-zinc-700">{{ $signal['count'] }}</span>
                    </div>
                    @if(! empty($signal['items']))
                        <ul class="-mx-2 mt-1.5">
                            @foreach($signal['items'] as $item)
                                <li>
                                    <a href="{{ $item['url'] }}" class="block rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600">
                                        <span class="block truncate font-medium text-zinc-900">{{ $item['label'] }}</span>
                                        @if($item['meta'])
                                            <span class="block truncate text-xs {{ $item['overdue'] ? 'font-medium text-rose-700' : 'text-zinc-500' }}">{{ $item['overdue'] && ($item['overdueLabel'] ?? true) ? 'Te laat · ' : '' }}{{ $item['meta'] }}</span>
                                        @endif
                                    </a>
                                </li>
                            @endforeach
                        </ul>
                    @endif
                    @if($signal['link'])
                        <a href="{{ $signal['link'] }}" class="mt-1.5 inline-block rounded text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                            {{ $signal['linkLabel'] }} &rarr;
                        </a>
                    @endif
                </section>
            @endforeach

            @if($reminders->isEmpty() && empty($signals))
                <div class="flex flex-col items-center px-6 py-10 text-center">
                    <svg class="h-8 w-8 text-zinc-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                    <p class="mt-2 text-sm font-semibold text-zinc-800">Alles bijgewerkt</p>
                    <p class="mt-0.5 text-sm text-zinc-500">Er zijn geen open meldingen.</p>
                </div>
            @endif
        </div>
    </div>
</div>
