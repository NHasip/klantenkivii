@props(['submit', 'action' => null])

{{-- Kaart met kop, formulier en actiebalk (huisstijl: rounded-xl, zinc, shadow-sm). --}}
<div {{ $attributes->merge(['class' => 'min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm']) }}>
    @if($action)
        <form method="POST" action="{{ $action }}">
            @csrf
    @else
        <form wire:submit.prevent="{{ $submit }}">
    @endif
        <div class="p-4 sm:p-5">
            <x-section-title>
                <x-slot name="title">{{ $title }}</x-slot>
                <x-slot name="description">{{ $description }}</x-slot>
            </x-section-title>

            <div class="mt-5 grid grid-cols-6 gap-4">
                {{ $form }}
            </div>
        </div>

        @if (isset($actions))
            <div class="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/70 px-4 py-3 sm:px-5">
                {{ $actions }}
            </div>
        @endif
    </form>
</div>
