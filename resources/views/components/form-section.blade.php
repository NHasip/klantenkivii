@props(['submit', 'action' => null])

{{-- Kaart met kop, formulier en actiebalk (design foundation: .card, .card-body, .card-footer). --}}
<div {{ $attributes->merge(['class' => 'card overflow-hidden']) }}>
    @if($action)
        <form method="POST" action="{{ $action }}">
            @csrf
    @else
        <form wire:submit.prevent="{{ $submit }}">
    @endif
        <div class="card-body">
            <x-section-title>
                <x-slot name="title">{{ $title }}</x-slot>
                <x-slot name="description">{{ $description }}</x-slot>
            </x-section-title>

            <div class="mt-5 grid grid-cols-6 gap-4">
                {{ $form }}
            </div>
        </div>

        @if (isset($actions))
            <div class="card-footer gap-3 rounded-b-none">
                {{ $actions }}
            </div>
        @endif
    </form>
</div>
