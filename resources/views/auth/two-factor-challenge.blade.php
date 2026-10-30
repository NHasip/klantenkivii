<x-guest-layout>
    <x-slot name="title">Tweestapsverificatie</x-slot>

    <x-authentication-card title="Tweestapsverificatie">
        <div x-data="{ recovery: false }">
            <p class="mb-5 text-sm text-zinc-500" x-show="! recovery">
                Vul de 6-cijferige code uit je authenticator-app in.
            </p>

            <p class="mb-5 text-sm text-zinc-500" x-cloak x-show="recovery">
                Vul een van je herstelcodes in om toegang te krijgen tot je account.
            </p>

            <x-validation-errors class="mb-5" />

            <form method="POST" action="{{ route('two-factor.login') }}" class="space-y-4">
                @csrf

                <div x-show="! recovery">
                    <x-label for="code" value="Verificatiecode" />
                    <x-input id="code" class="mt-1 block w-full text-center font-mono text-lg tracking-[0.4em]" type="text" inputmode="numeric" pattern="[0-9 ]*" maxlength="7" name="code" autofocus x-ref="code" autocomplete="one-time-code" x-bind:disabled="recovery" />
                </div>

                <div x-cloak x-show="recovery">
                    <x-label for="recovery_code" value="Herstelcode" />
                    <x-input id="recovery_code" class="mt-1 block w-full font-mono" type="text" name="recovery_code" x-ref="recovery_code" autocomplete="off" x-bind:disabled="! recovery" />
                </div>

                <x-button class="h-10 w-full">
                    Inloggen
                </x-button>
            </form>

            <div class="mt-6 text-center">
                <button type="button" class="rounded text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                        x-show="! recovery"
                        x-on:click="recovery = true; $nextTick(() => { $refs.recovery_code.focus() })">
                    Een herstelcode gebruiken
                </button>

                <button type="button" class="rounded text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                        x-cloak
                        x-show="recovery"
                        x-on:click="recovery = false; $nextTick(() => { $refs.code.focus() })">
                    De code uit je app gebruiken
                </button>
            </div>

            <p class="mt-4 text-center text-sm text-zinc-600">
                <a href="{{ route('login') }}" class="rounded font-medium text-zinc-600 hover:text-zinc-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">&larr; Terug naar inloggen</a>
            </p>
        </div>
    </x-authentication-card>
</x-guest-layout>
