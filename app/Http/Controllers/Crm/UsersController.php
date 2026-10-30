<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Livewire\Crm\Users\Index as UsersIndex;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

class UsersController extends Controller
{
    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        if ($request->user()?->id === $user->id) {
            return back()->with('status', 'Je kunt jezelf niet verwijderen.');
        }

        if (UsersIndex::isLastActiveAdmin($user)) {
            return back()->with('status', 'Dit is de laatste actieve admin en kan niet worden verwijderd.');
        }

        try {
            $user->delete();

            return back()->with('status', 'Gebruiker verwijderd.');
        } catch (Throwable $e) {
            report($e);

            return back()->with('status', 'Verwijderen mislukt. Controleer of deze gebruiker nog door andere data wordt gebruikt.');
        }
    }
}
