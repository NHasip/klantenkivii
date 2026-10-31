<?php

use App\Http\Controllers\Api\LeadWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/leads/webhook', LeadWebhookController::class)
    ->middleware(['leads.webhook', 'throttle:30,1'])
    ->name('api.leads.webhook');

