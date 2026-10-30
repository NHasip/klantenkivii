@props(['for'])

@error($for)
    <p {{ $attributes->merge(['class' => 'text-xs font-medium text-rose-700']) }} role="alert">{{ $message }}</p>
@enderror
