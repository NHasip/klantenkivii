<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;

class Module extends Model
{
    protected $fillable = [
        'naam',
        'omschrijving',
        'default_visible',
        'default_prijs_maand_excl',
        'default_btw_percentage',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'default_visible' => 'boolean',
            'default_prijs_maand_excl' => 'decimal:2',
            'default_btw_percentage' => 'decimal:2',
            'archived_at' => 'datetime',
        ];
    }

    public function garageCompanies(): HasMany
    {
        return $this->hasMany(GarageCompanyModule::class);
    }

    private static ?bool $hasArchivedColumn = null;

    public static function hasArchivedColumn(): bool
    {
        return self::$hasArchivedColumn ??= Schema::hasColumn('modules', 'archived_at');
    }

    /**
     * Alleen niet-gearchiveerde modules (voor keuzelijsten bij nieuwe koppelingen).
     */
    public function scopeAvailable(Builder $query): Builder
    {
        return self::hasArchivedColumn() ? $query->whereNull($this->getTable().'.archived_at') : $query;
    }

    public function isArchived(): bool
    {
        return self::hasArchivedColumn() && $this->archived_at !== null;
    }
}
