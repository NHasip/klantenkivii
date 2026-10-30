@props(['title', 'description' => null, 'backHref' => null, 'backLabel' => 'Terug', 'icon' => null])
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
        <div class="flex min-w-0 items-start gap-3">
            @if ($icon)
                <span class="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100" aria-hidden="true">
                    <x-icon :name="$icon" class="h-5 w-5" />
                </span>
            @endif
        <div class="min-w-0">
            <h1 class="page-title">{{ $title }}</h1>
            @if ($description)
                <p class="page-description">{{ $description }}</p>
            @endif
            {{ $slot }}
        </div>
        </div>
        @isset($actions)
            <div class="flex flex-wrap items-center gap-2">{{ $actions }}</div>
        @endisset
    </div>
</div>
