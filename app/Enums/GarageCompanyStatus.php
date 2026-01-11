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
}

