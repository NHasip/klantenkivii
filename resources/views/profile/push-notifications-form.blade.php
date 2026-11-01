@php
    $pushUser = auth()->user();
    $pushTableReady = (function () {
        try {
            return \Illuminate\Support\Facades\Schema::hasTable('push_subscriptions');
        } catch (\Throwable) {
            return false;
        }
    })();
    $pushConfigured = \App\Services\Push\PushNotifier::configured();
    $pushReady = $pushTableReady && $pushConfigured;
    $pushDeviceCount = $pushReady ? $pushUser->pushSubscriptions()->count() : 0;
    $pushTypes = collect(\App\Services\Push\PushNotifier::typesFor($pushUser))
        ->map(fn ($type) => [
            'key' => $type,
            'label' => \App\Services\Push\PushNotifier::TYPES[$type]['label'],
            'hint' => \App\Services\Push\PushNotifier::TYPES[$type]['hint'],
            'enabled' => $pushUser->wantsPush($type),
        ])->values();
@endphp

<x-action-section>
    <x-slot name="title">Meldingen op dit apparaat</x-slot>

    <x-slot name="description">Krijg een pushmelding op je telefoon of computer als er iets gebeurt dat je aandacht nodig heeft, ook als het CRM niet open staat.</x-slot>

    @if ($pushReady && $pushDeviceCount > 0)
        <x-slot name="aside">
            <x-badge tone="success" dot>{{ $pushDeviceCount }} {{ $pushDeviceCount === 1 ? 'apparaat' : 'apparaten' }}</x-badge>
        </x-slot>
    @endif

    <x-slot name="content">
        @if (! $pushTableReady)
            <div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <x-icon name="alert-triangle" class="mt-0.5 h-4 w-4 text-amber-600" />
                Pushmeldingen zijn nog niet beschikbaar. Draai eerst de nieuwste databasemigratie.
            </div>
        @elseif (! $pushConfigured)
            <div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <x-icon name="alert-triangle" class="mt-0.5 h-4 w-4 text-amber-600" />
                Pushmeldingen zijn nog niet ingesteld (admin: draai crm:webpush-keys)
            </div>
        @else
            <div x-data="kiviiPushForm(@js([
                    'publicKey' => (string) config('webpush.public_key'),
                    'storeUrl' => route('profile.push.store'),
                    'destroyUrl' => route('profile.push.destroy'),
                    'testUrl' => route('profile.push.test'),
                    'prefsUrl' => route('profile.push.preferences'),
                    'types' => $pushTypes,
                ]))" class="space-y-5">

                <p class="text-sm text-zinc-600">
                    Meldingen worden per apparaat aangezet. Op een iPhone of iPad (iOS 16.4 of nieuwer) werkt dit alleen in de app op je beginscherm:
                    open het CRM in Safari, tik op Delen, kies "Zet op beginscherm", open Kivii daarna via het icoon en zet hier de meldingen aan.
                </p>

                <template x-if="iosNeedsInstall">
                    <div class="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                        <x-icon name="info" class="mt-0.5 h-4 w-4 text-sky-600" />
                        <span>Je gebruikt nu Safari. Tik onderin op het Delen-icoon, kies "Zet op beginscherm" en open Kivii daarna via het icoon op je beginscherm. Daarna kun je hier meldingen aanzetten.</span>
                    </div>
                </template>

                <template x-if="!supported && !iosNeedsInstall">
                    <div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <x-icon name="alert-triangle" class="mt-0.5 h-4 w-4 text-amber-600" />
                        <span>Deze browser ondersteunt geen pushmeldingen. Gebruik een recente versie van Chrome, Edge, Firefox of Safari.</span>
                    </div>
                </template>

                <template x-if="supported && permission === 'denied'">
                    <div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <x-icon name="alert-triangle" class="mt-0.5 h-4 w-4 text-amber-600" />
                        <span>Meldingen zijn voor deze site geblokkeerd. Sta ze toe in de instellingen van je browser of telefoon en probeer het opnieuw.</span>
                    </div>
                </template>

                <div class="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3" x-show="supported">
                    <span class="icon-tile h-9 w-9 rounded-lg" :class="subscribed ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'" aria-hidden="true"><x-icon name="bell" class="h-4 w-4" /></span>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-semibold text-zinc-900" x-text="subscribed ? 'Meldingen staan aan op dit apparaat' : 'Meldingen staan uit op dit apparaat'"></p>
                        <p class="text-xs text-zinc-500">Aangemeld in totaal: <span x-text="deviceCount"></span> <span x-text="deviceCount === 1 ? 'apparaat' : 'apparaten'"></span></p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                    <x-button type="button" x-show="!subscribed" x-bind:disabled="busy || !supported || permission === 'denied'" x-on:click="enable()">
                        <x-icon name="bell" class="h-4 w-4" />
                        Meldingen aanzetten op dit apparaat
                    </x-button>
                    <button type="button" class="btn btn-secondary" x-show="subscribed" x-cloak x-bind:disabled="busy" x-on:click="sendTest()">
                        <x-icon name="sparkles" class="h-4 w-4" />
                        Testmelding sturen
                    </button>
                    <button type="button" class="btn btn-ghost" x-show="subscribed" x-cloak x-bind:disabled="busy" x-on:click="disable()">
                        <x-icon name="x" class="h-4 w-4" />
                        Uitzetten
                    </button>
                    <span class="text-sm" :class="error ? 'text-rose-700' : 'text-zinc-600'" role="status" aria-live="polite" x-text="message"></span>
                </div>

                <fieldset class="space-y-1">
                    <legend class="text-sm font-semibold text-zinc-900">Waarvoor wil je een melding?</legend>
                    <p class="text-xs text-zinc-500">Geldt voor al je aangemelde apparaten.</p>
                    <ul class="mt-2 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
                        <template x-for="type in types" :key="type.key">
                            <li>
                                <label class="flex cursor-pointer items-start gap-3 px-4 py-3">
                                    <input type="checkbox" class="checkbox mt-0.5" x-model="type.enabled" x-on:change="savePrefs(type)" :disabled="savingPrefs">
                                    <span class="min-w-0">
                                        <span class="block text-sm font-medium text-zinc-900" x-text="type.label"></span>
                                        <span class="block text-xs text-zinc-500" x-text="type.hint"></span>
                                    </span>
                                </label>
                            </li>
                        </template>
                    </ul>
                </fieldset>
            </div>
        @endif
    </x-slot>
</x-action-section>

@if ($pushReady)
    <script>
    window.kiviiPushForm = window.kiviiPushForm || function (config) {
        const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        const request = async (method, url, body) => {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify(body ?? {}),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                const firstError = payload?.errors ? Object.values(payload.errors).flat()?.[0] : null;
                throw new Error(firstError || payload?.message || 'Er ging iets mis. Probeer het opnieuw.');
            }
            return payload;
        };

        const urlBase64ToUint8Array = (base64) => {
            const padding = '='.repeat((4 - (base64.length % 4)) % 4);
            const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
            return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
        };

        const ua = navigator.userAgent || '';
        const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
        const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

        return {
            types: config.types,
            supported,
            iosNeedsInstall: isIos && !standalone,
            permission: 'Notification' in window ? Notification.permission : 'default',
            subscribed: false,
            deviceCount: {{ (int) $pushDeviceCount }},
            busy: false,
            savingPrefs: false,
            message: '',
            error: false,

            async init() {
                if (!this.supported) return;
                try {
                    const registration = await this.registration();
                    const subscription = await registration.pushManager.getSubscription();
                    this.subscribed = !!subscription && this.permission === 'granted';
                    // Bestaand abonnement opnieuw doorgeven: zo blijft de koppeling met deze gebruiker actueel.
                    if (this.subscribed) {
                        const result = await request('POST', config.storeUrl, subscription.toJSON());
                        this.deviceCount = result.count ?? this.deviceCount;
                    }
                } catch (e) {
                    // Geen melding: de knop blijft beschikbaar.
                }
            },

            async registration() {
                const existing = await navigator.serviceWorker.getRegistration('/');
                if (!existing) await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                return navigator.serviceWorker.ready;
            },

            setStatus(message, error = false) {
                this.message = message || '';
                this.error = !!error;
            },

            async enable() {
                if (this.iosNeedsInstall) {
                    this.setStatus('Zet Kivii eerst op je beginscherm en open het via het icoon.', true);
                    return;
                }
                this.busy = true;
                this.setStatus('Meldingen aanzetten...');
                try {
                    const permission = await Notification.requestPermission();
                    this.permission = permission;
                    if (permission !== 'granted') {
                        this.setStatus('Geen toestemming gegeven voor meldingen.', true);
                        return;
                    }
                    const registration = await this.registration();
                    let subscription = await registration.pushManager.getSubscription();
                    if (!subscription) {
                        subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(config.publicKey),
                        });
                    }
                    const payload = subscription.toJSON();
                    const encodings = window.PushManager?.supportedContentEncodings || [];
                    payload.contentEncoding = encodings.includes('aes128gcm') || !encodings.length ? 'aes128gcm' : 'aesgcm';
                    const result = await request('POST', config.storeUrl, payload);
                    this.subscribed = true;
                    this.deviceCount = result.count ?? this.deviceCount + 1;
                    this.setStatus(result.message || 'Meldingen staan aan.');
                } catch (e) {
                    this.setStatus(e?.message || 'Meldingen konden niet worden aangezet.', true);
                } finally {
                    this.busy = false;
                }
            },

            async disable() {
                this.busy = true;
                this.setStatus('Meldingen uitzetten...');
                try {
                    const registration = await this.registration();
                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        const result = await request('DELETE', config.destroyUrl, { endpoint: subscription.endpoint });
                        await subscription.unsubscribe().catch(() => undefined);
                        this.deviceCount = result.count ?? Math.max(0, this.deviceCount - 1);
                    }
                    this.subscribed = false;
                    this.setStatus('Meldingen staan uit op dit apparaat.');
                } catch (e) {
                    this.setStatus(e?.message || 'Uitzetten mislukt.', true);
                } finally {
                    this.busy = false;
                }
            },

            async sendTest() {
                this.busy = true;
                this.setStatus('Testmelding versturen...');
                try {
                    const result = await request('POST', config.testUrl, {});
                    this.setStatus(result.message || 'Testmelding verstuurd.');
                } catch (e) {
                    this.setStatus(e?.message || 'Testmelding mislukt.', true);
                } finally {
                    this.busy = false;
                }
            },

            async savePrefs(type) {
                this.savingPrefs = true;
                try {
                    const types = {};
                    this.types.forEach((t) => { types[t.key] = !!t.enabled; });
                    await request('PATCH', config.prefsUrl, { types });
                    this.setStatus('Voorkeuren opgeslagen.');
                } catch (e) {
                    type.enabled = !type.enabled;
                    this.setStatus(e?.message || 'Voorkeuren opslaan mislukt.', true);
                } finally {
                    this.savingPrefs = false;
                }
            },
        };
    };
    </script>
@endif
