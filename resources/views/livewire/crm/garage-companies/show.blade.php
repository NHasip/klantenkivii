<div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
            <div class="text-sm text-zinc-500">
                <a href="{{ route('crm.garage_companies.index') }}" class="font-semibold text-indigo-700 hover:text-indigo-900">Klanten</a>
                <span class="px-1">/</span>
                <span class="truncate">{{ $garageCompany->bedrijfsnaam }}</span>
            </div>
            <h1 class="mt-1 truncate text-2xl font-semibold tracking-tight">{{ $garageCompany->bedrijfsnaam }}</h1>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                <span class="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">{{ $garageCompany->status->value }}</span>
                <span>&middot;</span>
                <span>{{ $garageCompany->hoofd_email }}</span>
                <span>&middot;</span>
                <span>{{ $garageCompany->hoofd_telefoon }}</span>
                <span>&middot;</span>
                <span>{{ $garageCompany->plaats }}</span>
            </div>
        </div>

        <div class="shrink-0">
            <a href="{{ route('crm.garage_companies.index') }}" class="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">Terug</a>
        </div>
    </div>

    <div class="overflow-x-auto">
        <div class="inline-flex min-w-full gap-2 rounded-xl border border-zinc-200 bg-white p-2">
            @foreach($tabs as $key => $label)
                <a
                    href="{{ route('crm.garage_companies.show', ['garageCompany' => $garageCompany->id, 'tab' => $key]) }}"
                    class="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold {{ $tab === $key ? 'bg-indigo-600 text-white' : 'text-zinc-700 hover:bg-zinc-50' }}"
                >
                    {{ $label }}
                </a>
            @endforeach
        </div>
    </div>

    <div class="rounded-xl border border-zinc-200 bg-white p-5">
        @if($tab === 'overzicht')
            @livewire('crm.garage-companies.tabs.overview', ['garageCompanyId' => $garageCompany->id], key('overview-'.$garageCompany->id))
        @elseif($tab === 'klantpersonen')
            @livewire('crm.garage-companies.tabs.persons', ['garageCompanyId' => $garageCompany->id], key('persons-'.$garageCompany->id))
        @elseif($tab === 'demo_status')
            @livewire('crm.garage-companies.tabs.demo-status', ['garageCompanyId' => $garageCompany->id], key('demo-'.$garageCompany->id))
        @elseif($tab === 'incasso')
            @livewire('crm.garage-companies.tabs.incasso', ['garageCompanyId' => $garageCompany->id], key('incasso-'.$garageCompany->id))
        @elseif($tab === 'modules')
            @livewire('crm.garage-companies.tabs.modules', ['garageCompanyId' => $garageCompany->id], key('modules-'.$garageCompany->id))
        @elseif($tab === 'seats')
            @livewire('crm.garage-companies.tabs.seats', ['garageCompanyId' => $garageCompany->id], key('seats-'.$garageCompany->id))
        @elseif($tab === 'timeline')
            @livewire('crm.garage-companies.tabs.timeline', ['garageCompanyId' => $garageCompany->id], key('timeline-'.$garageCompany->id))
        @elseif($tab === 'taken_afspraken')
            @livewire('crm.garage-companies.tabs.tasks-appointments', ['garageCompanyId' => $garageCompany->id], key('tasks-'.$garageCompany->id))
        @endif
    </div>
</div>
