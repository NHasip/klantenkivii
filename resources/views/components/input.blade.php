@props(['disabled' => false])

<input @disabled($disabled) {!! $attributes->merge(['class' => 'rounded-lg border-zinc-300 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-indigo-600 disabled:bg-zinc-50 disabled:text-zinc-500']) !!}>
