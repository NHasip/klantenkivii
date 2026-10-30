@props(['name' => '', 'size' => 'md', 'label' => null])
{{-- Avatar met initialen en vaste zachte kleur per naam. Zelfde algoritme als Avatar in resources/js/components/ui.jsx. --}}
@php
    $avatarColors = ['bg-indigo-100 text-indigo-800', 'bg-emerald-100 text-emerald-800', 'bg-sky-100 text-sky-800', 'bg-amber-100 text-amber-900', 'bg-rose-100 text-rose-800', 'bg-violet-100 text-violet-800', 'bg-teal-100 text-teal-800', 'bg-orange-100 text-orange-900'];
    $avatarSizes = ['xs' => 'h-6 w-6 text-[10px]', 'sm' => 'h-8 w-8 text-xs', 'md' => 'h-10 w-10 text-sm', 'lg' => 'h-12 w-12 text-base', 'xl' => 'h-16 w-16 text-lg'];
    $avatarName = trim((string) $name);
    $avatarHash = 0;
    foreach (mb_str_split(mb_strtolower($avatarName)) as $avatarChar) {
        $avatarHash = ($avatarHash * 31 + mb_ord($avatarChar)) % 4294967296;
    }
    $avatarInitials = collect(preg_split('/\s+/u', $avatarName) ?: [])->filter()->take(2)->map(fn ($part) => mb_strtoupper(mb_substr($part, 0, 1)))->implode('') ?: '?';
@endphp
<span @if ($label) role="img" aria-label="{{ $label }}" @else aria-hidden="true" @endif
      {{ $attributes->class(['inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-1 ring-inset ring-black/5', $avatarSizes[$size] ?? $avatarSizes['md'], $avatarColors[$avatarHash % count($avatarColors)]]) }}>{{ $avatarInitials }}</span>
