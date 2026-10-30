@props(['size' => null])
{{-- Destructieve knop (type button). size: xs | sm | lg. --}}
<button {{ $attributes->class(['btn btn-danger', $size ? 'btn-'.$size : null])->merge(['type' => 'button']) }}>
    {{ $slot }}
</button>
