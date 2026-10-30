@props(['tone' => 'neutral', 'dot' => false])
{{-- Pil-label: <x-badge tone="success" dot>Actief</x-badge>. Tones: neutral, brand, success, warning, danger, info. --}}
@php
    $badgeTone = in_array($tone, ['neutral', 'brand', 'success', 'warning', 'danger', 'info'], true) ? $tone : 'neutral';
    $badgeDot = ['neutral' => 'bg-zinc-400', 'brand' => 'bg-indigo-500', 'success' => 'bg-emerald-500', 'warning' => 'bg-amber-500', 'danger' => 'bg-rose-500', 'info' => 'bg-sky-500'][$badgeTone];
@endphp
<span {{ $attributes->class(['badge', 'badge-'.$badgeTone]) }}>@if ($dot)<span class="h-1.5 w-1.5 rounded-full {{ $badgeDot }}" aria-hidden="true"></span>@endif{{ $slot }}</span>
