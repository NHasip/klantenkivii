<div class="relative" wire:poll.30s>
    <button type="button" class="relative rounded-md p-2 hover:bg-zinc-100" wire:click="toggle" aria-label="Reminders">
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 004 13h12a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6z"/><path d="M10 18a3 3 0 01-2.995-2.824L7 15h6a3 3 0 01-3 3z"/></svg>
        @if($count > 0)
            <span class="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">{{ $count }}</span>
        @endif
    </button>

    @if($open)
        <div class="absolute right-0 mt-2 w-96 max-w-[90vw] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
            <div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                <div class="text-sm font-semibold">Reminders</div>
                <button type="button" class="text-sm text-zinc-600 hover:text-zinc-900" wire:click="toggle">Sluiten</button>
            </div>

            @if($reminders->isEmpty())
                <div class="px-4 py-6 text-sm text-zinc-600">Geen reminders.</div>
            @else
                <ul class="divide-y divide-zinc-100">
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
                                    <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50" wire:click="dismiss({{ $reminder->id }})">
                                        Afhandelen
                                    </button>
                                </div>
                            </div>
                            @if($reminder->garage_company_id)
                                <a class="mt-2 inline-block text-xs font-semibold text-indigo-700 hover:text-indigo-900" href="{{ route('crm.garage_companies.show', $reminder->garage_company_id) }}">
                                    Naar klant &rarr;
                                </a>
                            @endif
                        </li>
                    @endforeach
                </ul>
            @endif
        </div>
    @endif
</div>
