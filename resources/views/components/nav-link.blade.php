@props(['active'])

@php
$classes = ($active ?? false)
            ? 'nav-item'
            : 'nav-item';
@endphp

<a {{ $attributes->merge(['class' => $classes]) }} @if($active ?? false) aria-current="page" @endif>
    {{ $slot }}
</a>
