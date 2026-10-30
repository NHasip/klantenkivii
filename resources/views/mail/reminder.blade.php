@php($company = $reminder->garageCompany)
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Herinnering: {{ $reminder->titel }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
        <tr>
            <td align="center" style="padding: 24px 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #18181b; line-height: 1.5;">
                    <tr>
                        <td style="padding: 20px 24px 0;">
                            <p style="margin: 0; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #667319;">Herinnering</p>
                            <h1 style="margin: 4px 0 0; font-size: 20px; line-height: 1.3; font-weight: 600; color: #18181b;">{{ $reminder->titel }}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 16px 24px 0; font-size: 15px;">
                            @if($reminder->message)
                                <p style="margin: 0 0 16px; white-space: pre-wrap;">{{ $reminder->message }}</p>
                            @endif

                            <table role="presentation" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #3f3f46;">
                                <tr>
                                    <td style="padding: 2px 16px 2px 0; color: #71717a;">Tijd</td>
                                    <td style="padding: 2px 0;">{{ $reminder->remind_at?->format('d-m-Y H:i') ?? '-' }}</td>
                                </tr>
                                @if($company)
                                    <tr>
                                        <td style="padding: 2px 16px 2px 0; color: #71717a;">Klant</td>
                                        <td style="padding: 2px 0; font-weight: 600;">{{ $company->bedrijfsnaam }}</td>
                                    </tr>
                                @endif
                            </table>
                        </td>
                    </tr>
                    @if($company)
                        <tr>
                            <td style="padding: 20px 24px 0;">
                                <a href="{{ route('crm.garage_companies.show', $company) }}" style="display: inline-block; padding: 10px 16px; border-radius: 8px; background-color: #667319; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none;">Klant openen in CRM</a>
                            </td>
                        </tr>
                    @endif
                    <tr>
                        <td style="padding: 24px; font-size: 12px; color: #71717a;">
                            Automatisch verzonden door {{ config('app.name') }}.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
