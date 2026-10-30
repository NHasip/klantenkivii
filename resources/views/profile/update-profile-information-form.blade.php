<x-form-section submit="updateProfileInformation">
    <x-slot name="title">Profielgegevens</x-slot>

    <x-slot name="description">Je naam en e-mailadres. Met dit e-mailadres log je in.</x-slot>

    <x-slot name="form">
        @if (Laravel\Jetstream\Jetstream::managesProfilePhotos())
            <div x-data="{photoName: null, photoPreview: null}" class="col-span-6 sm:col-span-4">
                <input type="file" id="photo" class="hidden" accept="image/*"
                            wire:model.live="photo"
                            x-ref="photo"
                            x-on:change="
                                    if (! $refs.photo.files.length) return;
                                    photoName = $refs.photo.files[0].name;
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                        photoPreview = e.target.result;
                                    };
                                    reader.readAsDataURL($refs.photo.files[0]);
                            " />

                <x-label for="photo" value="Foto" />

                <div class="mt-2" x-show="! photoPreview">
                    <img src="{{ $this->user->profile_photo_url }}" alt="{{ $this->user->name }}" class="size-20 rounded-full object-cover">
                </div>

                <div class="mt-2" x-show="photoPreview" style="display: none;">
                    <span class="block size-20 rounded-full bg-cover bg-center bg-no-repeat"
                          x-bind:style="'background-image: url(\'' + photoPreview + '\');'">
                    </span>
                </div>

                <div class="mt-3 flex flex-wrap gap-2">
                    <x-secondary-button type="button" x-on:click.prevent="$refs.photo.click()">
                        Nieuwe foto kiezen
                    </x-secondary-button>

                    @if ($this->user->profile_photo_path)
                        <x-secondary-button type="button" wire:click="deleteProfilePhoto">
                            Foto verwijderen
                        </x-secondary-button>
                    @endif
                </div>

                <x-input-error for="photo" class="mt-2" />
            </div>
        @endif

        <div class="col-span-6 sm:col-span-4">
            <x-label for="name" value="Naam" required />
            <x-input id="name" type="text" class="mt-1 block w-full" wire:model="state.name" required autocomplete="name" />
            <x-input-error for="name" class="mt-1" />
        </div>

        <div class="col-span-6 sm:col-span-4">
            <x-label for="email" value="E-mailadres" required />
            <x-input id="email" type="email" class="mt-1 block w-full" wire:model="state.email" required autocomplete="username" />
            <x-input-error for="email" class="mt-1" />

            @if (Laravel\Fortify\Features::enabled(Laravel\Fortify\Features::emailVerification()) && ! $this->user->hasVerifiedEmail())
                <p class="mt-2 text-sm text-zinc-700">
                    Je e-mailadres is nog niet bevestigd.

                    <button type="button" class="rounded font-medium text-indigo-700 underline hover:text-indigo-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" wire:click.prevent="sendEmailVerification">
                        Bevestigingsmail opnieuw versturen
                    </button>
                </p>

                @if ($this->verificationLinkSent)
                    <p class="mt-2 text-sm font-medium text-emerald-700" role="status">
                        Er is een nieuwe bevestigingslink naar je e-mailadres gestuurd.
                    </p>
                @endif
            @endif
        </div>
    </x-slot>

    <x-slot name="actions">
        <x-action-message on="saved">Opgeslagen.</x-action-message>

        <x-button wire:loading.attr="disabled" wire:target="photo, updateProfileInformation">
            Opslaan
        </x-button>
    </x-slot>
</x-form-section>
