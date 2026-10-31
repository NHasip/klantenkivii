import React, { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { useConfirm } from '../../../../components/ConfirmProvider';
import { useDialog } from '../../../../components/useDialog';
import { Badge, Button, Card, CardHeader, EmptyState, Field, IconTile, cx, inputClasses } from '../../../../components/ui';
import CopyButton, { copyText } from './CopyButton';
import { Notice, formatDate, formatDateTime } from './showUtils';

export const REQUEST_STATUS_META = {
    open: { label: 'Open', tone: 'info' },
    ontvangen: { label: 'Ontvangen', tone: 'warning' },
    verwerkt: { label: 'Verwerkt', tone: 'success' },
    fout: { label: 'Fout', tone: 'danger' },
    ingetrokken: { label: 'Ingetrokken', tone: 'neutral' },
    verlopen: { label: 'Verlopen', tone: 'neutral' },
};

export const VIA_LABELS = { graph: 'Microsoft 365', outlook: 'Outlook', link: 'gekopieerde link' };

export function RequestStatusBadge({ status }) {
    const meta = REQUEST_STATUS_META[status] || { label: status, tone: 'neutral' };
    return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
}

export function requestErrorMessage(error) {
    const data = error?.response?.data;
    const first = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
    if (first) return first;
    if (error?.response?.status === 429) return 'Te veel verzoeken. Wacht even en probeer het opnieuw.';
    if (error?.response?.status === 403) return 'Alleen beheerders mogen dit doen.';
    if (data?.message) return data.message;
    return 'Er ging iets mis. Probeer het opnieuw.';
}

const RELOAD_PROPS = ['mandateRequests', 'activities', 'mandates', 'incasso', 'hasActiveMandate', 'emailTemplates'];

export function reloadMandateProps() {
    router.reload({ only: RELOAD_PROPS, preserveScroll: true });
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function fill(text, values, escape) {
    return String(text || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) =>
        Object.prototype.hasOwnProperty.call(values, key) ? (escape ? escapeHtml(values[key]) : String(values[key])) : match,
    );
}

function addDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + Number(days || 30));
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

const DEFAULT_KEY = '__standaard__';

/**
 * Dialoog "Machtiging versturen". Bij openen wordt niets opgeslagen; pas bij Versturen, Openen in Outlook
 * of Kopieer link maakt de server een verzoek (ref + kenmerk) aan.
 */
export function MandateRequestDialog({ open, onClose, company, config, urls, templates = [], resendRequest = null }) {
    const confirm = useConfirm();
    const dialogRef = useDialog(open, onClose);
    const builtIn = config?.default_template;
    const savedDefault = templates.find((t) => t.key === builtIn?.key || t.name === builtIn?.name);
    const [email, setEmail] = useState('');
    const [templateId, setTemplateId] = useState(DEFAULT_KEY);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!open) return;
        setEmail(resendRequest?.recipient_email || config?.default_email || '');
        setTemplateId(savedDefault ? String(savedDefault.id) : DEFAULT_KEY);
        setBusy(null);
        setError(null);
        setResult(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, resendRequest?.id]);

    const template = templateId === DEFAULT_KEY ? builtIn : templates.find((t) => String(t.id) === templateId) || builtIn;
    const kenmerk = resendRequest?.kenmerk || 'KIVII-XXXXXXXX';
    const values = useMemo(() => {
        const base = config?.form_url || 'https://kivii.nl/incasso-machtiging/';
        return {
            ...(config?.data || {}),
            machtigingslink: `${base}${base.includes('?') ? '&' : '?'}ref=(wordt aangemaakt)&kenmerk=${encodeURIComponent(kenmerk)}&bedrijf=${encodeURIComponent(company?.bedrijfsnaam || '')}`,
            kenmerk: resendRequest ? kenmerk : `${kenmerk} (nieuw kenmerk bij versturen)`,
            geldig_tot: addDays(config?.valid_days),
            weblink: 'https://web.kivii.nl/',
        };
    }, [config, company, kenmerk, resendRequest]);

    if (!open) return null;

    const subject = fill(template?.subject, values, false);
    const html = fill(template?.body_html, values, true);
    const graphReady = Boolean(config?.graph_configured);
    const target = resendRequest ? urls.resend.replace('__ID__', resendRequest.id) : urls.store;
    const usesMandateLink = /\{\{\s*machtigingslink\s*\}\}/.test(template?.body_html || '');

    const run = async (via) => {
        const emailOk = via === 'link' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
        if (!emailOk) {
            setError('Vul een geldig e-mailadres in als ontvanger.');
            return;
        }
        const texts = {
            graph: {
                title: 'Machtigingsmail versturen?',
                message: `De mail gaat naar ${email.trim()} namens ${config.sender}. ${resendRequest ? `Kenmerk ${resendRequest.kenmerk} blijft gelijk en de link is weer ${config.valid_days} dagen geldig.` : `Er wordt een nieuw kenmerk aangemaakt, de link is ${config.valid_days} dagen geldig.`}`,
                confirmText: 'Versturen',
            },
            outlook: {
                title: 'Openen in Outlook?',
                message: `Het verzoek wordt aangemaakt en Outlook opent met de mail aan ${email.trim()}. Verstuur de mail zelf vanuit ${config.sender}.`,
                confirmText: 'Openen in Outlook',
            },
            link: {
                title: 'Link kopiëren?',
                message: `Er wordt een ${resendRequest ? 'verlengde' : 'nieuwe'} machtigingslink aangemaakt die ${config.valid_days} dagen geldig is.`,
                confirmText: 'Kopieer link',
            },
        }[via];
        const ok = await confirm({ ...texts, cancelText: 'Annuleren' });
        if (!ok) return;

        setBusy(via);
        setError(null);
        try {
            const { data } = await axios.post(target, {
                via,
                email: email.trim() || null,
                template_id: templateId === DEFAULT_KEY ? null : Number(templateId),
            });
            let message = data.message;
            if (via === 'outlook') {
                window.location.href = `mailto:${encodeURIComponent(data.email || email.trim())}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.text)}`;
            }
            if (via === 'link') {
                const copied = await copyText(data.link);
                if (!copied) message = 'Link aangemaakt. Kopieer hem hieronder handmatig.';
            }
            setResult({ ...data, message, via });
            reloadMandateProps();
        } catch (e) {
            setError(requestErrorMessage(e));
        } finally {
            setBusy(null);
        }
    };

    const saveAsTemplate = () => {
        setBusy('template');
        router.post(
            urls.templates_store,
            { name: builtIn.name, subject: builtIn.subject, body_html: builtIn.body_html, is_active: true },
            {
                preserveScroll: true,
                preserveState: true,
                onError: (errs) => setError(Object.values(errs)[0] || 'Opslaan mislukt.'),
                onFinish: () => setBusy(null),
            },
        );
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-[2px]"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !busy) onClose();
            }}
        >
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="machtiging-dialog-title" tabIndex={-1} className="max-h-dvh-92 w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-pop sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <IconTile icon="mail" tone="brand" />
                        <div className="min-w-0">
                            <h2 id="machtiging-dialog-title" className="text-lg font-semibold text-zinc-900">
                                {resendRequest ? 'Machtiging opnieuw versturen' : 'Machtiging versturen'}
                            </h2>
                            <p className="mt-0.5 text-sm text-zinc-500">
                                De klant vult de machtiging in op kivii.nl. De gegevens komen daarna automatisch bij {company?.bedrijfsnaam}.
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" iconOnly icon="x" type="button" onClick={onClose} aria-label="Venster sluiten" disabled={Boolean(busy)} />
                </div>

                {!graphReady && (
                    <Notice tone="warning" className="mt-5" title="Stel eerst de Microsoft-koppeling voor info@kivii.nl in">
                        Machtigingsmails gaan alleen weg vanuit {config.sender}, nooit via de CRM-server. Tot de koppeling is ingesteld kun je de mail openen in je eigen Outlook (info@kivii.nl) of de link kopiëren.
                    </Notice>
                )}

                {result ? (
                    <div className="mt-5 space-y-4">
                        <Notice tone="success" title={result.message}>
                            Kenmerk <span className="font-mono">{result.request?.kenmerk}</span>, geldig tot {formatDate(result.request?.expires_at)}.
                        </Notice>
                        <Field id="machtiging-link" label="Machtigingslink">
                            <div className="flex items-center gap-1">
                                <input id="machtiging-link" className={cx(inputClasses, 'font-mono text-xs')} readOnly value={result.link} onFocus={(e) => e.target.select()} />
                                <CopyButton value={result.link} label="Link kopiëren" />
                            </div>
                        </Field>
                        <div className="dialog-footer-sticky flex justify-end max-sm:pt-3">
                            <Button onClick={onClose}>Sluiten</Button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-5 space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field id="machtiging-email" label="Ontvanger" hint="Standaard het primaire e-mailadres van de klant.">
                                <input
                                    id="machtiging-email"
                                    type="email"
                                    className={inputClasses}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    data-autofocus="desktop"
                                    autoComplete="off"
                                />
                            </Field>
                            <Field id="machtiging-template" label="Template">
                                <select id="machtiging-template" className={inputClasses} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                                    {!savedDefault && <option value={DEFAULT_KEY}>{builtIn?.name} (standaard)</option>}
                                    {templates.map((t) => (
                                        <option key={t.id} value={String(t.id)}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        {!usesMandateLink && (
                            <Notice tone="warning">Deze template bevat geen {'{{ machtigingslink }}'}. De klant krijgt dan geen link naar het formulier.</Notice>
                        )}

                        <div className="overflow-hidden rounded-xl border border-zinc-200">
                            <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm">
                                <p className="text-xs text-zinc-500">Van: {config.sender}{email ? ` · Aan: ${email}` : ''}</p>
                                <p className="mt-0.5 font-semibold text-zinc-900">{subject || '(geen onderwerp)'}</p>
                            </div>
                            <iframe title="Voorbeeld machtigingsmail" sandbox="" srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#18181b;margin:16px}a{color:#4f46e5}</style></head><body>${html}</body></html>`} className="h-40 w-full bg-white sm:h-72" />
                        </div>

                        {error && <Notice tone="danger">{error}</Notice>}

                        <div className="dialog-footer-sticky flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                {templateId === DEFAULT_KEY && !savedDefault && (
                                    <Button variant="ghost" size="sm" icon="plus" onClick={saveAsTemplate} loading={busy === 'template'} disabled={Boolean(busy)}>
                                        Opslaan als template
                                    </Button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                <Button variant="secondary" size="sm" icon="link" onClick={() => run('link')} loading={busy === 'link'} disabled={Boolean(busy)}>
                                    Kopieer link
                                </Button>
                                <Button variant="secondary" size="sm" icon="external-link" onClick={() => run('outlook')} loading={busy === 'outlook'} disabled={Boolean(busy)}>
                                    Openen in Outlook
                                </Button>
                                <Button
                                    size="sm"
                                    icon="mail"
                                    onClick={() => run('graph')}
                                    loading={busy === 'graph'}
                                    disabled={Boolean(busy) || !graphReady}
                                    title={graphReady ? `Versturen namens ${config.sender}` : 'Stel eerst de Microsoft-koppeling voor info@kivii.nl in'}
                                >
                                    Versturen
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}

const defaultSelection = (rows) => rows.filter((r) => !r.same && !r.crm).map((r) => r.key);

/**
 * Vergelijking formuliergegevens versus CRM met vinkjes. De server neemt alleen de gekozen
 * veldnamen aan en haalt de waarden zelf uit de opgeslagen inzending.
 */
/** Op mobiel minimaal 44px hoge tikdoelen; desktop blijft ongewijzigd. */
export const TAP = 'max-md:min-h-[44px]';

export function AdoptComparison({ request, url, onDone, canAdopt = true, idScope = '' }) {
    const rows = request.comparison || [];
    const signature = rows.map((r) => `${r.key}:${r.crm}`).join('|');
    const [selected, setSelected] = useState(() => defaultSelection(rows));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        setSelected(defaultSelection(rows));
        setError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request.id, signature]);

    if (rows.length === 0) {
        return <p className="text-xs text-zinc-500">Geen klantgegevens op het formulier ingevuld.</p>;
    }

    const editable = canAdopt && request.can_adopt && url;
    const toggle = (key) => setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            const { data } = await axios.post(url, { fields: selected });
            onDone?.(data.message);
        } catch (e) {
            setError(requestErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            {/* Mobiel: per gegeven een blok onder elkaar */}
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 md:hidden" aria-label="Gegevens vergelijken">
                {rows.map((row) => {
                    const id = `overnemen-${idScope}m-${request.id}-${row.key}`;
                    const canPick = editable && !row.same;
                    const body = (
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="text-sm font-medium text-zinc-900">{row.label}</p>
                            <div className="text-sm">
                                <p className="text-xs text-zinc-500">Formulier</p>
                                <p className="break-words text-zinc-800">{row.form}</p>
                            </div>
                            <div className="text-sm">
                                <p className="text-xs text-zinc-500">Nu in CRM</p>
                                {row.same ? (
                                    <Badge tone="success">Gelijk</Badge>
                                ) : row.crm ? (
                                    <p className="break-words text-zinc-800">{row.crm}</p>
                                ) : (
                                    <p className="text-zinc-400">Leeg</p>
                                )}
                            </div>
                        </div>
                    );
                    return (
                        <li key={row.key} className={row.same ? 'bg-zinc-50/60' : 'bg-white'}>
                            {canPick ? (
                                <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-start gap-3 p-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center -m-2">
                                        <input id={id} type="checkbox" className="checkbox h-5 w-5" checked={selected.includes(row.key)} onChange={() => toggle(row.key)} disabled={busy} />
                                    </span>
                                    {body}
                                </label>
                            ) : (
                                <div className="flex items-start gap-3 p-3">{body}</div>
                            )}
                        </li>
                    );
                })}
            </ul>
            <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 md:block">
                <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-500">
                        <tr>
                            {editable && <th className="w-8 px-3 py-2"><span className="sr-only">Overnemen</span></th>}
                            <th className="px-3 py-2 font-medium">Gegeven</th>
                            <th className="px-3 py-2 font-medium">Formulier</th>
                            <th className="px-3 py-2 font-medium">Nu in CRM</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {rows.map((row) => {
                            const id = `overnemen-${idScope}${request.id}-${row.key}`;
                            return (
                                <tr key={row.key} className={row.same ? 'text-zinc-500' : 'text-zinc-800'}>
                                    {editable && (
                                        <td className="px-3 py-2 align-top">
                                            {row.same ? null : (
                                                <input id={id} type="checkbox" className="checkbox" checked={selected.includes(row.key)} onChange={() => toggle(row.key)} disabled={busy} />
                                            )}
                                        </td>
                                    )}
                                    <td className="px-3 py-2 align-top font-medium">
                                        <label htmlFor={row.same || !editable ? undefined : id}>{row.label}</label>
                                    </td>
                                    <td className="break-words px-3 py-2 align-top">{row.form}</td>
                                    <td className="break-words px-3 py-2 align-top">
                                        {row.same ? (
                                            <Badge tone="success">Gelijk</Badge>
                                        ) : row.crm ? (
                                            row.crm
                                        ) : (
                                            <span className="text-zinc-400">Leeg</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {request.iban_masked && <p className="text-xs text-zinc-500">IBAN {request.iban_masked} is automatisch in de actieve machtiging gezet en wordt gebruikt voor de incasso.</p>}
            {error && <Notice tone="danger">{error}</Notice>}
            {editable && rows.some((r) => !r.same) && (
                <div className="flex justify-end">
                    <Button size="sm" icon="check" className={cx(TAP, 'max-md:w-full')} onClick={submit} loading={busy} disabled={busy || selected.length === 0}>
                        Geselecteerde gegevens overnemen
                    </Button>
                </div>
            )}
        </div>
    );
}

/** Lijst met machtigingsverzoeken op de klantpagina (incasso-sectie). */
export function MandateRequestsCard({ requests = [], config, urls, onSend, onResend }) {
    const confirm = useConfirm();
    const [busyId, setBusyId] = useState(null);
    const [message, setMessage] = useState(null);
    const [openId, setOpenId] = useState(null);

    if (!config?.available) return null;

    const adopted = (text) => {
        setMessage({ tone: 'success', text });
        setOpenId(null);
        router.reload({ preserveScroll: true });
    };

    const act = async (request, kind) => {
        const texts = {
            revoke: { title: 'Verzoek intrekken?', message: `De link met kenmerk ${request.kenmerk} werkt daarna niet meer. Bestaande mandaten blijven ongewijzigd.`, confirmText: 'Intrekken', tone: 'danger' },
            process: { title: 'Machtiging verwerken?', message: 'Er wordt een actief mandaat aangemaakt. Een eerder actief mandaat wordt ingetrokken (niet verwijderd).', confirmText: 'Verwerken' },
        }[kind];
        if (!(await confirm({ ...texts, cancelText: 'Annuleren' }))) return;
        setBusyId(request.id);
        setMessage(null);
        try {
            const { data } = await axios.post(urls[kind].replace('__ID__', request.id));
            setMessage({ tone: 'success', text: data.message });
            reloadMandateProps();
        } catch (e) {
            setMessage({ tone: 'danger', text: requestErrorMessage(e) });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section id="sectie-machtigingsverzoeken" className="scroll-mt-48">
            <Card padded={false}>
                <div className="px-5 pt-5 sm:px-6 sm:pt-6">
                    <CardHeader
                        icon="mail"
                        title="Machtiging via kivii.nl"
                        description={`De klant vult het formulier op kivii.nl in; het mandaat wordt dan automatisch aangemaakt. Mails gaan alleen weg vanuit ${config.sender}.`}
                        actions={
                            config.can_send ? (
                                <Button size="sm" icon="mail" onClick={onSend}>
                                    Machtiging versturen
                                </Button>
                            ) : null
                        }
                    />
                    {message && <Notice tone={message.tone} className="mb-4">{message.text}</Notice>}
                </div>
                {requests.length === 0 ? (
                    <div className="px-5 pb-6 sm:px-6">
                        <EmptyState compact icon="mail" title="Nog geen machtigingsverzoeken" description="Verstuur de link naar het machtigingsformulier op kivii.nl." />
                    </div>
                ) : (
                    <ul className="divide-y divide-zinc-100 border-t border-zinc-100" aria-label="Machtigingsverzoeken">
                        {requests.map((r) => (
                            <li key={r.id} className="px-5 py-3.5 sm:px-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                    <div className="min-w-0 sm:w-1/3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center font-mono text-sm font-semibold text-zinc-900">
                                                {r.kenmerk}
                                                <CopyButton value={r.kenmerk} label="Kenmerk kopiëren" />
                                            </span>
                                            <RequestStatusBadge status={r.status} />
                                        </div>
                                        {r.mandaat_id && <p className="text-xs text-zinc-500">Mandaat {r.mandaat_id}</p>}
                                    </div>
                                    <div className="min-w-0 flex-1 text-xs text-zinc-500">
                                        <p>
                                            {r.sent_at ? `Verstuurd ${formatDateTime(r.sent_at)}${r.sent_via ? ` via ${VIA_LABELS[r.sent_via] || r.sent_via}` : ''}${r.recipient_email ? ` aan ${r.recipient_email}` : ''}` : 'Ontvangen zonder verzoek'}
                                        </p>
                                        {r.completed_at ? <p>Ingevuld {formatDateTime(r.completed_at)}{r.iban_masked ? ` · IBAN ${r.iban_masked}` : ''}</p> : r.expires_at ? <p>Geldig tot {formatDate(r.expires_at)}</p> : null}
                                        {r.error && <p className="text-rose-700">{r.error}</p>}
                                    </div>
                                    {config.can_send && (
                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                            {r.comparison?.length > 0 && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className={TAP}
                                                    icon="file-text"
                                                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                                                    aria-expanded={openId === r.id}
                                                    aria-controls={`gegevens-${r.id}`}
                                                >
                                                    Gegevens
                                                </Button>
                                            )}
                                            {r.can_process && (
                                                <Button size="sm" icon="check" className={TAP} onClick={() => act(r, 'process')} loading={busyId === r.id} disabled={busyId !== null}>
                                                    Verwerken
                                                </Button>
                                            )}
                                            {r.can_resend && (
                                                <Button variant="secondary" size="sm" icon="refresh" className={TAP} onClick={() => onResend(r)} disabled={busyId !== null}>
                                                    Opnieuw versturen
                                                </Button>
                                            )}
                                            {r.can_revoke && (
                                                <Button variant="ghost" size="sm" icon="x-circle" className={TAP} onClick={() => act(r, 'revoke')} disabled={busyId !== null}>
                                                    Intrekken
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {openId === r.id && (
                                    <div id={`gegevens-${r.id}`} className="mt-3">
                                        <AdoptComparison request={r} url={urls.adopt?.replace('__ID__', r.id)} onDone={adopted} canAdopt={config.can_send} />
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </section>
    );
}
