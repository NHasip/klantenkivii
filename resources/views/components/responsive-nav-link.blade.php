@props(['active'])

@php
$classes = ($active ?? false)
            ? 'block w-full rounded-lg bg-zinc-100 px-3 py-2.5 text-start text-sm font-medium text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600'
            : 'block w-full rounded-lg px-3 py-2.5 text-start text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
@endphp

<a {{ $attributes->merge(['class' => $classes]) }} @if($active ?? false) aria-current="page" @endif>
    {{ $slot }}
</a>
