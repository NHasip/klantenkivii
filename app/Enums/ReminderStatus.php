<?php

namespace App\Enums;

enum ReminderStatus: string
{
    case Gepland = 'gepland';
    case Verzonden = 'verzonden';
    case Geannuleerd = 'geannuleerd';
}

