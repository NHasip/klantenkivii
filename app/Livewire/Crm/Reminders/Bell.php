<?php

namespace App\Livewire\Crm\Reminders;

use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Models\Reminder;
use Livewire\Component;

class Bell extends Component
{
    public bool $open = false;

    public function toggle(): void
    {
        $this->open = ! $this->open;
    }

    public function dismiss(int $reminderId): void
    {
        Reminder::query()
            ->where('id', $reminderId)
            ->where('user_id', auth()->id())
            ->update([
                'popup_dismissed_at' => now(),
                'status' => ReminderStatus::Verzonden,
            ]);
    }

    public function render()
    {
        $reminders = Reminder::query()
            ->where('user_id', auth()->id())
            ->where('status', ReminderStatus::Gepland)
            ->whereNull('popup_dismissed_at')
            ->where('remind_at', '<=', now())
            ->whereIn('channel', [ReminderChannel::Popup, ReminderChannel::Beide])
            ->orderBy('remind_at')
            ->limit(8)
            ->get();

        return view('livewire.crm.reminders.bell', [
            'reminders' => $reminders,
            'count' => $reminders->count(),
        ]);
    }
}

