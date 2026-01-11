<div class="space-y-6">
    <div>
        <div class="text-sm font-semibold">Taken &amp; afspraken</div>
        <div class="mt-1 text-xs text-zinc-500">Maak taken/afspraken aan en stel reminders in.</div>
    </div>

    <form wire:submit="add" class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
                <label class="block text-xs font-medium text-zinc-600">Type</label>
                <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="type">
                    <option value="taak">Taak</option>
                    <option value="afspraak">Afspraak</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Deadline / tijd</label>
                <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="due_at" />
            </div>
            <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-zinc-600">Titel *</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="titel" placeholder="bijv. Demo nabellen, afspraak plannen…" />
                @error('titel') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>
            <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-zinc-600">Inhoud</label>
                <textarea class="mt-1 w-full rounded-md border-zinc-300 text-sm" rows="2" wire:model.live="inhoud"></textarea>
            </div>

            <div class="flex items-center gap-2">
                <input type="checkbox" class="rounded border-zinc-300" wire:model.live="createReminder" id="createReminder">
                <label for="createReminder" class="text-sm">Reminder instellen</label>
            </div>

            @if($createReminder)
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Kanaal</label>
                    <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="channel">
                        @foreach($channels as $c)
                            <option value="{{ $c->value }}">{{ $c->value }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-zinc-600">Remind op</label>
                    <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="remind_at" />
                    <div class="mt-1 text-xs text-zinc-500">Leeg = gebruikt deadline of +1 uur.</div>
                </div>
            @endif
        </div>

        <div class="mt-3 flex justify-end">
            <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Toevoegen</button>
        </div>
    </form>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-sm font-semibold">Open taken</div>
            <ul class="mt-3 space-y-2">
                @forelse($taken as $t)
                    <li class="rounded-lg border border-zinc-200 p-3">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <div class="text-sm font-semibold">{{ $t->titel }}</div>
                                <div class="mt-1 text-xs text-zinc-500">{{ $t->due_at ? $t->due_at->format('d-m H:i') : 'Geen deadline' }}</div>
                                @if($t->inhoud)
                                    <div class="mt-2 text-sm text-zinc-700">{{ $t->inhoud }}</div>
                                @endif
                            </div>
                            <button type="button" class="shrink-0 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700" wire:click="markDone({{ $t->id }})">
                                Gereed
                            </button>
                        </div>
                    </li>
                @empty
                    <li class="text-sm text-zinc-600">Geen open taken.</li>
                @endforelse
            </ul>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="text-sm font-semibold">Afspraken</div>
            <ul class="mt-3 space-y-2">
                @forelse($afspraken as $a)
                    <li class="rounded-lg border border-zinc-200 p-3">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <div class="text-sm font-semibold">{{ $a->titel }}</div>
                                <div class="mt-1 text-xs text-zinc-500">{{ $a->due_at ? $a->due_at->format('d-m H:i') : 'Geen tijd' }}</div>
                                @if($a->inhoud)
                                    <div class="mt-2 text-sm text-zinc-700">{{ $a->inhoud }}</div>
                                @endif
                            </div>
                            <button type="button" class="shrink-0 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700" wire:click="markDone({{ $a->id }})">
                                Gereed
                            </button>
                        </div>
                    </li>
                @empty
                    <li class="text-sm text-zinc-600">Geen afspraken.</li>
                @endforelse
            </ul>
        </div>
    </div>
</div>

