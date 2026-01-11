<div class="space-y-6">
    <div>
        <div class="text-sm font-semibold">Notities &amp; timeline</div>
        <div class="mt-1 text-xs text-zinc-500">Alles wat gebeurt bij deze klant.</div>
    </div>

    <form wire:submit.prevent="addNote" class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
                <label class="block text-xs font-medium text-zinc-600">Titel</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="titel" />
                @error('titel') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>
            <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-zinc-600">Notitie</label>
                <textarea class="mt-1 w-full rounded-md border-zinc-300 text-sm" rows="3" wire:model.live="inhoud" placeholder="Schrijf een korte notitie"></textarea>
                @error('inhoud') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>
        </div>
        <div class="mt-3 flex justify-end">
            <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Toevoegen</button>
        </div>
    </form>

    <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <ul class="divide-y divide-zinc-100">
            @forelse($activities as $a)
                <li class="px-4 py-4">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">{{ $a->type->value }}</span>
                                <div class="truncate text-sm font-semibold">{{ $a->titel }}</div>
                            </div>
                            @if($a->inhoud)
                                <div class="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{{ $a->inhoud }}</div>
                            @endif
                            <div class="mt-2 text-xs text-zinc-500">
                                {{ $a->created_at->format('d-m-Y H:i') }}
                                @if($a->creator)
                                    &middot; {{ $a->creator->name }}
                                @endif
                                @if($a->due_at)
                                    &middot; Deadline: {{ $a->due_at->format('d-m-Y H:i') }}
                                @endif
                                @if($a->done_at)
                                    &middot; Afgerond: {{ $a->done_at->format('d-m-Y H:i') }}
                                @endif
                            </div>
                        </div>
                    </div>
                </li>
            @empty
                <li class="px-4 py-10 text-center text-sm text-zinc-600">Nog geen activiteiten.</li>
            @endforelse
        </ul>
    </div>

    <div>{{ $activities->links() }}</div>
</div>
