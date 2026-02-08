<?php

use App\Http\Controllers\Crm\DashboardController;
use App\Http\Controllers\Crm\GarageCompaniesController;
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

    Route::get('/garagebedrijven', [GarageCompaniesController::class, 'index'])->name('crm.garage_companies.index');
    Route::get('/garagebedrijven/nieuw', [GarageCompaniesController::class, 'create'])->name('crm.garage_companies.create');
    Route::post('/garagebedrijven', [GarageCompaniesController::class, 'store'])->name('crm.garage_companies.store');
    Route::get('/garagebedrijven/{garageCompany}', [GarageCompaniesController::class, 'show'])->name('crm.garage_companies.show');
    Route::patch('/garagebedrijven/{garageCompany}', [GarageCompaniesController::class, 'updateOverview'])->name('crm.garage_companies.update');
    Route::post('/garagebedrijven/{garageCompany}/contactpersonen', [GarageCompaniesController::class, 'storePerson'])->name('crm.garage_companies.persons.store');
    Route::patch('/garagebedrijven/{garageCompany}/contactpersonen/{person}', [GarageCompaniesController::class, 'updatePerson'])->name('crm.garage_companies.persons.update');
    Route::delete('/garagebedrijven/{garageCompany}/contactpersonen/{person}', [GarageCompaniesController::class, 'deletePerson'])->name('crm.garage_companies.persons.delete');
    Route::patch('/garagebedrijven/{garageCompany}/modules', [GarageCompaniesController::class, 'updateModules'])->name('crm.garage_companies.modules.update');
    Route::post('/garagebedrijven/{garageCompany}/gebruikers', [GarageCompaniesController::class, 'storeSeat'])->name('crm.garage_companies.seats.store');
    Route::patch('/garagebedrijven/{garageCompany}/gebruikers/{seat}', [GarageCompaniesController::class, 'updateSeat'])->name('crm.garage_companies.seats.update');
    Route::delete('/garagebedrijven/{garageCompany}/gebruikers/{seat}', [GarageCompaniesController::class, 'deleteSeat'])->name('crm.garage_companies.seats.delete');
    Route::patch('/garagebedrijven/{garageCompany}/demo/dates', [GarageCompaniesController::class, 'saveDemoDates'])->name('crm.garage_companies.demo.dates');
    Route::post('/garagebedrijven/{garageCompany}/demo/extend', [GarageCompaniesController::class, 'extendDemo'])->name('crm.garage_companies.demo.extend');
    Route::patch('/garagebedrijven/{garageCompany}/demo/status', [GarageCompaniesController::class, 'setDemoStatus'])->name('crm.garage_companies.demo.status');
    Route::post('/garagebedrijven/{garageCompany}/incasso', [GarageCompaniesController::class, 'saveMandate'])->name('crm.garage_companies.mandates.save');
    Route::patch('/garagebedrijven/{garageCompany}/incasso/{mandate}', [GarageCompaniesController::class, 'setMandateStatus'])->name('crm.garage_companies.mandates.status');
    Route::post('/garagebedrijven/{garageCompany}/timeline', [GarageCompaniesController::class, 'addTimelineNote'])->name('crm.garage_companies.timeline.add');
    Route::post('/garagebedrijven/{garageCompany}/taken', [GarageCompaniesController::class, 'addTaskAppointment'])->name('crm.garage_companies.tasks.add');
    Route::patch('/garagebedrijven/{garageCompany}/taken/{activity}', [GarageCompaniesController::class, 'markTaskDone'])->name('crm.garage_companies.tasks.done');
    Route::post('/garagebedrijven/{garageCompany}/welcome-email/refresh', [GarageCompaniesController::class, 'refreshWelcomeEmail'])->name('crm.garage_companies.welcome.refresh');
    Route::post('/garagebedrijven/{garageCompany}/welcome-email/send', [GarageCompaniesController::class, 'sendWelcomeEmail'])->name('crm.garage_companies.welcome.send');

    Route::get('/garagebedrijven-old', \App\Livewire\Crm\GarageCompanies\Index::class)->name('crm.garage_companies.old');
    Route::get('/garagebedrijven-old/nieuw', \App\Livewire\Crm\GarageCompanies\Create::class)->name('crm.garage_companies.old.create');
    Route::get('/garagebedrijven-old/{garageCompany}', \App\Livewire\Crm\GarageCompanies\Show::class)->name('crm.garage_companies.old.show');

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
