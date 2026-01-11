<div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div class="text-xs font-medium text-zinc-500">Maandelijks terugkerende omzet (excl. btw)</div>
            <div class="mt-1 text-xl font-semibold">&euro; {{ number_format($company->active_mrr_excl, 2, ',', '.') }}</div>
            <div class="mt-2 text-xs text-zinc-500">Actieve modules, vandaag.</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div class="text-xs font-medium text-zinc-500">Maandelijks terugkerende omzet (incl. btw)</div>
            <div class="mt-1 text-xl font-semibold">&euro; {{ number_format($company->active_mrr_incl, 2, ',', '.') }}</div>
            <div class="mt-2 text-xs text-zinc-500">BTW standaard 21% (instelbaar per module).</div>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div class="text-xs font-medium text-zinc-500">SEPA mandaat</div>
            <div class="mt-1 text-xl font-semibold">{{ $hasActiveMandate ? 'Actief' : 'Niet actief' }}</div>
            <div class="mt-2 text-xs text-zinc-500">Zie tab Incasso voor historie.</div>
        </div>
    </div>

    <div class="flex justify-end">
        <a href="{{ route('crm.garage_companies.show', ['garageCompany' => $company->id, 'tab' => 'modules']) }}" class="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
            Modules &amp; prijzen wijzigen
        </a>
    </div>

    @if(!empty($statusErrors))
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div class="font-semibold">Let op</div>
            <ul class="mt-2 list-disc pl-5">
                @foreach($statusErrors as $e)
                    <li>{{ $e }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <form wire:submit.prevent="save" class="space-y-5">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-zinc-600">Bedrijfsnaam *</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="bedrijfsnaam" />
                @error('bedrijfsnaam') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>

            <div>
                <label class="block text-xs font-medium text-zinc-600">Status</label>
                <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="status">
                    @foreach($statuses as $s)
                        <option value="{{ $s->value }}">{{ $s->value }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Bron</label>
                <select class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="bron">
                    @foreach($sources as $s)
                        <option value="{{ $s->value }}">{{ $s->value }}</option>
                    @endforeach
                </select>
            </div>

            <div>
                <label class="block text-xs font-medium text-zinc-600">Hoofd e-mail *</label>
                <input type="email" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="hoofd_email" />
                @error('hoofd_email') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Hoofd telefoon *</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="hoofd_telefoon" />
                @error('hoofd_telefoon') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>

            <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-zinc-600">Adres</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="adres_straat_nummer" />
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Postcode</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="postcode" />
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Plaats *</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="plaats" />
                @error('plaats') <div class="mt-1 text-xs text-rose-600">{{ $message }}</div> @enderror
            </div>

            <div>
                <label class="block text-xs font-medium text-zinc-600">Land</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="land" />
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Website</label>
                <input class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="website" />
            </div>

            <div>
                <label class="block text-xs font-medium text-zinc-600">Demo aangevraagd op</label>
                <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="demo_aangevraagd_op" />
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Demo gepland op</label>
                <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="demo_gepland_op" />
            </div>

            <div>
                <label class="block text-xs font-medium text-zinc-600">Proefperiode start</label>
                <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="proefperiode_start" />
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Actief vanaf</label>
                <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="actief_vanaf" />
            </div>

            <div>
                <label class="block text-xs font-medium text-zinc-600">Opgezegd op</label>
                <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="opgezegd_op" />
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-600">Verloren op</label>
                <input type="datetime-local" class="mt-1 w-full rounded-md border-zinc-300 text-sm" wire:model.live="verloren_op" />
            </div>

            <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-zinc-600">Opzegreden</label>
                <textarea class="mt-1 w-full rounded-md border-zinc-300 text-sm" rows="2" wire:model.live="opzegreden"></textarea>
            </div>
            <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-zinc-600">Verloren reden</label>
                <textarea class="mt-1 w-full rounded-md border-zinc-300 text-sm" rows="2" wire:model.live="verloren_reden"></textarea>
            </div>

            <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-zinc-600">Tags</label>
                <textarea class="mt-1 w-full rounded-md border-zinc-300 text-sm" rows="2" wire:model.live="tags"></textarea>
            </div>
        </div>

        <div class="flex items-center justify-end gap-2">
            <button
                type="submit"
                class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                onclick="return confirm(['opgezegd','verloren'].includes(@js($status)) ? 'Weet je het zeker? Dit wordt gelogd in de timeline.' : 'Opslaan?')"
            >
                Opslaan
            </button>
        </div>
    </form>
</div>
