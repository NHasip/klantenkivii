@props(['danger' => false])

{{-- Kaart met kop en inhoud (design foundation: .card). danger = rode rand voor destructieve secties. --}}
<div {{ $attributes->class(['card card-body', '!border-rose-200' => $danger]) }}>
    <x-section-title>
        <x-slot name="title">{{ $title }}</x-slot>
        <x-slot name="description">{{ $description }}</x-slot>
        @isset($aside)
            <x-slot name="aside">{{ $aside }}</x-slot>
        @endisset
    </x-section-title>

    <div class="mt-5">
        {{ $content }}
    </div>
</div>
