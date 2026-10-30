@php($company = $reminder->garageCompany)
@php($font = "font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;")
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Herinnering: {{ $reminder->titel }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f2; -webkit-text-size-adjust: 100%;">
    {{-- Voorbeeldtekst in de inbox --}}
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">{{ \Illuminate\Support\Str::limit($reminder->message ?: $reminder->titel, 110) }}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f2;">
        <tr>
            <td align="center" style="padding: 32px 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
                    {{-- Merk --}}
                    <tr>
                        <td style="padding: 0 4px 16px; {{ $font }}">
                            <img src="{{ asset('brand/kivii-mark.png') }}" alt="{{ config('app.name', 'Kivii') }}" height="28" style="display: block; height: 28px; width: auto; border: 0;">
                        </td>
                    </tr>

                    {{-- Kaart --}}
                    <tr>
                        <td style="background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; {{ $font }} color: #18181b; line-height: 1.55;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="height: 4px; line-height: 4px; font-size: 0; background-color: #aec22b; border-radius: 16px 16px 0 0;">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td style="padding: 28px 28px 0;">
                                        <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; background-color: #f4f8de; color: #474f15; font-size: 12px; font-weight: 600;">Herinnering</span>
                                        <h1 style="margin: 12px 0 0; font-size: 22px; line-height: 1.3; font-weight: 600; letter-spacing: -0.01em; color: #18181b;">{{ $reminder->titel }}</h1>
                                    </td>
                                </tr>
                                @if($reminder->message)
                                    <tr>
                                        <td style="padding: 12px 28px 0; font-size: 15px; color: #3f3f46;">
                                            <p style="margin: 0; white-space: pre-wrap;">{{ $reminder->message }}</p>
                                        </td>
                                    </tr>
                                @endif
                                <tr>
                                    <td style="padding: 20px 28px 0;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border: 1px solid #f0f0f1; border-radius: 12px; font-size: 14px;">
                                            <tr>
                                                <td style="padding: 12px 16px 4px; width: 72px; color: #71717a; vertical-align: top;">Tijd</td>
                                                <td style="padding: 12px 16px 4px 0; color: #18181b; font-weight: 600;">{{ $reminder->remind_at?->format('d-m-Y H:i') ?? '-' }}</td>
                                            </tr>
                                            @if($company)
                                                <tr>
                                                    <td style="padding: 4px 16px 12px; color: #71717a; vertical-align: top;">Klant</td>
                                                    <td style="padding: 4px 16px 12px 0; color: #18181b; font-weight: 600;">{{ $company->bedrijfsnaam }}</td>
                                                </tr>
                                            @else
                                                <tr><td colspan="2" style="height: 8px; line-height: 8px; font-size: 0;">&nbsp;</td></tr>
                                            @endif
                                        </table>
                                    </td>
                                </tr>
                                @if($company)
                                    <tr>
                                        <td style="padding: 24px 28px 0;">
                                            <table role="presentation" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="border-radius: 10px; background-color: #667319;">
                                                        <a href="{{ route('crm.garage_companies.show', $company) }}" style="display: inline-block; padding: 12px 20px; border-radius: 10px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none;">Klant openen in CRM</a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                @endif
                                <tr>
                                    <td style="padding: 28px 28px 24px; font-size: 13px; color: #71717a;">
                                        Je krijgt deze mail omdat je een herinnering hebt ingesteld in het CRM.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Voet --}}
                    <tr>
                        <td align="center" style="padding: 20px 12px 0; {{ $font }} font-size: 12px; color: #a1a1aa;">
                            Automatisch verzonden door {{ config('app.name') }}.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
