@props(['size' => null])
{{-- Primaire knop (type submit). size: xs | sm | lg. Gebruik maximaal een primaire knop per weergave. --}}
<button {{ $attributes->class(['btn btn-primary', $size ? 'btn-'.$size : null])->merge(['type' => 'submit']) }}>
    {{ $slot }}
</button>
