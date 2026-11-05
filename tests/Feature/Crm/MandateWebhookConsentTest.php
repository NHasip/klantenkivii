<?php

namespace Tests\Feature\Crm;

use App\Models\SepaMandateRequest;
use App\Services\Mail\MicrosoftGraphMailer;
use App\Services\Sepa\MandateRequestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class MandateWebhookConsentTest extends TestCase
{
    use RefreshDatabase;

    private array $sent = [];

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.msgraph.tenant_id' => 't', 'services.msgraph.client_id' => 'c',
            'services.msgraph.client_secret' => 's', 'services.msgraph.sender' => 'info@kivii.nl',
        ]);
        $mailer = Mockery::mock(MicrosoftGraphMailer::class);
        $mailer->shouldReceive('send')->andReturnUsing(function (...$args) {
            $this->sent[] = $args;
        });
        $this->app->instance(MicrosoftGraphMailer::class, $mailer);
    }

    /** Elementor "eenvoudige" webhook: velden onder hun label. */
    private function labelPayload(bool $akkoord): array
    {
        $p = [
            'Bedrijfsnaam' => 'Master Auto Service',
            'Voor- en achternaam' => 'Test Persoon',
            'Straat en huisnummer' => 'Teststraat 1',
            'Postcode' => '1234 AB',
            'Plaats' => 'Almere',
            'IBAN' => 'NL91ABNA0417164300',
            'E-mailadres' => 'test@example.test',
            'Telefoonnummer' => '0612345678',
            'Plaats van tekenen' => 'Almere',
            'Datum van tekenen' => '2026-11-05',
        ];
        if ($akkoord) {
            $p['Ik machtig Kivii voor doorlopende SEPA-incasso en ga akkoord'] = 'on';
        }

        return $p;
    }

    public function test_consent_under_label_is_recognised(): void
    {
        $result = app(MandateRequestService::class)->ingest($this->labelPayload(true));
        $req = $result['request']->fresh();

        $this->assertNotSame(SepaMandateRequest::STATUS_FOUT, $req->status);
        $this->assertNotSame('Akkoord ontbreekt', $req->error);
        $this->assertSame('Almere', $req->payload['plaats_van_tekenen']);
    }

    public function test_advanced_payload_with_field_ids_is_recognised(): void
    {
        $result = app(MandateRequestService::class)->ingest(['form_fields' => [
            'bedrijf' => 'X BV', 'naam' => 'A B', 'iban' => 'NL91ABNA0417164300', 'email' => 'x@example.test',
            'plaats_tekenen' => 'Utrecht', 'kenmerk' => '', 'akkoord' => 'on',
        ]]);
        $req = $result['request']->fresh();

        $this->assertNotSame(SepaMandateRequest::STATUS_FOUT, $req->status);
        $this->assertSame('Utrecht', $req->payload['plaats_van_tekenen']);
    }

    public function test_missing_consent_is_still_rejected(): void
    {
        $result = app(MandateRequestService::class)->ingest($this->labelPayload(false));
        $req = $result['request']->fresh();

        $this->assertSame(SepaMandateRequest::STATUS_FOUT, $req->status);
        $this->assertSame('Akkoord ontbreekt', $req->error);
    }

    public function test_kenmerk_field_is_not_mistaken_for_consent(): void
    {
        $this->assertNull(MandateRequestService::findConsent(['kenmerk_machtiging' => 'KIVII-ABC']));
        $this->assertSame('on', MandateRequestService::findConsent(['ik_machtig_kivii_voor_doorlopende_sepa_incasso_en_ga_akkoord' => 'on']));
    }

    public function test_notification_mail_goes_to_info_without_full_iban(): void
    {
        app(MandateRequestService::class)->ingest($this->labelPayload(true));

        $this->assertCount(1, $this->sent);
        [$to, $subject, $html, $replyTo] = $this->sent[0];
        $this->assertSame('info@kivii.nl', $to);
        $this->assertStringContainsString('Master Auto Service', $subject);
        $this->assertStringContainsString('Teststraat 1', $html);
        $this->assertStringContainsString('**** 4300', $html);
        $this->assertStringNotContainsString('NL91ABNA0417164300', $html);
        $this->assertStringContainsString('Akkoord SEPA-incasso', $html);
        $this->assertSame('test@example.test', $replyTo);
    }

    public function test_form_fields_are_in_row_data(): void
    {
        $result = app(MandateRequestService::class)->ingest($this->labelPayload(true));
        $fields = collect(MandateRequestService::formFieldList($result['request']->fresh()->payload))->pluck('value', 'key');

        $this->assertSame('Teststraat 1', $fields['adres']);
        $this->assertSame('Ja', $fields['akkoord']);
        $this->assertSame('**** 4300', $fields['iban_laatste4']);
    }
}
