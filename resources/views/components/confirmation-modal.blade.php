@props(['id' => null, 'maxWidth' => null])

<x-modal :id="$id" :maxWidth="$maxWidth" {{ $attributes }}>
    <div class="px-5 pb-4 pt-5 sm:px-6">
        <div class="sm:flex sm:items-start sm:gap-4">
            <div class="mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 sm:mx-0">
                <svg class="h-5 w-5 text-rose-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
            </div>

            <div class="mt-3 text-center sm:mt-0 sm:text-start">
                <h2 class="section-heading">
                    {{ $title }}
                </h2>

                <div class="mt-2 text-sm text-zinc-600">
                    {{ $content }}
                </div>
            </div>
        </div>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 sm:px-6">
        {{ $footer }}
    </div>
</x-modal>
