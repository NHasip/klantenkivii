<div class="flex min-w-0 items-start justify-between gap-3">
    <div class="min-w-0">
        <h2 class="text-base font-semibold text-zinc-900">{{ $title }}</h2>

        @if (isset($description) && trim((string) $description) !== '')
            <p class="mt-0.5 text-sm text-zinc-500">
                {{ $description }}
            </p>
        @endif
    </div>

    @if (isset($aside) && trim((string) $aside) !== '')
        <div class="shrink-0">
            {{ $aside }}
        </div>
    @endif
</div>
