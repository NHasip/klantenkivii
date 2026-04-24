<?php

namespace App\Enums;

enum GarageCompanyStatus: string
{
    case Lead = 'lead';
    case DemoAangevraagd = 'demo_aangevraagd';
    case DemoGepland = 'demo_gepland';
    case Proefperiode = 'proefperiode';
    case Actief = 'actief';
    case Opgezegd = 'opgezegd';
    case Verloren = 'verloren';

    /**
     * @return list<self>
     */
    public static function selectable(): array
    {
        return [
            self::DemoAangevraagd,
            self::Proefperiode,
            self::Actief,
            self::Opgezegd,
            self::Verloren,
        ];
    }

    /**
     * @return list<string>
     */
    public static function selectableValues(): array
    {
        return array_map(fn (self $status) => $status->value, self::selectable());
    }

    /**
     * @return array<string, string>
     */
    public static function labelMap(): array
    {
        $labels = [];
        foreach (self::cases() as $status) {
            $labels[$status->value] = $status->label();
        }

        return $labels;
    }

    public static function normalize(string $value): string
    {
        return match ($value) {
            self::Lead->value => self::DemoAangevraagd->value,
            self::DemoGepland->value => self::Proefperiode->value,
            default => $value,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::DemoAangevraagd => 'Demo aangevraagd',
            self::Proefperiode => 'Demo',
            self::Actief => 'Actief',
            self::Opgezegd => 'Opgezegd',
            self::Verloren => 'Verloren',
            self::Lead => 'Lead (oud)',
            self::DemoGepland => 'Demo gepland (oud)',
        };
    }
}
