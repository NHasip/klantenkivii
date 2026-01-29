<div class="space-y-6">
    <div>
        <div class="text-sm font-semibold">Demo &amp; status</div>
        <div class="mt-1 text-xs text-zinc-500">Beheer statusflow en bijbehorende datums.</div>
    </div>

    <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
                <div class="text-xs font-medium text-zinc-500">Huidige status</div>
                <div class="mt-1 text-lg font-semibold">{{ $company->status->value }}</div>
            </div>
            <div class="flex flex-wrap gap-2">
                <button class="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="setStatus('demo_aangevraagd')">Naar demo aangevraagd</button>
                <button class="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="setStatus('demo_gepland')">Naar demo gepland</button>
                <button class="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="setStatus('proefperiode')">Naar proefperiode</button>
                <button class="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50" wire:click="setStatus('actief')" @if(! $hasActiveMandate) disabled @endif>Actief</button>
            </div>
        </div>
        @if(! $hasActiveMandate)
            <div class="mt-3 text-xs text-amber-800">Let op: Actief vereist een actief SEPA mandaat.</div>
        @endif
    </div>

    <form wire:submit="saveDates" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
            <label class="block text-xs font-medium text-zinc-600">Demo aangevraagd op</label>
            <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="demo_aangevraagd_op" />
        </div>
        <div>
            <label class="block text-xs font-medium text-zinc-600">Demo gepland op</label>
            <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="demo_gepland_op" />
        </div>
        <div>
            <label class="block text-xs font-medium text-zinc-600">Demo duur (dagen)</label>
            <input type="number" min="1" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="demo_duur_dagen" />
            <div class="mt-1 text-xs text-zinc-500">Vul het aantal dagen in; einddatum wordt automatisch berekend.</div>
        </div>
        <div>
            <label class="block text-xs font-medium text-zinc-600">Demo einddatum</label>
            <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-200 bg-zinc-50 text-sm" value="{{ $demo_eind_op }}" disabled />
            @if($company->demo_eind_op)
                @php($dagen = now()->diffInDays($company->demo_eind_op, false))
                <div class="mt-1 text-xs text-zinc-500">
                    @if($dagen >= 0)
                        Nog {{ $dagen }} dagen
                    @else
                        Verlopen {{ abs($dagen) }} dagen
                    @endif
                </div>
            @endif
        </div>
        <div>
            <label class="block text-xs font-medium text-zinc-600">Proefperiode start</label>
            <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="proefperiode_start" />
        </div>
        <div>
            <label class="block text-xs font-medium text-zinc-600">Actief vanaf</label>
            <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="actief_vanaf" />
        </div>
        <div class="sm:col-span-2 flex justify-end">
            <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Datums opslaan</button>
        </div>
    </form>

    <div class="rounded-xl border border-zinc-200 bg-white p-4">
        <div class="text-sm font-semibold">Demo verlengen</div>
        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
                <label class="block text-xs font-medium text-zinc-600">Verleng met (dagen)</label>
                <input type="number" min="1" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="demo_verleng_dagen" />
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Notitie (optioneel)</label>
                <input type="text" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="demo_verleng_notitie" />
            </div>
        </div>
        <div class="mt-3 flex justify-end">
            <button type="button" wire:click="extendDemo" class="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
                Verleng demo
            </button>
        </div>
    </div>
</div>
