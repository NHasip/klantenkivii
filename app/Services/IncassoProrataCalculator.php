<?php

namespace App\Services;

use Illuminate\Support\Carbon;

class IncassoProrataCalculator
{
    public static function calculateForMonth(float $fullMonthAmount, ?Carbon $activeFrom, int $month, int $year): float
    {
        $fullMonthAmount = max(0.0, round($fullMonthAmount, 2));
        $monthStart = Carbon::create($year, $month, 1)->startOfDay();
        $monthEnd = $monthStart->copy()->endOfMonth();

        if (! $activeFrom instanceof Carbon) {
            return $fullMonthAmount;
        }

        $activeFrom = $activeFrom->copy()->startOfDay();

        // Customer was not active yet in this month.
        if ($activeFrom->gt($monthEnd)) {
            return 0.0;
        }

        // Only apply pro-rata in the first active month.
        if ($activeFrom->year !== $year || $activeFrom->month !== $month) {
            return $fullMonthAmount;
        }

        $daysInMonth = $monthStart->daysInMonth;
        if ($daysInMonth <= 0) {
            return $fullMonthAmount;
        }

        // Inclusive day count: active from start date through end of month.
        $activeDays = $monthEnd->diffInDays($activeFrom) + 1;
        $ratio = min(1, max(0, $activeDays / $daysInMonth));

        return max(0.0, round($fullMonthAmount * $ratio, 2));
    }
}
