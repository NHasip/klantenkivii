@props(['value' => null, 'required' => false])

<label {{ $attributes->merge(['class' => 'label']) }}>
    {{ $value ?? $slot }}@if ($required)<span class="ml-0.5 text-rose-600" aria-hidden="true">*</span>@endif
</label>
