<?php

namespace App\Enums;

enum TaskStatus: string
{
    case Open = 'open';
    case InBehandeling = 'in_behandeling';
    case WachtOpKlant = 'wacht_op_klant';
    case Afgerond = 'afgerond';
}
