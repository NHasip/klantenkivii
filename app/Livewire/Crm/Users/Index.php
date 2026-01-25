<?php

namespace App\Livewire\Crm\Users;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Validation\Rule;
use Livewire\Component;

class Index extends Component
{
    public ?int $userId = null;

    public string $name = '';
    public string $email = '';
    public ?string $phone = null;
    public string $role = 'medewerker';
    public bool $active = true;
    public ?string $password = null;

    public function startCreate(): void
    {
        $this->resetForm();
        $this->userId = null;
    }

    public function startEdit(int $id): void
    {
        $user = User::findOrFail($id);

        $this->userId = $user->id;
        $this->name = $user->name;
        $this->email = $user->email;
        $this->phone = $user->phone;
        $this->role = $user->role->value;
        $this->active = (bool) $user->active;
        $this->password = null;
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

        $data = $this->validate($rules);

        $values = [
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'role' => UserRole::from($data['role']),
            'active' => (bool) $data['active'],
        ];

        if (filled($data['password'] ?? null)) {
            $values['password'] = $data['password'];
        }

        $user = User::updateOrCreate(
            ['id' => $this->userId],
            $values,
        );

        $this->resetForm();
        $this->userId = null;
        session()->flash('status', 'Gebruiker opgeslagen.');
    }

    public function delete(int $id): void
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            session()->flash('status', 'Je kunt jezelf niet verwijderen.');
            return;
        }

        $user->delete();
        session()->flash('status', 'Gebruiker verwijderd.');
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
        $users = User::query()
            ->orderByDesc('active')
            ->orderBy('role')
            ->orderBy('name')
            ->get();

        return view('livewire.crm.users.index', [
            'users' => $users,
            'roles' => UserRole::cases(),
        ])->layout('layouts.crm', ['title' => 'Gebruikers']);
    }
}
