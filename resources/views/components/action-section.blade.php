@props(['danger' => false])

{{-- Kaart met kop en inhoud (huisstijl: rounded-xl, zinc, shadow-sm). --}}
<div {{ $attributes->class(['min-w-0 rounded-xl border bg-white p-4 shadow-sm sm:p-5', 'border-rose-200' => $danger, 'border-zinc-200' => ! $danger]) }}>
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
