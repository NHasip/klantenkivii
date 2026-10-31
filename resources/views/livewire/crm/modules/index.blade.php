@php
    $req = '<span class="text-rose-600" aria-hidden="true">*</span>';
    $actionSlot = 'w-[7.5rem] shrink-0';
    $activeCount = $supportsArchive ? $modules->whereNull('archived_at')->count() : $modules->count();
    $archivedCount = $modules->count() - $activeCount;
    $tileTones = ['bg-indigo-100/80 text-indigo-700', 'bg-emerald-50 text-emerald-700', 'bg-sky-50 text-sky-700', 'bg-amber-50 text-amber-700', 'bg-violet-50 text-violet-700', 'bg-teal-50 text-teal-700'];
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
    <x-page-header title="Modules" icon="layers" description="Modules die je aan klanten kunt koppelen, met standaardprijs en btw.">
        @if($modules->isNotEmpty())
            <div class="mt-3 flex flex-wrap items-center gap-2">
                <x-badge tone="success" dot>{{ $activeCount }} actief</x-badge>
                @if($archivedCount > 0)
                    <x-badge><x-icon name="archive" class="h-3 w-3" />{{ $archivedCount }} gearchiveerd</x-badge>
                @endif
            </div>
        @endif
        <x-slot name="actions">
            @unless($showForm && ! $moduleId)
                <button type="button" class="btn btn-primary" wire:click="startCreate" wire:loading.attr="disabled" wire:target="startCreate">
                    <x-icon name="plus" class="h-4 w-4" />
                    Nieuwe module
                </button>
            @endunless
        </x-slot>
    </x-page-header>

    @if(session('livewire_status'))
        <div role="status" class="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><x-icon name="check-circle" class="mt-0.5 h-4 w-4 text-emerald-600" /><span>{{ session('livewire_status') }}</span></div>
    @endif
    @if(session('livewire_error'))
        <div role="alert" class="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"><x-icon name="alert-circle" class="mt-0.5 h-4 w-4 text-rose-600" /><span>{{ session('livewire_error') }}</span></div>
    @endif

    @if($showForm)
        <section class="card" wire:key="module-form-{{ $moduleId ?? 'new' }}" aria-labelledby="module-form-title"
                 x-init="$nextTick(() => { $el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); $el.querySelector('#module_naam')?.focus() })">
            <form wire:submit="save">
                <div class="card-header">
                    <div class="flex items-center gap-3">
                        <span class="icon-tile h-10 w-10 bg-indigo-100/80 text-indigo-700" aria-hidden="true"><x-icon name="layers" class="h-5 w-5" /></span>
                        <div>
                            <h2 id="module-form-title" class="section-heading">{{ $moduleId ? 'Module bewerken' : 'Nieuwe module' }}</h2>
                            <p class="section-description">Prijs en btw zijn standaardwaarden bij een nieuwe koppeling. Bestaande klanten veranderen niet mee.</p>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                        <div class="sm:col-span-2">
                            <label for="module_naam" class="label">Naam {!! $req !!}</label>
                            <input id="module_naam" class="input mt-1.5" wire:model="naam" required autocomplete="off" @error('naam') aria-invalid="true" @enderror />
                            @error('naam') <p class="field-error">{{ $message }}</p> @enderror
                        </div>
                        @if($supportsDefaultPricing)
                            <div>
                                <label for="module_prijs" class="label">Prijs per maand, excl. btw {!! $req !!}</label>
                                <div class="relative mt-1.5">
                                    <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-500" aria-hidden="true">&euro;</span>
                                    <input id="module_prijs" type="text" inputmode="decimal" class="input pl-7 tabular-nums" wire:model="default_prijs_maand_excl" required autocomplete="off" />
                                </div>
                                @error('default_prijs_maand_excl') <p class="field-error">{{ $message }}</p> @enderror
                            </div>
                            <div>
                                <label for="module_btw" class="label">Btw-percentage {!! $req !!}</label>
                                <div class="relative mt-1.5">
                                    <input id="module_btw" type="text" inputmode="decimal" class="input pr-8 tabular-nums" wire:model="default_btw_percentage" required autocomplete="off" />
                                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-zinc-500" aria-hidden="true">%</span>
                                </div>
                                @error('default_btw_percentage') <p class="field-error">{{ $message }}</p> @enderror
                            </div>
                        @else
                            <div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 sm:col-span-2">
                                <x-icon name="alert-triangle" class="mt-0.5 h-4 w-4 text-amber-600" />
                                Standaard moduleprijzen zijn nog niet beschikbaar. Draai eerst de nieuwste migraties.
                            </div>
                        @endif
                        <div class="sm:col-span-2">
                            <label for="module_omschrijving" class="label">Omschrijving</label>
                            <textarea id="module_omschrijving" class="input mt-1.5" rows="3" wire:model="omschrijving"></textarea>
                            @error('omschrijving') <p class="field-error">{{ $message }}</p> @enderror
                        </div>
                        <div class="sm:col-span-2">
                            <label for="default_visible" class="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-medium text-zinc-800">
                                <input type="checkbox" class="checkbox" wire:model="default_visible" id="default_visible">
                                Standaard zichtbaar bij nieuwe klanten
                            </label>
                        </div>
                    </div>
                </div>

                <div class="card-footer">
                    <button type="button" class="btn btn-secondary" wire:click="cancel">Annuleren</button>
                    <button type="submit" class="btn btn-primary" wire:loading.attr="disabled" wire:target="save">
                        <svg wire:loading wire:target="save" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                        {{ $moduleId ? 'Wijzigingen opslaan' : 'Module toevoegen' }}
                    </button>
                </div>
            </form>
        </section>
    @endif

    @if($modules->isEmpty())
        <div class="card flex flex-col items-center justify-center px-6 py-12 text-center">
            <span class="icon-tile mb-3 h-10 w-10 bg-zinc-100 text-zinc-600" aria-hidden="true"><x-icon name="layers" class="h-5 w-5" /></span>
            <p class="section-heading">Nog geen modules</p>
            <p class="mt-1 max-w-sm text-sm text-zinc-500">Voeg een module toe om hem aan klanten te kunnen koppelen.</p>
            @unless($showForm)
                <button type="button" class="btn btn-primary mt-4" wire:click="startCreate">
                    <x-icon name="plus" class="h-4 w-4" />
                    Eerste module toevoegen
                </button>
            @endunless
        </div>
    @else
        {{-- Kaarten op mobiel --}}
        <ul class="space-y-3 md:hidden" aria-label="Modules ({{ $activeCount }} actief)">
            @foreach($modules as $m)
                @php
                    $inUse = (int) ($usage[$m->id] ?? 0);
                    $archived = $supportsArchive && $m->archived_at !== null;
                @endphp
                <li wire:key="module-card-{{ $m->id }}" @class(['card p-4', 'bg-zinc-50/70' => $archived, 'ring-2 ring-indigo-200' => $moduleId === $m->id])>
                    <div class="flex min-w-0 items-start gap-3">
                        <span @class(['icon-tile mt-0.5 h-8 w-8 shrink-0 rounded-lg', 'bg-zinc-100 text-zinc-400' => $archived, $tileTones[$m->id % count($tileTones)] => ! $archived]) aria-hidden="true">
                            <x-icon :name="$archived ? 'archive' : 'package'" class="h-4 w-4" />
                        </span>
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span @class(['font-semibold', 'text-zinc-900' => ! $archived, 'text-zinc-500' => $archived])>{{ $m->naam }}</span>
                                @if($archived)
                                    <x-badge>Gearchiveerd</x-badge>
                                @endif
                            </div>
                            @if(filled($m->omschrijving))
                                <p class="mt-0.5 text-xs leading-5 text-zinc-500">{{ $m->omschrijving }}</p>
                            @endif
                        </div>
                    </div>
                    <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        @if($supportsDefaultPricing)
                            @php
                                $btw = (float) $m->default_btw_percentage;
                                $btwDecimals = abs($btw - round($btw)) < 0.001 ? 0 : 2;
                            @endphp
                            <div>
                                <dt class="text-xs text-zinc-500">Prijs p/m excl.</dt>
                                <dd class="font-semibold tabular-nums text-zinc-900">&euro; {{ number_format((float) $m->default_prijs_maand_excl, 2, ',', '.') }}</dd>
                            </div>
                            <div>
                                <dt class="text-xs text-zinc-500">Btw</dt>
                                <dd class="tabular-nums text-zinc-800">{{ number_format($btw, $btwDecimals, ',', '.') }}%</dd>
                            </div>
                        @endif
                        <div>
                            <dt class="text-xs text-zinc-500">Klanten</dt>
                            <dd @class(['tabular-nums', 'font-semibold text-zinc-900' => $inUse > 0, 'text-zinc-400' => $inUse === 0])>{{ number_format($inUse, 0, ',', '.') }}</dd>
                        </div>
                        <div>
                            <dt class="text-xs text-zinc-500">Nieuwe klanten</dt>
                            <dd>
                                @if($m->default_visible)
                                    <x-badge tone="info"><x-icon name="eye" class="h-3 w-3" />Zichtbaar</x-badge>
                                @else
                                    <x-badge>Verborgen</x-badge>
                                @endif
                            </dd>
                        </div>
                    </dl>
                    <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
                        <button type="button" class="btn btn-secondary min-h-[44px]" wire:click="startEdit({{ $m->id }})" aria-label="{{ $m->naam }} bewerken">
                            <x-icon name="edit" class="h-4 w-4" />Bewerken
                        </button>
                        @if($archived)
                            <button type="button" class="btn btn-ghost min-h-[44px]" wire:click="restoreModule({{ $m->id }})" wire:loading.attr="disabled" wire:target="restoreModule({{ $m->id }})" aria-label="{{ $m->naam }} herstellen">
                                <x-icon name="refresh" class="h-4 w-4" />Herstellen
                            </button>
                        @elseif($supportsArchive)
                            <button type="button" class="btn btn-ghost min-h-[44px] text-amber-800 hover:bg-amber-50 hover:text-amber-900" aria-label="{{ $m->naam }} archiveren"
                                    @click="ask('archiveModule', {{ $m->id }}, 'Module archiveren?', 'Bestaande klanten houden de module, maar je kunt hem niet meer kiezen bij nieuwe koppelingen.', 'Archiveren')">
                                <x-icon name="archive" class="h-4 w-4" />Archiveren
                            </button>
                        @elseif($inUse > 0)
                            <span class="inline-flex min-h-[44px] items-center text-xs text-zinc-400" title="Draai de nieuwste migraties om archiveren mogelijk te maken.">In gebruik</span>
                        @endif
                        @if(! $archived && $inUse === 0)
                            <button type="button" class="btn btn-danger-ghost btn-icon ml-auto h-11 w-11" aria-label="{{ $m->naam }} verwijderen" title="Verwijderen"
                                    @click="ask('deleteModule', {{ $m->id }}, 'Module verwijderen?', 'Weet je zeker dat je deze module wilt verwijderen? Dit kan niet ongedaan worden gemaakt.', 'Verwijderen', true)">
                                <x-icon name="trash" class="h-4 w-4" />
                            </button>
                        @endif
                    </div>
                </li>
            @endforeach
        </ul>

        <div class="table-wrap hidden md:block">
            <table class="table-base">
                <caption class="sr-only">Modules ({{ $activeCount }} actief)</caption>
                <thead class="table-head">
                    <tr>
                        <th scope="col" class="table-th">Module</th>
                        @if($supportsDefaultPricing)
                            <th scope="col" class="table-th text-right">Prijs p/m excl.</th>
                            <th scope="col" class="table-th hidden text-right sm:table-cell">Btw</th>
                        @endif
                        <th scope="col" class="table-th text-right">Klanten</th>
                        <th scope="col" class="table-th hidden md:table-cell">Nieuwe klanten</th>
                        <th scope="col" class="table-th"><span class="sr-only">Acties</span></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100">
                    @foreach($modules as $m)
                        @php
                            $inUse = (int) ($usage[$m->id] ?? 0);
                            $archived = $supportsArchive && $m->archived_at !== null;
                        @endphp
                        <tr @class(['table-row', 'bg-zinc-50/70' => $archived, 'bg-indigo-50/50' => $moduleId === $m->id]) wire:key="module-{{ $m->id }}">
                            <td class="table-td max-w-md">
                                <div class="flex min-w-0 items-start gap-3">
                                    <span @class(['icon-tile mt-0.5 h-8 w-8 rounded-lg', 'bg-zinc-100 text-zinc-400' => $archived, $tileTones[$m->id % count($tileTones)] => ! $archived]) aria-hidden="true">
                                        <x-icon :name="$archived ? 'archive' : 'package'" class="h-4 w-4" />
                                    </span>
                                    <div class="min-w-0">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span @class(['font-semibold', 'text-zinc-900' => ! $archived, 'text-zinc-500' => $archived])>{{ $m->naam }}</span>
                                            @if($archived)
                                                <x-badge>Gearchiveerd</x-badge>
                                            @endif
                                        </div>
                                        @if(filled($m->omschrijving))
                                            <p class="mt-0.5 line-clamp-2 text-xs leading-5 text-zinc-500" title="{{ $m->omschrijving }}">{{ $m->omschrijving }}</p>
                                        @endif
                                    </div>
                                </div>
                            </td>
                            @if($supportsDefaultPricing)
                                @php
                                    $btw = (float) $m->default_btw_percentage;
                                    $btwDecimals = abs($btw - round($btw)) < 0.001 ? 0 : 2;
                                @endphp
                                <td class="table-td whitespace-nowrap text-right tabular-nums">
                                    <span class="font-semibold text-zinc-900">&euro; {{ number_format((float) $m->default_prijs_maand_excl, 2, ',', '.') }}</span>
                                </td>
                                <td class="table-td hidden whitespace-nowrap text-right tabular-nums sm:table-cell">{{ number_format($btw, $btwDecimals, ',', '.') }}%</td>
                            @endif
                            <td class="table-td whitespace-nowrap text-right">
                                <span @class(['inline-flex items-center gap-1.5 tabular-nums', 'font-semibold text-zinc-900' => $inUse > 0, 'text-zinc-400' => $inUse === 0])>
                                    <x-icon name="building" class="h-3.5 w-3.5 text-zinc-400" />
                                    {{ number_format($inUse, 0, ',', '.') }}
                                    <span class="sr-only">{{ $inUse === 1 ? 'klant' : 'klanten' }}</span>
                                </span>
                            </td>
                            <td class="table-td hidden md:table-cell">
                                @if($m->default_visible)
                                    <x-badge tone="info"><x-icon name="eye" class="h-3 w-3" />Zichtbaar</x-badge>
                                @else
                                    <x-badge>Verborgen</x-badge>
                                @endif
                            </td>
                            <td class="table-td whitespace-nowrap text-right">
                                {{-- Vaste, rechts uitgelijnde groep met drie slots, zodat knoppen per rij onder elkaar staan. --}}
                                <div class="flex items-center justify-end gap-1">
                                    <button type="button" class="btn btn-ghost btn-sm" wire:click="startEdit({{ $m->id }})" aria-label="{{ $m->naam }} bewerken">
                                        <x-icon name="edit" class="h-4 w-4" /><span class="hidden lg:inline">Bewerken</span>
                                    </button>
                                    @if($archived)
                                        <button type="button" class="btn btn-ghost btn-sm {{ $actionSlot }}" wire:click="restoreModule({{ $m->id }})" wire:loading.attr="disabled" wire:target="restoreModule({{ $m->id }})" aria-label="{{ $m->naam }} herstellen">
                                            <x-icon name="refresh" class="h-4 w-4" />Herstellen
                                        </button>
                                    @elseif($supportsArchive)
                                        <button type="button" class="btn btn-ghost btn-sm {{ $actionSlot }} text-amber-800 hover:bg-amber-50 hover:text-amber-900" aria-label="{{ $m->naam }} archiveren"
                                                @click="ask('archiveModule', {{ $m->id }}, 'Module archiveren?', 'Bestaande klanten houden de module, maar je kunt hem niet meer kiezen bij nieuwe koppelingen.', 'Archiveren')">
                                            <x-icon name="archive" class="h-4 w-4" />Archiveren
                                        </button>
                                    @elseif($inUse > 0)
                                        <span class="{{ $actionSlot }} inline-flex items-center justify-center text-xs text-zinc-400" title="Draai de nieuwste migraties om archiveren mogelijk te maken.">In gebruik</span>
                                    @else
                                        <span class="{{ $actionSlot }}" aria-hidden="true"></span>
                                    @endif
                                    @if(! $archived && $inUse === 0)
                                        <button type="button" class="btn btn-danger-ghost btn-icon btn-sm" aria-label="{{ $m->naam }} verwijderen" title="Verwijderen"
                                                @click="ask('deleteModule', {{ $m->id }}, 'Module verwijderen?', 'Weet je zeker dat je deze module wilt verwijderen? Dit kan niet ongedaan worden gemaakt.', 'Verwijderen', true)">
                                            <x-icon name="trash" class="h-4 w-4" />
                                        </button>
                                    @else
                                        <span class="inline-block w-8 shrink-0" aria-hidden="true"></span>
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
        <div class="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-pop"
             role="alertdialog" aria-modal="true" aria-labelledby="module-confirm-title" aria-describedby="module-confirm-message"
             x-trap.noscroll="confirmOpen">
            <div class="flex items-start gap-3 px-5 pb-4 pt-5">
                <span class="icon-tile h-10 w-10" :class="confirmDanger ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'" aria-hidden="true">
                    <x-icon name="alert-triangle" class="h-5 w-5" />
                </span>
                <div class="min-w-0">
                <h2 id="module-confirm-title" class="section-heading" x-text="confirmTitle"></h2>
                <p id="module-confirm-message" class="mt-1 text-sm leading-6 text-zinc-600" x-text="confirmMessage"></p>
                </div>
            </div>
            <div class="card-footer">
                <button type="button" x-ref="confirmCancel" class="btn btn-secondary" @click="closeConfirm()">Annuleren</button>
                <button
                    type="button"
                    class="btn text-white shadow-sm"
                    :class="confirmDanger ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600' : 'bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-700'"
                    @click="runConfirm()"
                    x-text="confirmLabel"
                ></button>
            </div>
        </div>
    </div>
</div>
