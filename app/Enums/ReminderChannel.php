<?php

namespace App\Enums;

enum ReminderChannel: string
{
    case Popup = 'popup';
    case Email = 'email';
    case Beide = 'beide';
}

