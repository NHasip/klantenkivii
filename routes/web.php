<?php

use App\Http\Controllers\Crm\DashboardController;
use App\Http\Controllers\Crm\DemoMailSequenceController;
use App\Http\Controllers\Crm\EmailTemplatesController;
use App\Http\Controllers\Crm\GarageCompaniesController;
use App\Http\Controllers\Crm\ImportController;
use App\Http\Controllers\Crm\EmailLogController;
use App\Http\Controllers\Crm\MandateRequestsController;
use App\Http\Controllers\Crm\SepaImportController;
use App\Http\Controllers\Crm\SearchController;
use App\Http\Controllers\Crm\TasksController;
use App\Http\Controllers\Crm\UsersController;
use App\Http\Controllers\Auth\PasskeyLoginController;
use App\Http\Controllers\Profile\PasskeyController;
use App\Http\Controllers\Profile\SmtpSettingsController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});
Route::redirect('/dashboard-old', '/dashboard', 301);
Route::redirect('/taken-old', '/taken', 301);

Route::middleware(['guest', 'throttle:10,1'])->group(function () {
    Route::post('/auth/passkey/options', [PasskeyLoginController::class, 'options'])->name('auth.passkeys.options');
    Route::post('/auth/passkey/verify', [PasskeyLoginController::class, 'verify'])->name('auth.passkeys.verify');
});

Route::middleware(['auth', 'active', 'admin.2fa'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/garagebedrijven', [GarageCompaniesController::class, 'index'])->name('crm.garage_companies.index');
    Route::get('/garagebedrijven/nieuw', [GarageCompaniesController::class, 'create'])->name('crm.garage_companies.create');
    // Engelstalige/gegokte URL vriendelijk doorsturen (moet voor de {garageCompany}-route staan).
    Route::redirect('/garagebedrijven/create', '/garagebedrijven/nieuw');
    Route::post('/garagebedrijven', [GarageCompaniesController::class, 'store'])->name('crm.garage_companies.store');
    Route::get('/garagebedrijven/export/csv', [GarageCompaniesController::class, 'exportCsv'])->name('crm.garage_companies.export_csv');
    Route::post('/garagebedrijven/bulk/tag', [GarageCompaniesController::class, 'bulkTag'])->name('crm.garage_companies.bulk_tag');
    Route::get('/garagebedrijven/duplicaten', [GarageCompaniesController::class, 'duplicateCheck'])->name('crm.garage_companies.duplicates');
    Route::get('/garagebedrijven/{garageCompany}', [GarageCompaniesController::class, 'show'])->name('crm.garage_companies.show');
    Route::delete('/garagebedrijven/{garageCompany}', [GarageCompaniesController::class, 'destroy'])->name('crm.garage_companies.destroy');
    Route::post('/garagebedrijven/{garageCompany}/restore', [GarageCompaniesController::class, 'restore'])->name('crm.garage_companies.restore');
    Route::delete('/garagebedrijven/{garageCompany}/force', [GarageCompaniesController::class, 'forceDelete'])->name('crm.garage_companies.force_delete');
    Route::delete('/garagebedrijven/prullenbak/leegmaken', [GarageCompaniesController::class, 'purgeTrash'])->name('crm.garage_companies.purge_trash');
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
    Route::post('/garagebedrijven/{garageCompany}/pauze', [GarageCompaniesController::class, 'pause'])->name('crm.garage_companies.pause');
    Route::post('/garagebedrijven/{garageCompany}/hervat', [GarageCompaniesController::class, 'resume'])->name('crm.garage_companies.resume');
    Route::post('/garagebedrijven/{garageCompany}/incasso', [GarageCompaniesController::class, 'saveMandate'])->name('crm.garage_companies.mandates.save');
    Route::post('/garagebedrijven/{garageCompany}/incasso-instellingen', [GarageCompaniesController::class, 'updateIncassoSettings'])->name('crm.garage_companies.incasso.settings');
    Route::patch('/garagebedrijven/{garageCompany}/incasso/{mandate}', [GarageCompaniesController::class, 'setMandateStatus'])->name('crm.garage_companies.mandates.status');
    Route::get('/incasso/export', [GarageCompaniesController::class, 'exportIncassoBatch'])->name('crm.incasso.export');
    Route::get('/incasso/voorbeeld', [GarageCompaniesController::class, 'previewIncassoBatch'])->name('crm.incasso.preview');
    Route::post('/garagebedrijven/{garageCompany}/timeline', [GarageCompaniesController::class, 'addTimelineNote'])->name('crm.garage_companies.timeline.add');
    Route::post('/garagebedrijven/{garageCompany}/taken', [GarageCompaniesController::class, 'addTaskAppointment'])->name('crm.garage_companies.tasks.add');
    Route::patch('/garagebedrijven/{garageCompany}/taken/{activity}', [GarageCompaniesController::class, 'markTaskDone'])->name('crm.garage_companies.tasks.done');
    Route::post('/garagebedrijven/{garageCompany}/welcome-email/refresh', [GarageCompaniesController::class, 'refreshWelcomeEmail'])->name('crm.garage_companies.welcome.refresh');
    Route::post('/garagebedrijven/{garageCompany}/welcome-email/update', [GarageCompaniesController::class, 'updateWelcomeEmail'])->name('crm.garage_companies.welcome.update');
    Route::post('/garagebedrijven/{garageCompany}/welcome-email/send', [GarageCompaniesController::class, 'sendWelcomeEmail'])->name('crm.garage_companies.welcome.send');


    Route::get('/rapportages', \App\Livewire\Crm\Reports\Index::class)->name('crm.reports.index');
    Route::get('/zoeken', SearchController::class)->middleware('throttle:60,1')->name('crm.search');

    Route::get('/taken', [TasksController::class, 'index'])->name('crm.tasks.index');
    Route::get('/taken/data', [TasksController::class, 'data'])->name('crm.tasks.data');
    Route::get('/taken/klanten', [TasksController::class, 'customers'])->name('crm.tasks.customers');
    Route::post('/taken/projects', [TasksController::class, 'storeProject'])->name('crm.tasks.projects.store');
    Route::post('/taken/tasks', [TasksController::class, 'storeTask'])->name('crm.tasks.tasks.store');
    Route::patch('/taken/tasks/reorder', [TasksController::class, 'reorder'])->name('crm.tasks.tasks.reorder');
    Route::patch('/taken/tasks/{task}', [TasksController::class, 'updateTask'])->name('crm.tasks.tasks.update');
    Route::patch('/taken/tasks/{task}/status', [TasksController::class, 'updateStatus'])->name('crm.tasks.tasks.status');
    Route::post('/taken/tasks/{task}/attachments', [TasksController::class, 'storeAttachment'])->name('crm.tasks.attachments.store');
    Route::get('/taken/attachments/{attachment}/download', [TasksController::class, 'downloadAttachment'])->name('crm.tasks.attachments.download');
    Route::post('/taken/tasks/{task}/comments', [TasksController::class, 'storeComment'])->name('crm.tasks.comments.store');
    Route::get('/taken/{task}', [TasksController::class, 'show'])->name('crm.tasks.show');

    Route::get('/gebruikers', \App\Livewire\Crm\Users\Index::class)
        ->middleware('admin')
        ->name('crm.users.index');
    Route::delete('/gebruikers/{user}', [UsersController::class, 'destroy'])
        ->middleware('admin')
        ->name('crm.users.delete');

    Route::get('/modules', \App\Livewire\Crm\Modules\Index::class)
        ->middleware('admin')
        ->name('crm.modules.index');

    Route::get('/importeren', [ImportController::class, 'index'])
        ->middleware('admin')
        ->name('crm.import.index');
    Route::post('/importeren/controleren', [ImportController::class, 'preview'])
        ->middleware(['admin', 'throttle:30,1'])
        ->name('crm.import.preview');
    Route::post('/importeren', [ImportController::class, 'store'])
        ->middleware(['admin', 'throttle:10,1'])
        ->name('crm.import.store');

    Route::get('/sepa-importeren', [SepaImportController::class, 'index'])
        ->middleware('admin')
        ->name('crm.sepa_import.index');
    Route::post('/sepa-importeren/controleren', [SepaImportController::class, 'preview'])
        ->middleware(['admin', 'throttle:30,1'])
        ->name('crm.sepa_import.preview');
    Route::post('/sepa-importeren', [SepaImportController::class, 'store'])
        ->middleware(['admin', 'throttle:10,1'])
        ->name('crm.sepa_import.store');

    Route::get('/emaillog', [EmailLogController::class, 'index'])
        ->middleware('admin')
        ->name('crm.email_log.index');

    Route::get('/machtigingen', [MandateRequestsController::class, 'index'])
        ->middleware('admin')
        ->name('crm.mandate_requests.index');
    Route::post('/garagebedrijven/{garageCompany}/machtigingen', [MandateRequestsController::class, 'store'])
        ->middleware(['admin', 'throttle:30,1'])
        ->name('crm.mandate_requests.store');
    Route::post('/machtigingen/{mandateRequest}/opnieuw', [MandateRequestsController::class, 'resend'])
        ->middleware(['admin', 'throttle:30,1'])
        ->name('crm.mandate_requests.resend');
    Route::post('/machtigingen/{mandateRequest}/intrekken', [MandateRequestsController::class, 'revoke'])
        ->middleware('admin')
        ->name('crm.mandate_requests.revoke');
    Route::post('/machtigingen/{mandateRequest}/koppelen', [MandateRequestsController::class, 'link'])
        ->middleware('admin')
        ->name('crm.mandate_requests.link');
    Route::post('/machtigingen/{mandateRequest}/verwerken', [MandateRequestsController::class, 'process'])
        ->middleware(['admin', 'throttle:30,1'])
        ->name('crm.mandate_requests.process');
    Route::post('/machtigingen/{mandateRequest}/overnemen', [MandateRequestsController::class, 'adopt'])
        ->middleware(['admin', 'throttle:30,1'])
        ->name('crm.mandate_requests.adopt');

    Route::post('/garagebedrijven/{garageCompany}/demo-mailreeks/stoppen', [DemoMailSequenceController::class, 'stop'])
        ->middleware('admin')
        ->name('crm.demo_sequence.stop');
    Route::post('/garagebedrijven/{garageCompany}/demo-mailreeks/starten', [DemoMailSequenceController::class, 'restart'])
        ->middleware(['admin', 'throttle:10,1'])
        ->name('crm.demo_sequence.restart');
    Route::post('/garagebedrijven/{garageCompany}/demo-mailreeks/testmodus', [DemoMailSequenceController::class, 'startTest'])
        ->middleware(['admin', 'throttle:10,1'])
        ->name('crm.demo_sequence.start_test');
    Route::post('/garagebedrijven/{garageCompany}/demo-mailreeks/stappen/{step}/nu-versturen', [DemoMailSequenceController::class, 'sendNow'])
        ->middleware(['admin', 'throttle:10,1'])
        ->whereNumber('step')
        ->name('crm.demo_sequence.send_now');

    Route::get('/email-templates', [EmailTemplatesController::class, 'index'])
        ->middleware('admin')
        ->name('crm.email_templates.index');
    Route::post('/email-templates', [EmailTemplatesController::class, 'store'])
        ->middleware('admin')
        ->name('crm.email_templates.store');
    Route::post('/email-templates/voorbeeld', [EmailTemplatesController::class, 'preview'])
        ->middleware(['admin', 'throttle:60,1'])
        ->name('crm.email_templates.preview');
    Route::patch('/email-templates/{emailTemplate}', [EmailTemplatesController::class, 'update'])
        ->middleware('admin')
        ->name('crm.email_templates.update');
    Route::post('/email-templates/{emailTemplate}/update', [EmailTemplatesController::class, 'update'])
        ->middleware('admin')
        ->name('crm.email_templates.update_post');
    Route::delete('/email-templates/{emailTemplate}', [EmailTemplatesController::class, 'destroy'])
        ->middleware('admin')
        ->name('crm.email_templates.delete');
    Route::post('/email-templates/{emailTemplate}/delete', [EmailTemplatesController::class, 'destroy'])
        ->middleware('admin')
        ->name('crm.email_templates.delete_post');

    Route::post('/user/profile/smtp-settings', [SmtpSettingsController::class, 'store'])
        ->middleware('admin')
        ->name('profile.smtp.save');

    Route::post('/user/profile/passkeys/options', [PasskeyController::class, 'options'])
        ->name('profile.passkeys.options');
    Route::post('/user/profile/passkeys', [PasskeyController::class, 'store'])
        ->name('profile.passkeys.store');
    Route::delete('/user/profile/passkeys/{passkey}', [PasskeyController::class, 'destroy'])
        ->name('profile.passkeys.destroy');
});
