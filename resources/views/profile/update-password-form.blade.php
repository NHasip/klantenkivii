<x-form-section submit="updatePassword">
    <x-slot name="title">Wachtwoord wijzigen</x-slot>

    <x-slot name="description">Gebruik een lang, uniek wachtwoord. Een wachtwoordmanager helpt daarbij.</x-slot>

    <x-slot name="form">
        <div class="col-span-6 sm:col-span-4">
            <x-label for="current_password" value="Huidig wachtwoord" />
            <x-input id="current_password" type="password" class="mt-1 block w-full" wire:model="state.current_password" autocomplete="current-password" />
            <x-input-error for="current_password" class="mt-1" />
        </div>

        <div class="col-span-6 sm:col-span-4">
            <x-label for="password" value="Nieuw wachtwoord" />
            <x-input id="password" type="password" class="mt-1 block w-full" wire:model="state.password" autocomplete="new-password" />
            <x-input-error for="password" class="mt-1" />
        </div>

        <div class="col-span-6 sm:col-span-4">
            <x-label for="password_confirmation" value="Herhaal nieuw wachtwoord" />
            <x-input id="password_confirmation" type="password" class="mt-1 block w-full" wire:model="state.password_confirmation" autocomplete="new-password" />
            <x-input-error for="password_confirmation" class="mt-1" />
        </div>
    </x-slot>

    <x-slot name="actions">
        <x-action-message on="saved">Wachtwoord gewijzigd.</x-action-message>

        <x-button wire:loading.attr="disabled" wire:target="updatePassword">
            Wachtwoord opslaan
        </x-button>
    </x-slot>
</x-form-section>
