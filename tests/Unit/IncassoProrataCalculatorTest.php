<?php

namespace Tests\Unit;

use App\Services\IncassoProrataCalculator;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;

class IncassoProrataCalculatorTest extends TestCase
{
    public function test_mid_month_start_is_prorated_in_first_month(): void
    {
        $amount = IncassoProrataCalculator::calculateForMonth(
            69.00,
            Carbon::create(2026, 4, 14),
            4,
            2026
        );

        $this->assertSame(39.10, $amount);
    }

    public function test_first_day_start_charges_full_month(): void
    {
        $amount = IncassoProrataCalculator::calculateForMonth(
            69.00,
            Carbon::create(2026, 4, 1),
            4,
            2026
        );

        $this->assertSame(69.00, $amount);
    }

    public function test_after_first_month_charges_full_month(): void
    {
        $amount = IncassoProrataCalculator::calculateForMonth(
            69.00,
            Carbon::create(2026, 4, 14),
            5,
            2026
        );

        $this->assertSame(69.00, $amount);
    }

    public function test_leap_year_february_is_calculated_correctly(): void
    {
        $amount = IncassoProrataCalculator::calculateForMonth(
            69.00,
            Carbon::create(2028, 2, 14),
            2,
            2028
        );

        $this->assertSame(38.07, $amount);
    }

    public function test_non_leap_year_february_is_calculated_correctly(): void
    {
        $amount = IncassoProrataCalculator::calculateForMonth(
            69.00,
            Carbon::create(2027, 2, 14),
            2,
            2027
        );

        $this->assertSame(36.96, $amount);
    }

    public function test_start_after_selected_month_returns_zero(): void
    {
        $amount = IncassoProrataCalculator::calculateForMonth(
            69.00,
            Carbon::create(2026, 5, 14),
            4,
            2026
        );

        $this->assertSame(0.00, $amount);
    }

    public function test_negative_month_amount_is_never_returned(): void
    {
        $amount = IncassoProrataCalculator::calculateForMonth(
            -69.00,
            Carbon::create(2026, 4, 14),
            4,
            2026
        );

        $this->assertSame(0.00, $amount);
    }
}
