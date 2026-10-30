@props(['padded' => true, 'as' => 'section'])
{{--
    Kaart (zelfde als Card in ui.jsx): <x-card>...</x-card>, zonder padding: <x-card :padded="false">.
    Optionele slots: header (titel/acties, met scheidingslijn) en footer (actiebalk).
--}}
<{{ $as }} {{ $attributes->class(['card']) }}>
    @isset($header)
        <div {{ $header->attributes->class(['card-header']) }}>{{ $header }}</div>
    @endisset
    @if ($padded)
        <div class="card-body">{{ $slot }}</div>
    @else
        {{ $slot }}
    @endif
    @isset($footer)
        <div {{ $footer->attributes->class(['card-footer']) }}>{{ $footer }}</div>
    @endisset
</{{ $as }}>
