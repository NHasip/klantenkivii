import React, { useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';

function formatEuro(value) {
    try {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
    } catch {
        return `EUR ${Number(value ?? 0).toFixed(2)}`.replace('.', ',');
    }
}

function numberValue(value) {
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

function toLocalDateTimeInput(date) {
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hour}:${minute}`;
}

function generatePassword(length = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const values = new Uint32Array(length);
    const result = [];
    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(values);
        for (let i = 0; i < length; i += 1) {
            result.push(chars[values[i] % chars.length]);
        }
    } else {
        for (let i = 0; i < length; i += 1) {
            result.push(chars[Math.floor(Math.random() * chars.length)]);
        }
    }
    return result.join('');
}

export default function Create({ statusOptions, sourceOptions, moduleRows, defaults, urls }) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        bedrijfsnaam: '',
        kvk_nummer: '',
        land: defaults.land || 'Nederland',
        voor_en_achternaam: '',
        email: '',
        telefoonnummer: '',
        straatnaam_en_nummer: '',
        postcode: '',
        plaats: '',
        iban: '',
        bic: '',
        plaats_van_tekenen: '',
        datum_van_tekenen: defaults.datum_van_tekenen || '',
        status: statusOptions?.[0] || 'lead',
        bron: sourceOptions?.[0] || 'website_formulier',
        tags: '',
        proefperiode_start: defaults.proefperiode_start || toLocalDateTimeInput(new Date()),
        actief_vanaf: '',
        opgezegd_op: '',
        opzegreden: '',
        login_email: '',
        login_password: '',
        moduleRows: moduleRows || [],
    });

    const totals = useMemo(() => {
        let totaalExcl = 0;
        let btw = 0;
        let actieveModules = 0;

        data.moduleRows.forEach((row) => {
            if (!row.actief) return;
            const prijs = numberValue(row.prijs_maand_excl);
            const aantal = Math.max(1, Number(row.aantal || 1));
            totaalExcl += prijs * aantal;
            btw += prijs * aantal * (numberValue(row.btw_percentage) / 100);
            actieveModules += 1;
        });

        return {
            totaleModules: data.moduleRows.length,
            actieveModules,
            totaalExcl,
            btw,
            totaalIncl: totaalExcl + btw,
        };
    }, [data.moduleRows]);

    const updateModuleRow = (index, key, value) => {
        setData(
            'moduleRows',
            data.moduleRows.map((row, i) =>
                i === index
                    ? {
                          ...row,
                          [key]: value,
                      }
                    : row
            )
        );
    };

    const toggleModule = (index) => {
        const row = data.moduleRows[index];
        updateModuleRow(index, 'actief', !row.actief);
        if (!row.actief && Number(row.aantal || 0) < 1) {
            updateModuleRow(index, 'aantal', 1);
        }
    };

    const submit = (event) => {
        event.preventDefault();
        post(urls.store, { preserveScroll: true });
    };

    return (
        <div className="space-y-6">
            <Head title="Nieuwe klant" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900">Nieuwe klant</h1>
                    <p className="mt-1 text-sm text-zinc-500">Maak een garagebedrijf aan met modules en incasso.</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={urls.index}
                        className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                    >
                        Terug
                    </Link>
                    <Link
                        href={urls.old_create}
                        className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-50"
                    >
                        Nieuw (old)
                    </Link>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">Bedrijf</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-zinc-600">Bedrijfsnaam *</label>
                            <input
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.bedrijfsnaam}
                                onChange={(e) => setData('bedrijfsnaam', e.target.value)}
                            />
                            {errors.bedrijfsnaam && <div className="mt-1 text-xs text-rose-600">{errors.bedrijfsnaam}</div>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600">KVK nummer</label>
                            <input
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.kvk_nummer}
                                onChange={(e) => setData('kvk_nummer', e.target.value)}
                            />
                            {errors.kvk_nummer && <div className="mt-1 text-xs text-rose-600">{errors.kvk_nummer}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Land *</label>
                            <input
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.land}
                                onChange={(e) => setData('land', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">Contactpersoon</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-zinc-600">Voor- en achternaam *</label>
                            <input
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.voor_en_achternaam}
                                onChange={(e) => setData('voor_en_achternaam', e.target.value)}
                            />
                            {errors.voor_en_achternaam && (
                                <div className="mt-1 text-xs text-rose-600">{errors.voor_en_achternaam}</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">E-mail *</label>
                            <input
                                type="email"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && <div className="mt-1 text-xs text-rose-600">{errors.email}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Telefoon *</label>
                            <input
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.telefoonnummer}
                                onChange={(e) => setData('telefoonnummer', e.target.value)}
                            />
                            {errors.telefoonnummer && (
                                <div className="mt-1 text-xs text-rose-600">{errors.telefoonnummer}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">Adres</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-zinc-600">Straat + nummer *</label>
                            <input
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.straatnaam_en_nummer}
                                onChange={(e) => setData('straatnaam_en_nummer', e.target.value)}
                            />
                            {errors.straatnaam_en_nummer && (
                                <div className="mt-1 text-xs text-rose-600">{errors.straatnaam_en_nummer}</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Postcode *</label>
                            <input
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.postcode}
                                onChange={(e) => setData('postcode', e.target.value)}
                            />
                            {errors.postcode && <div className="mt-1 text-xs text-rose-600">{errors.postcode}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Plaats *</label>
                            <input
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.plaats}
                                onChange={(e) => {
                                    setData('plaats', e.target.value);
                                    if (!data.plaats_van_tekenen) {
                                        setData('plaats_van_tekenen', e.target.value);
                                    }
                                }}
                            />
                            {errors.plaats && <div className="mt-1 text-xs text-rose-600">{errors.plaats}</div>}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">Incasso (SEPA)</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">IBAN</label>
                            <input
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.iban}
                                onChange={(e) => setData('iban', e.target.value)}
                            />
                            {errors.iban && <div className="mt-1 text-xs text-rose-600">{errors.iban}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">BIC</label>
                            <input
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.bic}
                                onChange={(e) => setData('bic', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Plaats van tekenen</label>
                            <input
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.plaats_van_tekenen}
                                onChange={(e) => setData('plaats_van_tekenen', e.target.value)}
                            />
                            {errors.plaats_van_tekenen && (
                                <div className="mt-1 text-xs text-rose-600">{errors.plaats_van_tekenen}</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Datum van tekenen</label>
                            <input
                                type="date"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.datum_van_tekenen}
                                onChange={(e) => setData('datum_van_tekenen', e.target.value)}
                            />
                            {errors.datum_van_tekenen && (
                                <div className="mt-1 text-xs text-rose-600">{errors.datum_van_tekenen}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">CRM</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Status</label>
                            <select
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                            >
                                {statusOptions.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                            {errors.status && <div className="mt-1 text-xs text-rose-600">{errors.status}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Proefperiode start</label>
                            <input
                                type="datetime-local"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.proefperiode_start}
                                onChange={(e) => setData('proefperiode_start', e.target.value)}
                            />
                            {errors.proefperiode_start && (
                                <div className="mt-1 text-xs text-rose-600">{errors.proefperiode_start}</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Actief vanaf</label>
                            <input
                                type="datetime-local"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.actief_vanaf}
                                onChange={(e) => setData('actief_vanaf', e.target.value)}
                            />
                            {errors.actief_vanaf && (
                                <div className="mt-1 text-xs text-rose-600">{errors.actief_vanaf}</div>
                            )}
                        </div>
                        {data.status === 'opgezegd' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Opgezegd op</label>
                                    <input
                                        type="datetime-local"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={data.opgezegd_op}
                                        onChange={(e) => setData('opgezegd_op', e.target.value)}
                                    />
                                    {errors.opgezegd_op && (
                                        <div className="mt-1 text-xs text-rose-600">{errors.opgezegd_op}</div>
                                    )}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600">Opzegreden</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={data.opzegreden}
                                        onChange={(e) => setData('opzegreden', e.target.value)}
                                    />
                                    {errors.opzegreden && (
                                        <div className="mt-1 text-xs text-rose-600">{errors.opzegreden}</div>
                                    )}
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Bron</label>
                            <select
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.bron}
                                onChange={(e) => setData('bron', e.target.value)}
                            >
                                {sourceOptions.map((source) => (
                                    <option key={source} value={source}>
                                        {source}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-zinc-600">Tags</label>
                            <textarea
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                rows={2}
                                value={data.tags}
                                onChange={(e) => setData('tags', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">Login gegevens</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Login e-mail</label>
                            <input
                                type="email"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.login_email}
                                onChange={(e) => setData('login_email', e.target.value)}
                            />
                            {errors.login_email && (
                                <div className="mt-1 text-xs text-rose-600">{errors.login_email}</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Wachtwoord</label>
                            <div className="mt-1 flex gap-2">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full rounded-md border-zinc-300 text-sm"
                                    value={data.login_password}
                                    onChange={(e) => setData('login_password', e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 px-3 text-xs font-semibold hover:bg-zinc-50"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                >
                                    {showPassword ? 'Verberg' : 'Toon'}
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 px-3 text-xs font-semibold hover:bg-zinc-50"
                                    onClick={() => {
                                        setData('login_password', generatePassword());
                                        setShowPassword(true);
                                    }}
                                >
                                    Genereer
                                </button>
                            </div>
                            {errors.login_password && (
                                <div className="mt-1 text-xs text-rose-600">{errors.login_password}</div>
                            )}
                        </div>
                        <div className="sm:col-span-2 text-xs text-zinc-500">
                            Laat leeg als je nog geen account wilt aanmaken. Vul beide velden in om een login te creëren.
                        </div>
                    </div>
                </div>

                <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">Modules & prijzen</div>
                            <div className="mt-1 text-xs text-zinc-500">
                                Activeer modules en leg prijsafspraken vast per maand. Actief: {totals.actieveModules} /{' '}
                                {totals.totaleModules}. Actief vereist aantal ≥ 1. Prijs 0 is toegestaan.
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">Totaal excl. btw</div>
                            <div className="mt-1 text-xl font-semibold">{formatEuro(totals.totaalExcl)}</div>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">BTW bedrag</div>
                            <div className="mt-1 text-xl font-semibold">{formatEuro(totals.btw)}</div>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">Totaal incl. btw</div>
                            <div className="mt-1 text-xl font-semibold">{formatEuro(totals.totaalIncl)}</div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        <table className="min-w-full divide-y divide-zinc-100">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Actief</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Module</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Aantal</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Prijs (excl.)</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">BTW %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {data.moduleRows.map((row, index) => (
                                    <tr key={row.module_id} className="hover:bg-zinc-50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                className="rounded border-zinc-300"
                                                checked={row.actief}
                                                onChange={() => toggleModule(index)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold">{row.naam}</td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="0"
                                                max="999"
                                                className="w-24 rounded-md border-zinc-300 text-sm"
                                                value={row.aantal}
                                                onChange={(e) => updateModuleRow(index, 'aantal', e.target.value)}
                                            />
                                            {errors[`moduleRows.${index}.aantal`] && (
                                                <div className="mt-1 text-xs text-rose-600">
                                                    {errors[`moduleRows.${index}.aantal`]}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="w-40 rounded-md border-zinc-300 text-sm"
                                                value={row.prijs_maand_excl}
                                                onChange={(e) => updateModuleRow(index, 'prijs_maand_excl', e.target.value)}
                                            />
                                            {errors[`moduleRows.${index}.prijs_maand_excl`] && (
                                                <div className="mt-1 text-xs text-rose-600">
                                                    {errors[`moduleRows.${index}.prijs_maand_excl`]}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-24 rounded-md border-zinc-300 text-sm"
                                                value={row.btw_percentage}
                                                onChange={(e) => updateModuleRow(index, 'btw_percentage', e.target.value)}
                                            />
                                            {errors[`moduleRows.${index}.btw_percentage`] && (
                                                <div className="mt-1 text-xs text-rose-600">
                                                    {errors[`moduleRows.${index}.btw_percentage`]}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                        disabled={processing}
                    >
                        {processing ? 'Opslaan...' : 'Klant opslaan'}
                    </button>
                </div>
            </form>
        </div>
    );
}
