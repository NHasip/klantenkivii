<div class="space-y-6">
    <div class="flex items-end justify-between gap-3">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight">Modules</h1>
            <div class="mt-1 text-sm text-zinc-600">Beheer de vaste lijst modules (admin).</div>
        </div>
        <button type="button" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" wire:click="startCreate">
            Nieuwe module
        </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table class="min-w-full divide-y divide-zinc-100">
            <thead class="bg-zinc-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Naam</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Default zichtbaar</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Omschrijving</th>
                    <th class="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
                @forelse($modules as $m)
                    <tr class="hover:bg-zinc-50">
                        <td class="px-4 py-3 text-sm font-semibold">{{ $m->naam }}</td>
                        <td class="px-4 py-3 text-sm">{{ $m->default_visible ? 'Ja' : 'Nee' }}</td>
                        <td class="px-4 py-3 text-sm text-zinc-600">{{ \Illuminate\Support\Str::limit($m->omschrijving ?? '', 80) ?: '—' }}</td>
                        <td class="px-4 py-3 text-right">
                            <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50" wire:click="startEdit({{ $m->id }})">Bewerken</button>
                            <button type="button" class="ml-2 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50" wire:click="delete({{ $m->id }})" onclick="return confirm('Verwijderen?')">Verwijderen</button>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" class="px-4 py-10 text-center text-sm text-zinc-600">Nog geen modules.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @if($showForm)
        <div class="rounded-xl border border-zinc-200 bg-white p-5">
            <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold">{{ $moduleId ? 'Module bewerken' : 'Module toevoegen' }}</div>
                <button type="button" class="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="cancel">
                    Annuleren
                </button>
            </div>

            <form wire:submit="save" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label class="block text-xs font-medium text-zinc-600">Naam *</label>
                    <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="naam" />
                    @error('naam') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
                </div>
                <div class="flex items-center gap-2 pt-6">
                    <input type="checkbox" class="rounded border-zinc-300" wire:model.live="default_visible" id="default_visible">
                    <label for="default_visible" class="text-sm">Default zichtbaar</label>
                </div>
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-zinc-600">Omschrijving</label>
                    <textarea class="mt-1 w-full rounded-md border-zinc-300 text-sm" rows="3" wire:model.live="omschrijving"></textarea>
                </div>
                <div class="sm:col-span-2 flex justify-end">
                    <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Opslaan</button>
                </div>
            </form>
        </div>
    @endif
</div>
