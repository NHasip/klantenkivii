<?php

namespace App\Enums;

enum TaskPriority: string
{
    case Laag = 'laag';
    case Normaal = 'normaal';
    case Hoog = 'hoog';
    case Kritiek = 'kritiek';
}
