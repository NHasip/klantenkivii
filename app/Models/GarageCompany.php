<?php

namespace App\Models;

use App\Enums\GarageCompanySource;
use App\Enums\GarageCompanyStatus;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class GarageCompany extends Model
{
    protected $fillable = [
        'bedrijfsnaam',
        'kvk_nummer',
        'btw_nummer',
        'adres_straat_nummer',
        'postcode',
        'plaats',
        'land',
        'website',
        'hoofd_email',
        'hoofd_telefoon',
        'login_email',
        'login_password',
        'status',
        'bron',
        'tags',
        'demo_aangevraagd_op',
        'demo_gepland_op',
        'demo_duur_dagen',
        'demo_eind_op',
        'proefperiode_start',
        'actief_vanaf',
        'opgezegd_op',
        'opzegreden',
        'verloren_op',
        'verloren_reden',
        'eigenaar_user_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => GarageCompanyStatus::class,
            'bron' => GarageCompanySource::class,
            'demo_aangevraagd_op' => 'datetime',
            'demo_gepland_op' => 'datetime',
            'demo_duur_dagen' => 'integer',
            'demo_eind_op' => 'datetime',
            'proefperiode_start' => 'datetime',
            'actief_vanaf' => 'datetime',
            'opgezegd_op' => 'datetime',
            'verloren_op' => 'datetime',
            'login_password' => 'encrypted',
        ];
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function eigenaar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'eigenaar_user_id');
    }

    public function customerPersons(): HasMany
    {
        return $this->hasMany(CustomerPerson::class);
    }

    public function primaryPerson(): HasOne
    {
        return $this->hasOne(CustomerPerson::class)->where('is_primary', true);
    }

    public function mandates(): HasMany
    {
        return $this->hasMany(SepaMandate::class);
    }

    public function activeMandate(): HasOne
    {
        return $this->hasOne(SepaMandate::class)->where('status', \App\Enums\SepaMandateStatus::Actief);
    }

    public function modules(): HasMany
    {
        return $this->hasMany(GarageCompanyModule::class);
    }

    public function seats(): HasMany
    {
        return $this->hasMany(KiviiSeat::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class)->latest();
    }

    public function feedback(): HasMany
    {
        return $this->hasMany(CustomerFeedback::class);
    }

    public function activeMrrExcl(): Attribute
    {
        return Attribute::get(function () {
            $sumExpr = GarageCompanyModule::hasAantalColumn()
                ? DB::raw('(prijs_maand_excl * aantal)')
                : 'prijs_maand_excl';

            return (float) $this->modules()
                ->where('actief', true)
                ->where(function ($q) {
                    $q->whereNull('startdatum')->orWhere('startdatum', '<=', now()->toDateString());
                })
                ->where(function ($q) {
                    $q->whereNull('einddatum')->orWhere('einddatum', '>=', now()->toDateString());
                })
                ->sum($sumExpr);
        });
    }

    public function activeMrrBtw(): Attribute
    {
        return Attribute::get(function () {
            $rows = $this->modules()
                ->where('actief', true)
                ->where(function ($q) {
                    $q->whereNull('startdatum')->orWhere('startdatum', '<=', now()->toDateString());
                })
                ->where(function ($q) {
                    $q->whereNull('einddatum')->orWhere('einddatum', '>=', now()->toDateString());
                })
                ->get(GarageCompanyModule::hasAantalColumn()
                    ? ['prijs_maand_excl', 'btw_percentage', 'aantal']
                    : ['prijs_maand_excl', 'btw_percentage']);

            $btw = 0.0;
            foreach ($rows as $row) {
                $aantal = GarageCompanyModule::hasAantalColumn() ? max(1, (int) ($row->aantal ?? 1)) : 1;
                $btw += ((float) $row->prijs_maand_excl * $aantal) * ((float) $row->btw_percentage / 100);
            }

            return $btw;
        });
    }

    public function activeMrrIncl(): Attribute
    {
        return Attribute::get(fn () => (float) $this->active_mrr_excl + (float) $this->active_mrr_btw);
    }

    public function activeSeatsCount(): Attribute
    {
        return Attribute::get(fn () => (int) $this->seats()->where('actief', true)->count());
    }

    public function demoAangevraagdOuderDanDagen(int $dagen): bool
    {
        if (! $this->demo_aangevraagd_op instanceof Carbon) {
            return false;
        }

        return $this->demo_aangevraagd_op->lt(now()->subDays($dagen));
    }
}
