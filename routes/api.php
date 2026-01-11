<?php

use App\Http\Controllers\Api\LeadWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/leads/webhook', LeadWebhookController::class)
    ->middleware('leads.webhook')
    ->name('api.leads.webhook');

