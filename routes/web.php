<?php

use App\Http\Controllers\Crm\DashboardController;
use App\Http\Controllers\Crm\TasksController;
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

    Route::get('/taken', [TasksController::class, 'index'])->name('crm.tasks.index');
    Route::get('/taken/data', [TasksController::class, 'data'])->name('crm.tasks.data');
    Route::post('/taken/projects', [TasksController::class, 'storeProject'])->name('crm.tasks.projects.store');
    Route::post('/taken/tasks', [TasksController::class, 'storeTask'])->name('crm.tasks.tasks.store');
    Route::patch('/taken/tasks/{task}', [TasksController::class, 'updateTask'])->name('crm.tasks.tasks.update');
    Route::patch('/taken/tasks/{task}/status', [TasksController::class, 'updateStatus'])->name('crm.tasks.tasks.status');
    Route::patch('/taken/tasks/reorder', [TasksController::class, 'reorder'])->name('crm.tasks.tasks.reorder');
    Route::post('/taken/tasks/{task}/attachments', [TasksController::class, 'storeAttachment'])->name('crm.tasks.attachments.store');
    Route::post('/taken/tasks/{task}/comments', [TasksController::class, 'storeComment'])->name('crm.tasks.comments.store');
    Route::get('/taken/{task}', [TasksController::class, 'show'])->name('crm.tasks.show');
    Route::get('/taken-old', \App\Livewire\Crm\Tasks\Index::class)->name('crm.tasks.old');

    Route::get('/gebruikers', \App\Livewire\Crm\Users\Index::class)
        ->middleware('admin')
        ->name('crm.users.index');

    Route::get('/modules', \App\Livewire\Crm\Modules\Index::class)
        ->middleware('admin')
        ->name('crm.modules.index');
});
