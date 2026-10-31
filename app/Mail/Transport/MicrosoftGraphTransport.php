<?php

namespace App\Mail\Transport;

use App\Services\Mail\MicrosoftGraphMailer;
use Psr\EventDispatcher\EventDispatcherInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\MessageConverter;
use Symfony\Component\Mime\Part\DataPart;
use Throwable;

/**
 * Laravel-mailtransport ("msgraph"): elke mail van het CRM (Mailables, notificaties, wachtwoordreset,
 * wachtrij) gaat via Microsoft Graph vanuit de mailbox info@kivii.nl, met kopie in Verzonden items.
 *
 * - De afzender uit de mail zelf wordt genegeerd: er wordt altijd verstuurd als "Kivii <info@kivii.nl>".
 * - Graph kent maar een body per bericht: HTML als die er is, anders platte tekst.
 * - Geen SMTP-fallback: zonder koppeling volgt een duidelijke Nederlandse fout, zodat de aanroeper die logt.
 */
class MicrosoftGraphTransport extends AbstractTransport
{
    /** Graph sendMail accepteert ca. 4 MB JSON; base64 maakt bijlagen ongeveer een derde groter. */
    private const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

    public function __construct(
        private readonly MicrosoftGraphMailer $graph,
        ?EventDispatcherInterface $dispatcher = null,
        ?LoggerInterface $logger = null,
    ) {
        parent::__construct($dispatcher, $logger);
    }

    protected function doSend(SentMessage $message): void
    {
        if (! MicrosoftGraphMailer::isConfigured()) {
            throw new TransportException('De Microsoft-koppeling voor '.MicrosoftGraphMailer::sender().' is nog niet ingesteld. De e-mail is niet verstuurd.');
        }

        $original = $message->getOriginalMessage();
        try {
            $email = $original instanceof Email ? $original : MessageConverter::toEmail($original);
        } catch (Throwable $e) {
            throw new TransportException('Deze e-mail kan niet via Microsoft 365 worden verstuurd: het berichtformaat wordt niet ondersteund.', 0, $e);
        }

        $payload = $this->payload($email, $message->getEnvelope());

        try {
            $this->graph->sendMessage($payload);
        } catch (Throwable $e) {
            // De Nederlandse melding van de mailer behouden; het e-maillog vertaalt die verder (humanError).
            throw new TransportException($e->getMessage(), 0, $e);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Email $email, Envelope $envelope): array
    {
        $to = $this->recipients($email->getTo());
        $cc = $this->recipients($email->getCc());
        $bcc = $this->recipients($email->getBcc());

        // Envelope-ontvangers die niet in de headers staan, alsnog (onzichtbaar) als bcc meesturen.
        $known = array_map(fn (array $r) => mb_strtolower($r['emailAddress']['address']), [...$to, ...$cc, ...$bcc]);
        foreach ($envelope->getRecipients() as $recipient) {
            $address = mb_strtolower($recipient->getAddress());
            if (! in_array($address, $known, true)) {
                $bcc[] = $this->recipient($recipient);
                $known[] = $address;
            }
        }

        if ($to === [] && $cc === [] && $bcc === []) {
            throw new TransportException('De e-mail heeft geen ontvanger en is niet verstuurd.');
        }

        $html = $this->bodyString($email->getHtmlBody(), $email->getHtmlCharset());
        $text = $this->bodyString($email->getTextBody(), $email->getTextCharset());

        $replyTo = $this->recipients($email->getReplyTo());
        if ($replyTo === []) {
            $replyTo = [$this->recipient(new Address(MicrosoftGraphMailer::sender(), MicrosoftGraphMailer::SENDER_NAME))];
        }

        $message = [
            'subject' => (string) $email->getSubject(),
            'body' => $html !== null && trim($html) !== ''
                ? ['contentType' => 'HTML', 'content' => $html]
                : ['contentType' => 'Text', 'content' => (string) $text],
            'toRecipients' => $to,
            'ccRecipients' => $cc,
            'bccRecipients' => $bcc,
            'replyTo' => $replyTo,
        ];

        $importance = match ($email->getPriority()) {
            Email::PRIORITY_HIGHEST, Email::PRIORITY_HIGH => 'high',
            Email::PRIORITY_LOW, Email::PRIORITY_LOWEST => 'low',
            default => null,
        };
        if ($importance !== null) {
            $message['importance'] = $importance;
        }

        $attachments = $this->attachments($email);
        if ($attachments !== []) {
            $message['attachments'] = $attachments;
        }

        return $message;
    }

    /**
     * @param  Address[]  $addresses
     * @return list<array{emailAddress: array{address: string, name?: string}}>
     */
    private function recipients(array $addresses): array
    {
        return array_values(array_map(fn (Address $a) => $this->recipient($a), $addresses));
    }

    /**
     * @return array{emailAddress: array{address: string, name?: string}}
     */
    private function recipient(Address $address): array
    {
        $entry = ['address' => $address->getAddress()];
        if ($address->getName() !== '') {
            $entry['name'] = $address->getName();
        }

        return ['emailAddress' => $entry];
    }

    /**
     * @param  resource|string|null  $body
     */
    private function bodyString($body, ?string $charset): ?string
    {
        if ($body === null) {
            return null;
        }
        if (is_resource($body)) {
            if (stream_get_meta_data($body)['seekable'] ?? false) {
                rewind($body);
            }
            $body = (string) stream_get_contents($body);
        }
        $body = (string) $body;

        if ($charset !== null && $charset !== '' && strcasecmp($charset, 'utf-8') !== 0) {
            $converted = @mb_convert_encoding($body, 'UTF-8', $charset);
            if (is_string($converted)) {
                $body = $converted;
            }
        }

        return $body;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function attachments(Email $email): array
    {
        $result = [];
        $total = 0;

        foreach ($email->getAttachments() as $part) {
            if (! $part instanceof DataPart) {
                continue;
            }

            $content = $part->getBody();
            $total += strlen($content);
            if ($total > self::MAX_ATTACHMENT_BYTES) {
                throw new TransportException('De bijlagen zijn te groot om via Microsoft 365 te versturen (maximaal ongeveer 3 MB per e-mail). De e-mail is niet verstuurd.');
            }

            $name = $part->getFilename() ?: ($part->getName() ?: 'bijlage');
            $attachment = [
                '@odata.type' => '#microsoft.graph.fileAttachment',
                'name' => $name,
                'contentType' => $part->getContentType(),
                'contentBytes' => base64_encode($content),
            ];

            if ($part->getDisposition() === 'inline') {
                // HTML verwijst naar "cid:<naam>" zolang Symfony nog geen eigen Content-ID heeft gezet.
                $attachment['isInline'] = true;
                $attachment['contentId'] = $part->hasContentId() ? $part->getContentId() : $name;
            }

            $result[] = $attachment;
        }

        return $result;
    }

    public function __toString(): string
    {
        return 'msgraph://'.MicrosoftGraphMailer::sender();
    }
}
