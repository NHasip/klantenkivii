@props(['on'])

<div x-data="{ shown: false, timeout: null }"
    x-init="@this.on('{{ $on }}', () => { clearTimeout(timeout); shown = true; timeout = setTimeout(() => { shown = false }, 2500); })"
    x-show="shown"
    x-transition:leave.opacity.duration.1000ms
    style="display: none;"
    role="status"
    {{ $attributes->merge(['class' => 'inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700']) }}>
    <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" /></svg>
    {{ $slot->isEmpty() ? 'Opgeslagen.' : $slot }}
</div>
