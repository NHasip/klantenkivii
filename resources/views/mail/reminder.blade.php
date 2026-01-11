@php($company = $reminder->garageCompany)
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5;">
    <h2 style="margin: 0 0 12px;">Reminder: {{ $reminder->titel }}</h2>

    @if($reminder->message)
        <p style="margin: 0 0 12px; white-space: pre-wrap;">{{ $reminder->message }}</p>
    @endif

    <p style="margin: 0 0 12px; color: #555;">
        Tijd: {{ $reminder->remind_at?->format('d-m-Y H:i') }}
    </p>

    @if($company)
        <p style="margin: 0 0 12px;">
            Klant: <strong>{{ $company->bedrijfsnaam }}</strong><br>
            <a href="{{ route('crm.garage_companies.show', $company) }}">Open in CRM</a>
        </p>
    @endif

    <p style="margin: 0; color: #777; font-size: 12px;">
        Verzonden door {{ config('app.name') }}.
    </p>
</div>
