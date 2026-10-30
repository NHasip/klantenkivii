@if ($errors->any())
    <div {{ $attributes->merge(['class' => 'rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900']) }} role="alert">
        <div class="flex items-start gap-2">
            <svg class="mt-0.5 h-4 w-4 shrink-0 text-rose-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>
            <div class="min-w-0">
                @if ($errors->count() === 1)
                    <p class="font-medium">{{ $errors->first() }}</p>
                @else
                    <p class="font-semibold">Controleer de volgende punten:</p>
                    <ul class="mt-1 list-disc space-y-0.5 pl-4">
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                @endif
            </div>
        </div>
    </div>
@endif
