<?php

namespace App\Enums;

enum GarageCompanyStatus: string
{
    case Lead = 'lead';
    case DemoAangevraagd = 'demo_aangevraagd';
    case DemoGepland = 'demo_gepland';
    case Proefperiode = 'proefperiode';
    case Actief = 'actief';
    case Gepauzeerd = 'gepauzeerd';
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
            self::Gepauzeerd,
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

    /**
     * Statussen die als 'tijdelijk gestopt' gelden: niet actief, geen MRR,
     * geen incasso en geen mandaat-taken.
     */
    public function isPaused(): bool
    {
        return $this === self::Gepauzeerd;
    }

    public function label(): string
    {
        return match ($this) {
            self::DemoAangevraagd => 'Demo aangevraagd',
            self::Proefperiode => 'Demo',
            self::Actief => 'Actief',
            self::Gepauzeerd => 'Gepauzeerd',
            self::Opgezegd => 'Opgezegd',
            self::Verloren => 'Verloren',
            self::Lead => 'Lead (oud)',
            self::DemoGepland => 'Demo gepland (oud)',
        };
    }
}
