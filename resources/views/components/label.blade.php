@props(['value' => null, 'required' => false])

<label {{ $attributes->merge(['class' => 'block text-sm font-medium text-zinc-800']) }}>
    {{ $value ?? $slot }}@if ($required)<span class="ml-0.5 text-rose-600" aria-hidden="true">*</span>@endif
</label>
