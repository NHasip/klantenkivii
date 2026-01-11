<?php

namespace App\Enums;

enum GarageCompanySource: string
{
    case WebsiteFormulier = 'website_formulier';
    case Telefoon = 'telefoon';
    case Email = 'email';
    case Referral = 'referral';
    case Anders = 'anders';
}

