<?php

namespace App\Enums;

enum ActivityType: string
{
    case StatusWijziging = 'status_wijziging';
    case Notitie = 'notitie';
    case Taak = 'taak';
    case Afspraak = 'afspraak';
    case Demo = 'demo';
    case Mandate = 'mandate';
    case Module = 'module';
    case Systeem = 'systeem';
}

