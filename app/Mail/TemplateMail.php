<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TemplateMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public string $subjectLine;
    public ?string $htmlBody;
    public ?string $textBody;
    public ?string $fromAddress;
    public ?string $fromName;

    public function __construct(string $subjectLine, ?string $htmlBody, ?string $textBody, ?string $fromAddress = null, ?string $fromName = null)
    {
        $this->subjectLine = $subjectLine;
        $this->htmlBody = $htmlBody;
        $this->textBody = $textBody;
        $this->fromAddress = $fromAddress;
        $this->fromName = $fromName;
    }

    public function build(): self
    {
        $mail = $this->subject($this->subjectLine);

        if ($this->fromAddress) {
            $mail->from($this->fromAddress, $this->fromName ?: null);
        }

        if ($this->htmlBody) {
            $mail->html($this->htmlBody);
        }

        if ($this->textBody) {
            $mail->text('mail.plain', ['content' => $this->textBody]);
        }

        return $mail;
    }
}
