<?php

use App\Http\Controllers\Crm\DashboardController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/dashboard-old', \App\Livewire\Crm\Dashboard::class)->name('dashboard.old');

    Route::get('/garagebedrijven', \App\Livewire\Crm\GarageCompanies\Index::class)->name('crm.garage_companies.index');
    Route::get('/garagebedrijven/nieuw', \App\Livewire\Crm\GarageCompanies\Create::class)->name('crm.garage_companies.create');
    Route::get('/garagebedrijven/{garageCompany}', \App\Livewire\Crm\GarageCompanies\Show::class)->name('crm.garage_companies.show');

    Route::get('/rapportages', \App\Livewire\Crm\Reports\Index::class)->name('crm.reports.index');
    Route::get('/taken', \App\Livewire\Crm\Tasks\Index::class)->name('crm.tasks.index');

    Route::get('/gebruikers', \App\Livewire\Crm\Users\Index::class)
        ->middleware('admin')
        ->name('crm.users.index');

    Route::get('/modules', \App\Livewire\Crm\Modules\Index::class)
        ->middleware('admin')
        ->name('crm.modules.index');
});
