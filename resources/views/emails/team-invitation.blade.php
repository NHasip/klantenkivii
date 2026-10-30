@component('mail::message')
Je bent uitgenodigd voor het team {{ $invitation->team->name }}.

@if (Laravel\Fortify\Features::enabled(Laravel\Fortify\Features::registration()))
Heb je nog geen account? Maak er dan eerst een aan met de knop hieronder. Daarna kun je de uitnodiging in deze e-mail accepteren.

@component('mail::button', ['url' => route('register')])
Account aanmaken
@endcomponent

Heb je al een account? Accepteer de uitnodiging dan met de knop hieronder.

@else
Accepteer de uitnodiging met de knop hieronder.
@endif


@component('mail::button', ['url' => $acceptUrl])
Uitnodiging accepteren
@endcomponent

Had je deze uitnodiging niet verwacht? Dan kun je deze e-mail negeren.
@endcomponent
