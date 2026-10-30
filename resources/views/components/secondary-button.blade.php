@props(['size' => null])
{{-- Secundaire knop (type button). size: xs | sm | lg. --}}
<button {{ $attributes->class(['btn btn-secondary', $size ? 'btn-'.$size : null])->merge(['type' => 'button']) }}>
    {{ $slot }}
</button>
