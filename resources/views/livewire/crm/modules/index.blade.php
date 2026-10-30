@php
    $input = 'mt-1 block w-full rounded-lg border-zinc-300 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-indigo-600';
    $label = 'block text-sm font-medium text-zinc-800';
    $error = 'mt-1 text-xs font-medium text-rose-700';
    $btnPrimary = 'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    $btnSecondary = 'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-white px-3.5 text-sm font-semibold text-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50';
    $actionSlot = 'w-[6.5rem] shrink-0 justify-center';
    $btnSmall = 'inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50';
    $th = 'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500';
    $activeCount = $supportsArchive ? $modules->whereNull('archived_at')->count() : $modules->count();
@endphp

<div
    class="space-y-6"
    x-data="{
        confirmOpen: false,
        confirmTitle: '',
        confirmMessage: '',
        confirmLabel: '',
        confirmDanger: false,
        confirmAction: null,
        confirmId: null,
        lastFocus: null,
        ask(action, id, title, message, label, danger = false) {
            this.lastFocus = document.activeElement;
            this.confirmAction = action;
            this.confirmId = id;
            this.confirmTitle = title;
            this.confirmMessage = message;
            this.confirmLabel = label;
            this.confirmDanger = danger;
            this.confirmOpen = true;
            this.$nextTick(() => this.$refs.confirmCancel?.focus());
        },
        closeConfirm() {
            this.confirmOpen = false;
            this.$nextTick(() => this.lastFocus?.focus?.());
        },
        runConfirm() {
            const action = this.confirmAction;
            const id = this.confirmId;
            this.closeConfirm();
            if (action) $wire.call(action, id);
        },
    }"
    @keydown.escape.window="if (confirmOpen) closeConfirm()"
>
    <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
            <h1 class="text-2xl font-semibold tracking-tight text-zinc-900">Modules</h1>
            <p class="mt-1 text-sm text-zinc-500">Modules die je aan klanten kunt koppelen, met standaardprijs en btw.</p>
        </div>
        @unless($showForm && ! $moduleId)
            <button type="button" class="{{ $btnPrimary }}" wire:click="startCreate" wire:loading.attr="disabled" wire:target="startCreate">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                Nieuwe module
            </button>
        @endunless
    </div>

    @if(session('livewire_status'))
        <div role="status" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">{{ session('livewire_status') }}</div>
    @endif
    @if(session('livewire_error'))
        <div role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm">{{ session('livewire_error') }}</div>
    @endif

    @if($showForm)
        <section class="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm" wire:key="module-form-{{ $moduleId ?? 'new' }}" aria-labelledby="module-form-title"
                 x-init="$nextTick(() => { $el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); $el.querySelector('#module_naam')?.focus() })">
            <form wire:submit="save">
                <div class="p-4 sm:p-5">
                    <h2 id="module-form-title" class="text-base font-semibold text-zinc-900">{{ $moduleId ? 'Module bewerken' : 'Nieuwe module' }}</h2>
                    <p class="mt-0.5 text-sm text-zinc-500">Prijs en btw zijn standaardwaarden bij een nieuwe koppeling; bestaande klanten veranderen niet mee.</p>

                    <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="sm:col-span-2">
                            <label for="module_naam" class="{{ $label }}">Naam <span class="text-rose-600" aria-hidden="true">*</span></label>
                            <input id="module_naam" class="{{ $input }}" wire:model="naam" required autocomplete="off" @error('naam') aria-invalid="true" @enderror />
                            @error('naam') <p class="{{ $error }}">{{ $message }}</p> @enderror
                        </div>
                        @if($supportsDefaultPricing)
                            <div>
                                <label for="module_prijs" class="{{ $label }}">Prijs per maand, excl. btw <span class="text-rose-600" aria-hidden="true">*</span></label>
                                <div class="relative">
                                    <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-500" aria-hidden="true">&euro;</span>
                                    <input id="module_prijs" type="text" inputmode="decimal" class="{{ $input }} pl-7 tabular-nums" wire:model="default_prijs_maand_excl" required autocomplete="off" />
                                </div>
                                @error('default_prijs_maand_excl') <p class="{{ $error }}">{{ $message }}</p> @enderror
                            </div>
                            <div>
                                <label for="module_btw" class="{{ $label }}">Btw-percentage <span class="text-rose-600" aria-hidden="true">*</span></label>
                                <div class="relative">
                                    <input id="module_btw" type="text" inputmode="decimal" class="{{ $input }} pr-8 tabular-nums" wire:model="default_btw_percentage" required autocomplete="off" />
                                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-zinc-500" aria-hidden="true">%</span>
                                </div>
                                @error('default_btw_percentage') <p class="{{ $error }}">{{ $message }}</p> @enderror
                            </div>
                        @else
                            <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:col-span-2">
                                Standaard moduleprijzen zijn nog niet beschikbaar. Draai eerst de nieuwste migraties.
                            </div>
                        @endif
                        <div class="sm:col-span-2">
                            <label for="module_omschrijving" class="{{ $label }}">Omschrijving</label>
                            <textarea id="module_omschrijving" class="{{ $input }}" rows="3" wire:model="omschrijving"></textarea>
                            @error('omschrijving') <p class="{{ $error }}">{{ $message }}</p> @enderror
                        </div>
                        <div class="sm:col-span-2">
                            <label for="default_visible" class="flex w-fit cursor-pointer items-center gap-2 text-sm text-zinc-800">
                                <input type="checkbox" class="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600" wire:model="default_visible" id="default_visible">
                                Standaard zichtbaar bij nieuwe klanten
                            </label>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/70 px-4 py-3 sm:px-5">
                    <button type="button" class="{{ $btnSecondary }}" wire:click="cancel">Annuleren</button>
                    <button type="submit" class="{{ $btnPrimary }}" wire:loading.attr="disabled" wire:target="save">
                        <svg wire:loading wire:target="save" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                        {{ $moduleId ? 'Wijzigingen opslaan' : 'Module toevoegen' }}
                    </button>
                </div>
            </form>
        </section>
    @endif

    @if($modules->isEmpty())
        <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-10 text-center">
            <p class="text-sm font-semibold text-zinc-800">Nog geen modules</p>
            <p class="mt-1 max-w-sm text-sm text-zinc-500">Voeg een module toe om hem aan klanten te kunnen koppelen.</p>
            @unless($showForm)
                <button type="button" class="{{ $btnPrimary }} mt-4" wire:click="startCreate">Eerste module toevoegen</button>
            @endunless
        </div>
    @else
        <div class="min-w-0 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table class="min-w-full divide-y divide-zinc-200 text-sm">
                <caption class="sr-only">Modules ({{ $activeCount }} actief)</caption>
                <thead class="bg-zinc-50">
                    <tr>
                        <th scope="col" class="{{ $th }}">Naam</th>
                        @if($supportsDefaultPricing)
                            <th scope="col" class="{{ $th }} text-right">Prijs p/m excl.</th>
                            <th scope="col" class="{{ $th }} text-right">Btw</th>
                        @endif
                        <th scope="col" class="{{ $th }} text-right">Klanten</th>
                        <th scope="col" class="{{ $th }} hidden md:table-cell">Standaard zichtbaar</th>
                        <th scope="col" class="px-4 py-2.5"><span class="sr-only">Acties</span></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100">
                    @foreach($modules as $m)
                        @php
                            $inUse = (int) ($usage[$m->id] ?? 0);
                            $archived = $supportsArchive && $m->archived_at !== null;
                        @endphp
                        <tr @class(['hover:bg-zinc-50/80', 'bg-zinc-50/60' => $archived, 'bg-indigo-50/40' => $moduleId === $m->id]) wire:key="module-{{ $m->id }}">
                            <td class="max-w-md px-4 py-3 align-middle">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span @class(['font-semibold', 'text-zinc-900' => ! $archived, 'text-zinc-500' => $archived])>{{ $m->naam }}</span>
                                    @if($archived)
                                        <span class="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200">Gearchiveerd</span>
                                    @endif
                                </div>
                                @if(filled($m->omschrijving))
                                    <p class="mt-0.5 line-clamp-2 text-xs text-zinc-500" title="{{ $m->omschrijving }}">{{ $m->omschrijving }}</p>
                                @endif
                            </td>
                            @if($supportsDefaultPricing)
                                @php
                                    $btw = (float) $m->default_btw_percentage;
                                    $btwDecimals = abs($btw - round($btw)) < 0.001 ? 0 : 2;
                                @endphp
                                <td class="whitespace-nowrap px-4 py-3 text-right align-middle tabular-nums text-zinc-700">&euro; {{ number_format((float) $m->default_prijs_maand_excl, 2, ',', '.') }}</td>
                                <td class="whitespace-nowrap px-4 py-3 text-right align-middle tabular-nums text-zinc-700">{{ number_format($btw, $btwDecimals, ',', '.') }}%</td>
                            @endif
                            <td class="whitespace-nowrap px-4 py-3 text-right align-middle tabular-nums text-zinc-700">{{ number_format($inUse, 0, ',', '.') }}</td>
                            <td class="hidden px-4 py-3 align-middle text-zinc-700 md:table-cell">{{ $m->default_visible ? 'Ja' : 'Nee' }}</td>
                            <td class="whitespace-nowrap px-4 py-3 text-right align-middle">
                                {{-- Vaste, rechts uitgelijnde groep met drie slots, zodat knoppen per rij onder elkaar staan. --}}
                                <div class="flex items-center justify-end gap-1">
                                    <button type="button" class="{{ $btnSmall }} {{ $actionSlot }} text-zinc-700 hover:bg-zinc-100" wire:click="startEdit({{ $m->id }})" aria-label="{{ $m->naam }} bewerken">Bewerken</button>
                                    @if($archived)
                                        <button type="button" class="{{ $btnSmall }} {{ $actionSlot }} text-zinc-700 hover:bg-zinc-100" wire:click="restoreModule({{ $m->id }})" wire:loading.attr="disabled" wire:target="restoreModule({{ $m->id }})" aria-label="{{ $m->naam }} herstellen">Herstellen</button>
                                    @elseif($supportsArchive)
                                        <button type="button" class="{{ $btnSmall }} {{ $actionSlot }} text-amber-800 hover:bg-amber-50" aria-label="{{ $m->naam }} archiveren"
                                                @click="ask('archiveModule', {{ $m->id }}, 'Module archiveren?', 'Bestaande klanten houden de module, maar je kunt hem niet meer kiezen bij nieuwe koppelingen.', 'Archiveren')">Archiveren</button>
                                    @elseif($inUse > 0)
                                        <span class="{{ $actionSlot }} inline-flex items-center text-xs text-zinc-400" title="Draai de nieuwste migraties om archiveren mogelijk te maken.">In gebruik</span>
                                    @else
                                        <span class="{{ $actionSlot }}" aria-hidden="true"></span>
                                    @endif
                                    @if(! $archived && $inUse === 0)
                                        <button type="button" class="{{ $btnSmall }} {{ $actionSlot }} text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-600" aria-label="{{ $m->naam }} verwijderen"
                                                @click="ask('deleteModule', {{ $m->id }}, 'Module verwijderen?', 'Weet je zeker dat je deze module wilt verwijderen? Dit kan niet ongedaan worden gemaakt.', 'Verwijderen', true)">Verwijderen</button>
                                    @else
                                        <span class="{{ $actionSlot }}" aria-hidden="true"></span>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif

    <div
        x-cloak
        x-show="confirmOpen"
        x-transition.opacity.duration.150ms
        class="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 px-4 py-6 backdrop-blur-sm sm:items-center"
        @click.self="closeConfirm()"
        style="display: none;"
    >
        <div class="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
             role="alertdialog" aria-modal="true" aria-labelledby="module-confirm-title" aria-describedby="module-confirm-message"
             x-trap.noscroll="confirmOpen">
            <div class="px-5 pb-4 pt-5">
                <h2 id="module-confirm-title" class="text-base font-semibold text-zinc-900" x-text="confirmTitle"></h2>
                <p id="module-confirm-message" class="mt-2 text-sm text-zinc-600" x-text="confirmMessage"></p>
            </div>
            <div class="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3">
                <button type="button" x-ref="confirmCancel" class="{{ $btnSecondary }}" @click="closeConfirm()">Annuleren</button>
                <button
                    type="button"
                    class="inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    :class="confirmDanger ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600' : 'bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-700'"
                    @click="runConfirm()"
                    x-text="confirmLabel"
                ></button>
            </div>
        </div>
    </div>
</div>
