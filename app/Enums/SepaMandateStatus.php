<?php

namespace App\Enums;

enum SepaMandateStatus: string
{
    case Pending = 'pending';
    case Actief = 'actief';
    case Ingetrokken = 'ingetrokken';
}

