<?php

namespace App\Services\Forms;

use Illuminate\Support\Str;

/**
 * Maakt payloads van WordPress-formulieren bruikbaar (gedeeld door de lead- en machtigingswebhook):
 * - Elementor Pro "geavanceerd": fields[veld][value] (met id en title) / form_fields[veld]
 * - Elementor Pro "eenvoudig" en Contact Form 7: platte veldnamen of labels
 * Sleutels worden genormaliseerd: kleine letters, accenten weg, spaties/leestekens worden "_".
 */
class FormPayloadNormalizer
{
    public static function normalizeKey(string $key): string
    {
        $key = mb_strtolower(Str::ascii(trim($key)));
        $key = preg_replace('/[^a-z0-9]+/', '_', $key) ?? $key;

        return trim($key, '_');
    }

    /**
     * @return array<string, mixed> genormaliseerde sleutel => scalaire waarde
     */
    public static function flatten(array $input): array
    {
        $flat = [];
        $put = function (string $key, mixed $value) use (&$flat): void {
            $norm = self::normalizeKey($key);
            if ($norm === '') {
                return;
            }
            if (is_array($value)) {
                $value = implode(', ', array_filter(array_map(fn ($v) => is_scalar($v) ? trim((string) $v) : '', $value), fn ($v) => $v !== ''));
            }
            $value = is_string($value) ? trim($value) : $value;
            // Eerste niet-lege waarde wint, maar een lege waarde mag overschreven worden.
            if (! array_key_exists($norm, $flat) || blank($flat[$norm])) {
                $flat[$norm] = $value;
            }
        };

        foreach (['fields', 'form_fields'] as $container) {
            if (is_array($input[$container] ?? null)) {
                foreach ($input[$container] as $key => $value) {
                    if (is_array($value) && (array_key_exists('value', $value) || array_key_exists('raw_value', $value) || isset($value['id']) || isset($value['title']))) {
                        $fieldValue = $value['value'] ?? ($value['raw_value'] ?? null);
                        foreach ([$value['id'] ?? null, $value['title'] ?? null, $key] as $label) {
                            if (filled($label) && is_scalar($label)) {
                                $put((string) $label, $fieldValue);
                            }
                        }
                    } else {
                        $put((string) $key, $value);
                    }
                }
            }
        }
        // Platte velden hebben voorrang, zoals voorheen.
        foreach ($input as $key => $value) {
            if (! is_array($value)) {
                $norm = self::normalizeKey((string) $key);
                if ($norm !== '' && filled($value)) {
                    $flat[$norm] = is_string($value) ? trim($value) : $value;
                } elseif ($norm !== '' && ! array_key_exists($norm, $flat)) {
                    $flat[$norm] = $value;
                }
            }
        }

        return $flat;
    }

    /**
     * @param  array<string, list<string>>  $aliases  doel => mogelijke veldnamen (worden zelf ook genormaliseerd)
     * @return array<string, mixed> doel => eerste gevulde waarde
     */
    public static function map(array $flat, array $aliases): array
    {
        $result = [];
        foreach ($aliases as $target => $names) {
            foreach ($names as $name) {
                $value = $flat[self::normalizeKey($name)] ?? null;
                if (filled($value)) {
                    $result[$target] = $value;
                    break;
                }
            }
        }

        return $result;
    }
}
