<?php

namespace App\Models;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Throwable;

class Task extends Model
{
    use Prunable, SoftDeletes;

    /** Aantal dagen dat een taak in de prullenbak blijft voordat hij definitief wordt verwijderd. */
    public const TRASH_DAYS = 60;

    protected $fillable = [
        'task_project_id',
        'garage_company_id',
        'titel',
        'omschrijving',
        'status',
        'prioriteit',
        'deadline',
        'afgerond_op',
        'labels',
        'sort_order',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => TaskStatus::class,
            'prioriteit' => TaskPriority::class,
            'deadline' => 'datetime',
            'afgerond_op' => 'datetime',
        ];
    }

    private static ?bool $customerColumn = null;

    /**
     * Of de (additieve) kolom garage_company_id al bestaat. Zo blijft de app werken
     * als de code al is uitgerold maar de migratie nog niet is gedraaid.
     */
    public static function supportsCustomer(): bool
    {
        if (self::$customerColumn === null) {
            try {
                self::$customerColumn = Schema::hasColumn('tasks', 'garage_company_id');
            } catch (Throwable) {
                self::$customerColumn = false;
            }
        }

        return self::$customerColumn;
    }

    public function garageCompany(): BelongsTo
    {
        return $this->belongsTo(GarageCompany::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(TaskProject::class, 'task_project_id');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_assignees')->withTimestamps();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Taken die langer dan TRASH_DAYS in de prullenbak staan (via php artisan model:prune). */
    public function prunable(): Builder
    {
        return static::onlyTrashed()->where('deleted_at', '<=', now()->subDays(self::TRASH_DAYS));
    }

    /** Wordt aangeroepen vlak voor definitief verwijderen: bijlagebestanden van schijf halen. */
    protected function pruning(): void
    {
        $this->deleteAttachmentFiles();
    }

    public function deleteAttachmentFiles(): void
    {
        $paths = $this->attachments()->pluck('path')->filter()->all();
        if ($paths !== []) {
            Storage::disk('local')->delete($paths);
        }
    }
}
