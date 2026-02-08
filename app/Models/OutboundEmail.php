<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OutboundEmail extends Model
{
    protected $fillable = [
        'garage_company_id',
        'template_id',
        'type',
        'to_email',
        'subject',
        'body_html',
        'body_text',
        'status',
        'sent_at',
        'last_error',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
        ];
    }
}
