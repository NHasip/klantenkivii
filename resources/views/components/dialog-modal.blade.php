@props(['id' => null, 'maxWidth' => null])

<x-modal :id="$id" :maxWidth="$maxWidth" {{ $attributes }}>
    <div class="px-5 pb-4 pt-5 sm:px-6">
        <h2 class="section-heading">
            {{ $title }}
        </h2>

        <div class="mt-2 text-sm text-zinc-600">
            {{ $content }}
        </div>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 sm:px-6">
        {{ $footer }}
    </div>
</x-modal>
