<?php

namespace App\Livewire\Profile;

use App\Http\Controllers\Crm\EmailLogController;
use App\Mail\TemplateMail;
use App\Services\EmailTemplateRenderer;
use App\Services\Mail\MicrosoftGraphMailer;
use Illuminate\Support\Facades\Mail;
use Livewire\Component;

/**
 * Systeem-e-mail: alleen een status van de Microsoft 365-koppeling (info@kivii.nl) en een testmail.
 * SMTP is bewust niet meer instelbaar; alle uitgaande mail gaat via Microsoft Graph.
 */
class AdminSystemSettings extends Component
{
    public string $testEmail = '';

    /**
     * Draait bij elke request (ook Livewire-acties), niet alleen bij mount:
     * zo kan een gedegradeerde gebruiker geen oude snapshot meer gebruiken.
     */
    public function boot(): void
    {
        abort_unless(auth()->user()?->isAdmin(), 403);
    }

    public function mount(): void
    {
        $this->testEmail = auth()->user()?->email ?? '';
    }

    public function sendTestEmail(): void
    {
        $this->validate(['testEmail' => ['required', 'email']]);

        if (! MicrosoftGraphMailer::isConfigured()) {
            $this->addError('testEmail', 'De Microsoft 365-koppeling voor '.MicrosoftGraphMailer::sender().' is nog niet ingesteld. Er is niets verstuurd.');

            return;
        }

        $rendered = EmailTemplateRenderer::renderString(
            'Dit is een testmail van Kivii CRM, verstuurd via Microsoft 365 vanuit '.MicrosoftGraphMailer::sender().'.',
            EmailTemplateRenderer::sampleData()
        );

        try {
            // Via de standaardmailer (msgraph): test zo precies de route die alle CRM-mail gebruikt.
            Mail::to($this->testEmail)->send(new TemplateMail(
                'Kivii CRM testmail (Microsoft 365)',
                '<p>'.e($rendered).'</p>',
                $rendered
            ));
        } catch (\Throwable $e) {
            report($e);
            $this->addError('testEmail', 'Testmail versturen mislukt: '.(EmailLogController::humanError($e->getMessage()) ?? $e->getMessage()));

            return;
        }

        $this->dispatch('test-mail-sent');
        $this->dispatch('notify', message: 'Testmail verstuurd.');
    }

    public function render()
    {
        // Templatebeheer staat op /email-templates (CRM-pagina); hier alleen de verzendstatus.
        return view('livewire.profile.admin-system-settings', [
            'templatesUrl' => route('crm.email_templates.index'),
            'graphConfigured' => MicrosoftGraphMailer::isConfigured(),
            'sender' => MicrosoftGraphMailer::sender(),
            'senderName' => MicrosoftGraphMailer::SENDER_NAME,
            'emailLogUrl' => route('crm.email_log.index'),
        ]);
    }
}
