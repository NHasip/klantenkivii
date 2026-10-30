@props(['name', 'title' => null, 'strokeWidth' => 1.75])
{{--
    Kivii icoon (24px lijnicoon). Zelfde set als resources/js/components/icons.jsx (bron: icons.json).
    Gebruik: <x-icon name="users" class="h-4 w-4 text-zinc-500" />  |  met title="..." wordt het icoon aangekondigd.
--}}
@php
    $kiviiIcons = once(fn () => json_decode((string) @file_get_contents(resource_path('js/components/icons.json')), true) ?: []);
    $kiviiIconBody = $kiviiIcons[$name] ?? null;
    // Zonder class krijgt het icoon h-5 w-5; geef je zelf een class mee, geef dan ook de maat (bijv. h-4 w-4).
@endphp
@if ($kiviiIconBody !== null)
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{{ $strokeWidth }}" stroke-linecap="round" stroke-linejoin="round"
     @if ($title) role="img" aria-label="{{ $title }}" @else aria-hidden="true" focusable="false" @endif
     {{ $attributes->class(['shrink-0', 'h-5 w-5' => ! $attributes->has('class')]) }}>@if ($title)<title>{{ $title }}</title>@endif{!! $kiviiIconBody !!}</svg>
@endif
