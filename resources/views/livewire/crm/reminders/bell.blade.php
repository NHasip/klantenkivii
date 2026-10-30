<div class="relative" wire:poll.30s
     x-data="{ open: false }"
     @kivii-menu-open.window="if ($event.detail !== 'bell') open = false"
     @keydown.escape.window="if (open) { open = false; $refs.bellButton.focus() }"
     @click.outside="open = false">
    <button type="button" x-ref="bellButton" class="relative rounded-md p-2 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
            @click="open = !open; if (open) { $dispatch('kivii-menu-open', 'bell'); $wire.$refresh() }"
            :aria-expanded="open.toString()" aria-controls="reminders-panel"
            aria-label="Herinneringen{{ $count > 0 ? ' ('.$count.' nieuw)' : '' }}">
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 004 13h12a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6z"/><path d="M10 18a3 3 0 01-2.995-2.824L7 15h6a3 3 0 01-3 3z"/></svg>
        @if($count > 0)
            <span aria-hidden="true" class="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">{{ $count }}</span>
        @endif
    </button>

    <div id="reminders-panel" x-cloak x-show="open" role="region" aria-label="Herinneringen" class="absolute right-0 z-40 mt-2 w-96 max-w-[90vw] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
            <div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                <div class="text-sm font-semibold">Herinneringen</div>
                <button type="button" class="rounded text-sm text-zinc-600 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" @click="open = false; $refs.bellButton.focus()">Sluiten</button>
            </div>

            @if($reminders->isEmpty())
                <div class="px-4 py-6 text-sm text-zinc-600">Geen openstaande herinneringen.</div>
            @else
                <ul class="max-h-[70vh] divide-y divide-zinc-100 overflow-y-auto">
                    @foreach($reminders as $reminder)
                        <li class="px-4 py-3">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <div class="truncate text-sm font-semibold">{{ $reminder->titel }}</div>
                                    @if($reminder->message)
                                        <div class="mt-0.5 text-xs text-zinc-600">{{ \Illuminate\Support\Str::limit($reminder->message, 140) }}</div>
                                    @endif
                                    <div class="mt-1 text-xs text-zinc-500">{{ $reminder->remind_at?->format('d-m-Y H:i') }}</div>
                                </div>
                                <div class="shrink-0">
                                    <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" wire:click="dismiss({{ $reminder->id }})" wire:loading.attr="disabled" wire:target="dismiss({{ $reminder->id }})">
                                        Afhandelen
                                    </button>
                                </div>
                            </div>
                            @if($reminder->garage_company_id)
                                <a class="mt-2 inline-block rounded text-xs font-semibold text-indigo-700 hover:text-indigo-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" href="{{ route('crm.garage_companies.show', $reminder->garage_company_id) }}">
                                    Naar klant &rarr;
                                </a>
                            @endif
                        </li>
                    @endforeach
                </ul>
            @endif
    </div>
</div>
