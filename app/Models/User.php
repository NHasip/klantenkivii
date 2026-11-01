<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Jetstream\HasProfilePhoto;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use HasProfilePhoto;
    use Notifiable;
    use SoftDeletes;
    use TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_recovery_codes',
        'two_factor_secret',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'profile_photo_url',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'phone' => 'string',
            'active' => 'boolean',
            'last_login_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'push_preferences' => 'array',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    /**
     * Wachtwoordherstel gaat (zoals alle mail) via Microsoft 365 vanuit info@kivii.nl. Lukt dat niet,
     * dan een nette melding op het formulier in plaats van een serverfout; de technische fout wordt gelogd.
     */
    public function sendPasswordResetNotification($token): void
    {
        try {
            parent::sendPasswordResetNotification($token);
        } catch (\Throwable $e) {
            report($e);

            throw \Illuminate\Validation\ValidationException::withMessages([
                \Laravel\Fortify\Fortify::email() => 'De e-mail voor wachtwoordherstel kon niet worden verstuurd. Probeer het later opnieuw of neem contact op met Kivii.',
            ]);
        }
    }

    /**
     * Klantlogins zijn gebruikers die als eigenaar aan een garagebedrijf hangen
     * (ook als dat bedrijf in de prullenbak staat). Zij horen niet in het CRM.
     * Admins worden nooit als klantlogin gezien.
     */
    public function isCustomerAccount(): bool
    {
        if ($this->isAdmin() || ! $this->getKey()) {
            return false;
        }

        // DB::table omzeilt de 'not_deleted' scope, dus verwijderde bedrijven tellen mee.
        return DB::table('garage_companies')
            ->where('eigenaar_user_id', $this->getKey())
            ->exists();
    }

    /**
     * Alleen CRM-gebruikers: admins altijd, overige gebruikers als ze geen eigenaar
     * van een (ook verwijderd) garagebedrijf zijn.
     */
    public function scopeCrmUsers(Builder $query): Builder
    {
        $table = $this->getTable();

        return $query->where(function (Builder $q) use ($table) {
            $q->where($table.'.role', UserRole::Admin->value)
                ->orWhereNotExists(function ($sub) use ($table) {
                    $sub->selectRaw('1')
                        ->from('garage_companies')
                        ->whereColumn('garage_companies.eigenaar_user_id', $table.'.id');
                });
        });
    }

    public function passkeys(): HasMany
    {
        return $this->hasMany(Passkey::class);
    }

    public function pushSubscriptions(): HasMany
    {
        return $this->hasMany(PushSubscription::class);
    }

    /**
     * Staat dit pushmeldingstype aan? Niet opgeslagen betekent aan (standaard alles aan).
     * Beheerderstypen gelden alleen voor admins.
     */
    public function wantsPush(string $type): bool
    {
        if (in_array($type, \App\Services\Push\PushNotifier::ADMIN_TYPES, true) && ! $this->isAdmin()) {
            return false;
        }

        $prefs = is_array($this->push_preferences ?? null) ? $this->push_preferences : [];

        return ! array_key_exists($type, $prefs) || (bool) $prefs[$type];
    }
}
