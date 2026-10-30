<x-action-section danger>
    <x-slot name="title">Account verwijderen</x-slot>

    <x-slot name="description">Je account permanent verwijderen.</x-slot>

    <x-slot name="content">
        <p class="max-w-xl text-sm text-zinc-600">
            Als je account is verwijderd, kun je niet meer inloggen. Dit kan niet ongedaan worden gemaakt.
        </p>

        <div class="mt-5">
            <x-danger-button wire:click="confirmUserDeletion" wire:loading.attr="disabled">
                Account verwijderen
            </x-danger-button>
        </div>

        <x-dialog-modal wire:model.live="confirmingUserDeletion">
            <x-slot name="title">Account verwijderen?</x-slot>

            <x-slot name="content">
                Weet je zeker dat je je account permanent wilt verwijderen? Vul ter bevestiging je wachtwoord in.

                <div class="mt-4" x-data="{}" x-on:confirming-delete-user.window="setTimeout(() => $refs.password.focus(), 250)">
                    <x-label for="delete_user_password" value="Wachtwoord" class="sr-only" />
                    <x-input id="delete_user_password" type="password" class="mt-1 block w-full sm:w-3/4"
                                autocomplete="current-password"
                                placeholder="Wachtwoord"
                                x-ref="password"
                                wire:model="password"
                                wire:keydown.enter="deleteUser" />

                    <x-input-error for="password" class="mt-1" />
                </div>
            </x-slot>

            <x-slot name="footer">
                <x-secondary-button wire:click="$toggle('confirmingUserDeletion')" wire:loading.attr="disabled">
                    Annuleren
                </x-secondary-button>

                <x-danger-button wire:click="deleteUser" wire:loading.attr="disabled">
                    Definitief verwijderen
                </x-danger-button>
            </x-slot>
        </x-dialog-modal>
    </x-slot>
</x-action-section>
