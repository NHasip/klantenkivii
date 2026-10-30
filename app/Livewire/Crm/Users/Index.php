<?php

namespace App\Livewire\Crm\Users;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Validation\Rule;
use Livewire\Component;

class Index extends Component
{
    public ?int $userId = null;

    public bool $showForm = false;

    public string $name = '';
    public string $email = '';
    public ?string $phone = null;
    public string $role = 'medewerker';
    public bool $active = true;
    public ?string $password = null;

    /**
     * De route-middleware 'admin' geldt niet voor latere Livewire-requests;
     * daarom bij elke request (ook acties) opnieuw controleren.
     */
    public function boot(): void
    {
        abort_unless(auth()->user()?->isAdmin(), 403);
    }

    public function startCreate(): void
    {
        $this->resetValidation();
        $this->resetForm();
        $this->userId = null;
        $this->showForm = true;
    }

    public function startEdit(int $id): void
    {
        // Alleen CRM-gebruikers; klantlogins horen niet in dit beheer.
        $user = User::query()->crmUsers()->findOrFail($id);

        $this->resetValidation();
        $this->userId = $user->id;
        $this->name = $user->name;
        $this->email = $user->email;
        $this->phone = $user->phone;
        $this->role = $user->role->value;
        $this->active = (bool) $user->active;
        $this->password = null;
        $this->showForm = true;
    }

    public function cancel(): void
    {
        $this->resetValidation();
        $this->resetForm();
        $this->userId = null;
        $this->showForm = false;
    }

    public function save(): void
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->userId)],
            'phone' => ['nullable', 'string', 'max:50'],
            'role' => ['required', Rule::enum(UserRole::class)],
            'active' => ['boolean'],
        ];

        if (! $this->userId) {
            $rules['password'] = ['required', 'string', 'min:10'];
        } elseif (filled($this->password)) {
            $rules['password'] = ['string', 'min:10'];
        }

        $this->name = trim($this->name);
        $this->email = trim($this->email);

        $data = $this->validate($rules, [], [
            'name' => 'naam',
            'email' => 'e-mailadres',
            'phone' => 'telefoon',
            'role' => 'rol',
            'active' => 'actief',
            'password' => 'wachtwoord',
        ]);

        if ($this->userId) {
            $existing = User::query()->crmUsers()->findOrFail($this->userId);
            $willBeAdmin = $data['role'] === UserRole::Admin->value;
            $willBeActive = (bool) $data['active'];

            if ($existing->id === auth()->id()) {
                if (! $willBeActive) {
                    $this->addError('active', 'Je kunt je eigen account niet deactiveren.');

                    return;
                }
                if ($existing->isAdmin() && ! $willBeAdmin) {
                    $this->addError('role', 'Je kunt je eigen adminrol niet verwijderen.');

                    return;
                }
                if ($data['role'] !== $existing->role->value) {
                    $this->addError('role', 'Je kunt je eigen rol niet wijzigen.');

                    return;
                }
            }

            if (self::isLastActiveAdmin($existing) && (! $willBeAdmin || ! $willBeActive)) {
                $this->addError($willBeActive ? 'role' : 'active', 'Dit is de laatste actieve admin. Maak eerst een andere admin aan.');

                return;
            }
        }

        $values = [
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => filled($data['phone'] ?? null) ? trim($data['phone']) : null,
            'role' => UserRole::from($data['role']),
            'active' => (bool) $data['active'],
        ];

        if (filled($data['password'] ?? null)) {
            $values['password'] = $data['password'];
        }

        User::updateOrCreate(
            ['id' => $this->userId],
            $values,
        );

        $this->resetForm();
        $this->userId = null;
        $this->showForm = false;
        session()->now('livewire_status', 'Gebruiker opgeslagen.');
    }

    /**
     * Waar als deze gebruiker de enige actieve admin is.
     */
    public static function isLastActiveAdmin(User $user): bool
    {
        if (! $user->isAdmin() || ! $user->active) {
            return false;
        }

        return ! User::query()
            ->where('role', UserRole::Admin->value)
            ->where('active', true)
            ->whereKeyNot($user->getKey())
            ->exists();
    }

    private function resetForm(): void
    {
        $this->name = '';
        $this->email = '';
        $this->phone = null;
        $this->role = UserRole::Medewerker->value;
        $this->active = true;
        $this->password = null;
    }

    public function render()
    {
        // Klantlogins (eigenaar van een garagebedrijf) horen niet in de gebruikerslijst.
        $users = User::query()
            ->crmUsers()
            ->orderByDesc('active')
            ->orderBy('role')
            ->orderBy('name')
            ->get();

        $activeAdminCount = $users->filter(fn (User $u) => $u->isAdmin() && $u->active)->count();

        return view('livewire.crm.users.index', [
            'users' => $users,
            'currentUserId' => auth()->id(),
            'activeAdminCount' => $activeAdminCount,
            'roles' => UserRole::cases(),
        ])->layout('layouts.crm', ['title' => 'Gebruikers']);
    }
}
