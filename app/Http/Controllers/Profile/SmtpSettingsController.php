<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use App\Models\SmtpSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class SmtpSettingsController extends Controller
{
    public function store(Request $request)
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $data = $request->validate([
            'smtp.host' => ['nullable', 'string', 'max:255'],
            'smtp.port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'smtp.username' => ['nullable', 'string', 'max:255'],
            'smtp.password' => ['nullable', 'string'],
            'smtp.encryption' => ['nullable', 'string', 'max:20'],
            'smtp.from_address' => ['nullable', 'email', 'max:255'],
            'smtp.from_name' => ['nullable', 'string', 'max:255'],
        ]);

        $payload = [
            'host' => $data['smtp']['host'] ?? null,
            'port' => $data['smtp']['port'] ?? null,
            'username' => $data['smtp']['username'] ?? null,
            'password' => $data['smtp']['password'] ?? null,
            'encryption' => $data['smtp']['encryption'] ?? null,
            'from_address' => $data['smtp']['from_address'] ?? null,
            'from_name' => $data['smtp']['from_name'] ?? null,
            'updated_by' => $request->user()?->id,
        ];

        if (! Schema::hasColumn('smtp_settings', 'updated_by')) {
            unset($payload['updated_by']);
        }

        $smtp = SmtpSetting::query()->first();
        if ($smtp) {
            $smtp->fill($payload);
            $smtp->save();
        } else {
            SmtpSetting::query()->create($payload);
        }

        return back()->with('status', 'SMTP instellingen opgeslagen.');
    }
}
