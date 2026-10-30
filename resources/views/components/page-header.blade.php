@props(['title', 'description' => null, 'backHref' => null, 'backLabel' => 'Terug'])
{{--
    Paginakop met h1 (zelfde als PageHeader in ui.jsx).
    <x-page-header title="Gebruikers" description="...">  <x-slot name="actions">..knoppen..</x-slot>  </x-page-header>
    De standaard slot komt onder de beschrijving (badges, meta).
--}}
<div {{ $attributes->class(['mb-6 sm:mb-8']) }}>
    @if ($backHref)
        <a href="{{ $backHref }}" class="focus-ring mb-3 inline-flex items-center gap-1 rounded-md text-sm font-medium text-zinc-500 hover:text-zinc-900">
            <x-icon name="arrow-left" class="h-4 w-4" />
            {{ $backLabel }}
        </a>
    @endif
    <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
            <h1 class="page-title">{{ $title }}</h1>
            @if ($description)
                <p class="page-description">{{ $description }}</p>
            @endif
            {{ $slot }}
        </div>
        @isset($actions)
            <div class="flex flex-wrap items-center gap-2">{{ $actions }}</div>
        @endisset
    </div>
</div>
