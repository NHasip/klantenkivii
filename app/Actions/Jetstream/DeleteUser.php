<?php

namespace App\Actions\Jetstream;

use App\Livewire\Crm\Users\Index as UsersIndex;
use App\Models\User;
use Illuminate\Validation\ValidationException;
use Laravel\Jetstream\Contracts\DeletesUsers;

class DeleteUser implements DeletesUsers
{
    /**
     * Delete the given user.
     */
    public function delete(User $user): void
    {
        if (UsersIndex::isLastActiveAdmin($user)) {
            throw ValidationException::withMessages([
                'password' => 'Je bent de laatste actieve admin. Maak eerst een andere admin aan.',
            ]);
        }

        $user->deleteProfilePhoto();
        $user->tokens->each->delete();
        $user->delete();
    }
}
