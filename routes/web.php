<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : view('welcome');
});

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/dashboard', \App\Livewire\Crm\Dashboard::class)->name('dashboard');

    Route::get('/garagebedrijven', \App\Livewire\Crm\GarageCompanies\Index::class)->name('crm.garage_companies.index');
    Route::get('/garagebedrijven/nieuw', \App\Livewire\Crm\GarageCompanies\Create::class)->name('crm.garage_companies.create');
    Route::get('/garagebedrijven/{garageCompany}', \App\Livewire\Crm\GarageCompanies\Show::class)->name('crm.garage_companies.show');

    Route::get('/rapportages', \App\Livewire\Crm\Reports\Index::class)->name('crm.reports.index');

    Route::get('/gebruikers', \App\Livewire\Crm\Users\Index::class)
        ->middleware('admin')
        ->name('crm.users.index');

    Route::get('/modules', \App\Livewire\Crm\Modules\Index::class)
        ->middleware('admin')
        ->name('crm.modules.index');
});
