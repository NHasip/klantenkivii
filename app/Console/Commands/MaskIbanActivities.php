<?php

namespace App\Console\Commands;

use App\Services\Sepa\SepaTools;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Maskeert volledige IBANs in bestaande tijdlijnteksten (activities.inhoud) naar "IBAN eindigend op 1234".
 * Standaard alleen een proefrun; met --apply wordt er echt bijgewerkt. Alleen de kolom inhoud wordt gewijzigd.
 */
class MaskIbanActivities extends Command
{
    protected $signature = 'crm:mask-iban-activities
        {--apply : Daadwerkelijk bijwerken (zonder deze optie alleen tellen en tonen)}';

    protected $description = 'Maskeer volledige IBANs in bestaande tijdlijnnotities (proefrun tenzij --apply).';

    /** Compact (NL91ABNA0417164300) of in groepjes van 4 (NL91 ABNA 0417 1643 00), eventueel met "IBAN:" ervoor. */
    private const PATTERN = '/(?:\bIBAN\s*:?\s*)?\b([A-Z]{2}[0-9]{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?)\b/i';

    public function handle(): int
    {
        if (! Schema::hasTable('activities')) {
            $this->error('Tabel activities bestaat niet.');

            return self::FAILURE;
        }

        $apply = (bool) $this->option('apply');
        $found = 0;
        $changed = 0;

        DB::table('activities')
            ->select(['id', 'inhoud'])
            ->whereNotNull('inhoud')
            ->orderBy('id')
            ->chunkById(500, function ($rows) use ($apply, &$found, &$changed) {
                foreach ($rows as $row) {
                    $masked = self::mask((string) $row->inhoud);
                    if ($masked === $row->inhoud) {
                        continue;
                    }
                    $found++;
                    $this->line("Activiteit #{$row->id}: ".mb_strimwidth($masked, 0, 120, '...'));
                    if ($apply) {
                        DB::table('activities')->where('id', $row->id)->update(['inhoud' => $masked]);
                        $changed++;
                    }
                }
            });

        if ($apply) {
            $this->info("Klaar: {$changed} activiteit(en) gemaskeerd.");
        } else {
            $this->info("Proefrun: {$found} activiteit(en) bevatten een volledige IBAN. Draai met --apply om te maskeren.");
        }

        return self::SUCCESS;
    }

    public static function mask(string $text): string
    {
        return preg_replace_callback(self::PATTERN, function (array $m) {
            // De match kan een volgend woord van 4 tekens meenemen: probeer steeds een groepje minder.
            $parts = explode(' ', $m[1]);
            for ($k = count($parts); $k >= 1; $k--) {
                $iban = SepaTools::normalizeIban(implode('', array_slice($parts, 0, $k)));
                $looksLikeIban = SepaTools::validIban($iban) || preg_match('/^[A-Z]{2}[0-9]{2}[A-Z]{4}[0-9]{7,}$/', $iban) === 1;
                if ($looksLikeIban) {
                    $rest = array_slice($parts, $k);

                    return SepaTools::endingText($iban).($rest !== [] ? ' '.implode(' ', $rest) : '');
                }
            }

            return $m[0];
        }, $text) ?? $text;
    }
}
