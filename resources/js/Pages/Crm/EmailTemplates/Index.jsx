import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useConfirm } from '../../../components/ConfirmProvider';
import { Avatar, Badge, Button, EmptyState, Field, IconTile, PageHeader, Spinner, StatusDot, Tooltip, cx, inputClasses } from '../../../components/ui';
import { Icon } from '../../../components/icons';

const EMPTY_BODY = '<p></p>';
const LEAVE_MESSAGE = 'Je hebt wijzigingen die nog niet zijn opgeslagen. Weet je zeker dat je deze pagina wilt verlaten?';

function ToolbarButton({ active, disabled, onClick, children, title }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={active === undefined ? undefined : Boolean(active)}
            onClick={onClick}
            disabled={disabled}
            className={cx(
                'tap-target-icon inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1',
                active ? 'bg-white text-indigo-700 shadow-card ring-1 ring-indigo-200' : 'text-zinc-700 hover:bg-zinc-200/70',
                disabled && 'cursor-not-allowed opacity-40'
            )}
        >
            {children}
        </button>
    );
}

// Vriendelijke naam en icoon per veld; onbekende velden tonen de technische naam.
const VARIABLE_META = {
    activatielink: { label: 'Activatielink', icon: 'link' },
    reset_link: { label: 'Wachtwoordlink', icon: 'key' },
    naam: { label: 'Naam', icon: 'user' },
    bedrijfsnaam: { label: 'Bedrijfsnaam', icon: 'building' },
    loginnaam: { label: 'Loginnaam', icon: 'mail' },
    wachtwoord: { label: 'Wachtwoord', icon: 'key' },
    weblink: { label: 'Weblink', icon: 'globe' },
    machtigingslink: { label: 'Machtigingslink', icon: 'link' },
    kenmerk: { label: 'Kenmerk machtiging', icon: 'tag' },
    geldig_tot: { label: 'Geldig tot', icon: 'calendar' },
};

function variableMeta(token) {
    return VARIABLE_META[token] ?? { label: token, icon: 'tag' };
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

/** Vult {{ veld }} in met voorbeeldwaarden (alleen voor het live voorbeeld in de browser). */
function fillSample(text, values, escape) {
    const map = values || {};
    return String(text || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => (Object.prototype.hasOwnProperty.call(map, key) ? (escape ? escapeHtml(map[key]) : String(map[key])) : match));
}

function ToolbarDivider() {
    return <span className="mx-1 h-5 w-px bg-zinc-200" aria-hidden="true" />;
}

export default function Index({ templates = [], variables, urls, previewCustomers = [] }) {
    const confirm = useConfirm();
    const [selectedId, setSelectedId] = useState(templates?.[0]?.id ?? 'new');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [flash, setFlash] = useState(null);
    const bodyTouchedRef = useRef(false);
    const lastFieldRef = useRef('body');
    const subjectInputRef = useRef(null);
    const [previewCompanyId, setPreviewCompanyId] = useState('');
    const [preview, setPreview] = useState(null);
    const [previewSource, setPreviewSource] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const [previewMode, setPreviewMode] = useState('sample'); // sample | customer
    const [search, setSearch] = useState('');
    const [savedAt, setSavedAt] = useState(null);
    const previewSeqRef = useRef(0);
    // body: genormaliseerde editor-HTML van de geladen versie (null = nog vastleggen).
    const baselineRef = useRef({ name: '', subject: '', is_active: 1, body: null, source: null });

    const selectedTemplate = useMemo(() => templates.find((item) => item.id === selectedId), [templates, selectedId]);
    const isNew = selectedId === 'new';
    const isProtected = Boolean(selectedTemplate?.is_system && selectedTemplate?.is_active);
    const updateUrl = urls.update_post || urls.update;

    const form = useForm({
        name: '',
        subject: '',
        body_html: '',
        is_active: 1,
    });

    // Bestaat de geselecteerde template niet meer (verwijderd of verborgen door uitzetten),
    // kies dan de eerste beschikbare in plaats van een leeg, losgekoppeld formulier.
    useEffect(() => {
        if (!isNew && !selectedTemplate) {
            setSelectedId(templates[0]?.id ?? 'new');
        }
    }, [isNew, selectedTemplate, templates]);

    useEffect(() => {
        bodyTouchedRef.current = false;
        form.clearErrors();
        if (selectedTemplate) {
            baselineRef.current = {
                name: selectedTemplate.name || '',
                subject: selectedTemplate.subject || '',
                is_active: selectedTemplate.is_active ? 1 : 0,
                body: null,
                source: selectedTemplate.body_html || '',
            };
            form.setData({
                name: selectedTemplate.name || '',
                subject: selectedTemplate.subject || '',
                body_html: selectedTemplate.body_html || '',
                is_active: selectedTemplate.is_active ? 1 : 0,
            });
        } else if (isNew) {
            baselineRef.current = { name: '', subject: '', is_active: 1, body: null, source: EMPTY_BODY };
            form.setData({
                name: '',
                subject: '',
                body_html: EMPTY_BODY,
                is_active: 1,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTemplate?.id, isNew]);

    const editor = useEditor({
        // Zorgt dat de actieve status van de toolbarknoppen meebeweegt met de cursor.
        shouldRerenderOnTransaction: true,
        extensions: [
            // StarterKit v3 bevat zelf al Link; uitzetten voorkomt een dubbele extensie (eigen Link hieronder).
            StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
            LinkExtension.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
            Placeholder.configure({ placeholder: 'Schrijf hier de inhoud van de e-mail...' }),
        ],
        content: form.data.body_html || EMPTY_BODY,
        editorProps: {
            attributes: {
                role: 'textbox',
                'aria-multiline': 'true',
                'aria-labelledby': 'email-template-body-label',
            },
        },
        onFocus: () => {
            lastFieldRef.current = 'body';
        },
        onUpdate: ({ editor: ed }) => {
            const html = ed.getHTML();
            // Alleen 'gewijzigd' als de inhoud echt afwijkt (typen en weer ongedaan maken telt niet).
            const base = baselineRef.current.body;
            bodyTouchedRef.current = base === null ? true : html !== base;
            form.setData('body_html', html);
        },
    });

    useEffect(() => {
        if (!editor) return;
        const nextHtml = form.data.body_html?.trim() ? form.data.body_html : EMPTY_BODY;
        if (editor.getHTML() !== nextHtml) {
            editor.commands.setContent(nextHtml, { emitUpdate: false });
        }
        // Pas vastleggen zodra de editor de geladen template toont (niet de vorige/lege staat).
        const source = baselineRef.current.source;
        const sourceHtml = String(source ?? '').trim() ? source : EMPTY_BODY;
        if (baselineRef.current.body === null && nextHtml === sourceHtml) {
            baselineRef.current.body = editor.getHTML();
        }
    }, [editor, form.data.body_html]);

    const isDirty = () => {
        const base = baselineRef.current;
        return (
            bodyTouchedRef.current ||
            form.data.name !== base.name ||
            form.data.subject !== base.subject ||
            Number(form.data.is_active) !== Number(base.is_active)
        );
    };
    const dirty = isDirty();
    const dirtyRef = useRef(false);
    dirtyRef.current = dirty;

    // Waarschuw bij verlaten van de pagina (Inertia-navigatie, herladen of tab sluiten).
    useEffect(() => {
        const onBeforeUnload = (event) => {
            if (!dirtyRef.current) return undefined;
            event.preventDefault();
            event.returnValue = LEAVE_MESSAGE;
            return LEAVE_MESSAGE;
        };
        const offBefore = router.on('before', (event) => {
            const visit = event?.detail?.visit;
            if (!dirtyRef.current || !visit || String(visit.method).toLowerCase() !== 'get') return undefined;
            // eslint-disable-next-line no-alert
            if (!window.confirm(LEAVE_MESSAGE)) return false;
            return undefined;
        });
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            offBefore();
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, []);

    const selectTemplate = async (id) => {
        if (id === selectedId) return;
        if (isDirty()) {
            const ok = await confirm({
                title: 'Niet opgeslagen wijzigingen',
                message: 'Je hebt wijzigingen die nog niet zijn opgeslagen. Wil je deze verwerpen?',
                confirmText: 'Verwerpen',
                cancelText: 'Blijven',
                tone: 'danger',
            });
            if (!ok) return;
        }
        setFlash(null);
        setSavedAt(null);
        setSelectedId(id);
        revealEditor();
    };

    // Onder lg staat de editor onder de lijst: na kiezen (of Nieuwe template) de editor in beeld schuiven.
    const editorRef = useRef(null);
    const revealEditor = () => {
        if (typeof window === 'undefined') return;
        requestAnimationFrame(() => {
            const node = editorRef.current;
            if (!node) return;
            const belowLg = window.matchMedia('(max-width: 1023.98px)').matches;
            const belowFold = node.getBoundingClientRect().top > window.innerHeight * 0.75;
            if (!belowLg && !belowFold) return;
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            node.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        });
    };

    const submitTemplate = (method, url, options = {}) => {
        if (saving || deleting) return;
        const latestHtml = editor ? editor.getHTML() : form.data.body_html;
        const payload = {
            ...form.data,
            name: String(form.data.name || '').trim(),
            subject: String(form.data.subject || '').trim(),
            body_html: latestHtml,
        };
        const clientErrors = {};
        if (!payload.name) clientErrors.name = 'Naam is verplicht.';
        if (!payload.subject) clientErrors.subject = 'Onderwerp is verplicht.';
        form.clearErrors();
        setFlash(null);
        if (Object.keys(clientErrors).length > 0) {
            form.setError(clientErrors);
            setFlash({ tone: 'error', text: 'Controleer de gemarkeerde velden.' });
            return;
        }
        const requestOptions = {
            preserveScroll: true,
            preserveState: true,
            ...options,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: (page) => {
                bodyTouchedRef.current = false;
                baselineRef.current = {
                    name: payload.name,
                    subject: payload.subject,
                    is_active: payload.is_active ? 1 : 0,
                    body: latestHtml,
                    source: latestHtml,
                };
                form.setData((data) => ({ ...data, name: payload.name, subject: payload.subject }));
                setSavedAt(new Date());
                options.onSuccess?.(page);
            },
            onError: (errors) => {
                form.setError(errors || {});
                setFlash({ tone: 'error', text: 'Opslaan mislukt. Controleer de gemarkeerde velden.' });
            },
        };
        if (method === 'patch') {
            router.patch(url, payload, requestOptions);
        } else {
            router.post(url, payload, requestOptions);
        }
    };

    const saveTemplate = (event) => {
        event?.preventDefault?.();
        if (isNew) {
            const knownIds = new Set(templates.map((item) => item.id));
            submitTemplate('post', urls.store, {
                onSuccess: (page) => {
                    // Selecteer de zojuist aangemaakte template, zodat een tweede klik geen dubbele aanmaakt.
                    const created = (page?.props?.templates ?? []).find((item) => !knownIds.has(item.id));
                    if (created) setSelectedId(created.id);
                },
            });
            return;
        }
        if (selectedTemplate) {
            const targetUrl = (updateUrl || '').replace('__TEMPLATE__', selectedTemplate.id);
            submitTemplate(urls.update_post ? 'post' : 'patch', targetUrl);
        }
    };

    // Ctrl/Cmd + S slaat op (ook vanuit de editor).
    const saveRef = useRef(null);
    saveRef.current = saveTemplate;
    useEffect(() => {
        const onKey = (event) => {
            if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 's') {
                event.preventDefault();
                saveRef.current?.();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const deleteTemplate = async () => {
        if (deleting || saving || !selectedTemplate || isProtected) return;
        const ok = await confirm({
            title: 'Template verwijderen',
            message: `Weet je zeker dat je "${selectedTemplate.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`,
            confirmText: 'Verwijderen',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (!ok) return;
        setFlash(null);
        const deletedId = selectedTemplate.id;
        const options = {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => setDeleting(false),
            onSuccess: (page) => {
                bodyTouchedRef.current = false;
                const remaining = (page?.props?.templates ?? []).filter((item) => item.id !== deletedId);
                setSelectedId(remaining[0]?.id ?? 'new');
            },
            onError: () => setFlash({ tone: 'error', text: 'Verwijderen mislukt. Probeer opnieuw.' }),
        };
        if (urls.delete_post) {
            router.post(urls.delete_post.replace('__TEMPLATE__', deletedId), { is_active: form.data.is_active }, options);
            return;
        }
        router.delete(urls.delete.replace('__TEMPLATE__', deletedId), options);
    };

    const insertVariable = (token) => {
        const text = `{{ ${token} }}`;
        if (lastFieldRef.current === 'subject' && subjectInputRef.current) {
            const input = subjectInputRef.current;
            const value = form.data.subject || '';
            const start = input.selectionStart ?? value.length;
            const end = input.selectionEnd ?? value.length;
            const next = value.slice(0, start) + text + value.slice(end);
            form.setData('subject', next.slice(0, 255));
            requestAnimationFrame(() => {
                input.focus();
                const caret = Math.min(start + text.length, 255);
                input.setSelectionRange(caret, caret);
            });
            return;
        }
        editor?.chain().focus().insertContent(text).run();
    };

    const currentSource = `${form.data.subject || ''}\u0000${editor ? editor.getHTML() : form.data.body_html || ''}`;

    const loadPreview = async (companyId = previewCompanyId) => {
        if (!companyId || !urls.preview) return;
        const seq = ++previewSeqRef.current;
        const source = currentSource;
        setPreviewLoading(true);
        setPreviewError('');
        try {
            const response = await window.axios.post(urls.preview, {
                garage_company_id: Number(companyId),
                subject: form.data.subject || '',
                body_html: editor ? editor.getHTML() : form.data.body_html || '',
            });
            if (seq !== previewSeqRef.current) return;
            setPreview(response.data);
            setPreviewSource(source);
        } catch (error) {
            if (seq !== previewSeqRef.current) return;
            setPreview(null);
            const status = error?.response?.status;
            setPreviewError(
                status === 404
                    ? 'Deze klant bestaat niet meer. Kies een andere klant.'
                    : status === 419
                      ? 'Je sessie is verlopen. Vernieuw de pagina en probeer opnieuw.'
                      : 'Voorbeeld laden mislukt. Probeer opnieuw.'
            );
        } finally {
            if (seq === previewSeqRef.current) setPreviewLoading(false);
        }
    };

    useEffect(() => {
        previewSeqRef.current += 1;
        setPreview(null);
        setPreviewSource(null);
        setPreviewError('');
        setPreviewLoading(false);
        // Bij een andere template direct opnieuw renderen voor de gekozen klant.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    const previewOutdated = Boolean(preview && previewSource !== null && previewSource !== currentSource);
    const variableKeys = Object.keys(variables || {});

    const flashText = typeof flash === 'string' ? flash : flash?.text;
    const flashIsError = typeof flash === 'object' && flash?.tone === 'error';
    const busy = saving || deleting;

    const setLink = () => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href || '';
        // eslint-disable-next-line no-alert
        const raw = window.prompt('Link (URL). Laat leeg om de link te verwijderen.', previousUrl);
        if (raw === null) return;
        const url = raw.trim();
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        // Variabelen zoals {{ activatielink }} en gewone URLs toestaan; javascript: e.d. niet.
        if (/^\s*(javascript|data|vbscript):/i.test(url)) {
            setFlash({ tone: 'error', text: 'Deze link is niet toegestaan.' });
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const query = search.trim().toLowerCase();
    const visibleTemplates = query ? templates.filter((t) => `${t.name ?? ''} ${t.subject ?? ''}`.toLowerCase().includes(query)) : templates;

    // Live voorbeeld met voorbeeldgegevens: direct bij elke toetsaanslag, zonder serververzoek.
    const liveBody = editor ? editor.getHTML() : form.data.body_html || '';
    const liveSubject = fillSample(form.data.subject || '', variables, false);
    const liveHtml = fillSample(liveBody, variables, true);
    const showLive = previewMode === 'sample';
    const frameHtml = showLive ? liveHtml : preview?.html || '';

    let saveState;
    if (saving) saveState = { tone: 'neutral', icon: null, text: 'Opslaan...' };
    else if (dirty) saveState = { tone: 'warning', icon: 'alert-circle', text: 'Niet opgeslagen wijzigingen' };
    else if (isNew) saveState = { tone: 'neutral', icon: 'edit', text: 'Nieuw, nog niet opgeslagen' };
    else if (savedAt) saveState = { tone: 'success', icon: 'check-circle', text: `Opgeslagen om ${savedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` };
    else saveState = { tone: 'success', icon: 'check-circle', text: 'Alles is opgeslagen' };
    const saveStateClass = { warning: 'bg-amber-50 text-amber-900 ring-amber-200', success: 'bg-emerald-50 text-emerald-800 ring-emerald-200', neutral: 'bg-zinc-100 text-zinc-700 ring-zinc-200' }[saveState.tone];

    return (
        <div>
            <Head title="E-mail templates" />

            <PageHeader
                title="E-mail templates"
                description="Schrijf vaste e-mails en maak ze persoonlijk met velden zoals naam en activatielink."
                back={{ href: urls.back || '/dashboard', label: 'Terug' }}
                actions={
                    <Button icon="plus" onClick={() => selectTemplate('new')} disabled={busy || isNew}>
                        Nieuwe template
                    </Button>
                }
            />

            {flashText ? (
                <div
                    role={flashIsError ? 'alert' : 'status'}
                    className={cx('mb-6 flex items-start gap-3 rounded-2xl border bg-white p-3 pr-2 text-sm shadow-card', flashIsError ? 'border-rose-200' : 'border-emerald-200')}
                >
                    <IconTile icon={flashIsError ? 'alert-circle' : 'check-circle'} tone={flashIsError ? 'danger' : 'success'} size="sm" />
                    <div className="min-w-0 flex-1 pt-1.5 text-zinc-800">{flashText}</div>
                    <Button variant="ghost" size="xs" iconOnly icon="x" aria-label="Melding sluiten" onClick={() => setFlash(null)} />
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Linkerpaneel: lijst met zoeken */}
                <aside className="lg:col-span-4 xl:col-span-3" aria-label="Templates">
                    <div className="card overflow-hidden lg:sticky lg:top-6">
                        <div className="border-b border-zinc-100 p-3">
                            <label htmlFor="email-template-search" className="sr-only">
                                Templates zoeken
                            </label>
                            <div className="relative">
                                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input id="email-template-search" type="search" className={cx(inputClasses, 'pl-9')} placeholder="Zoek op naam of onderwerp" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        </div>
                        {templates.length === 0 && !isNew ? (
                            <EmptyState
                                bare
                                compact
                                illustration="inbox"
                                title="Nog geen templates"
                                description="Maak je eerste template, bijvoorbeeld een welkomstmail."
                                action={
                                    <Button size="sm" icon="plus" onClick={() => selectTemplate('new')}>
                                        Nieuwe template
                                    </Button>
                                }
                            />
                        ) : (
                            <ul className="max-h-dvh-60 space-y-1 overflow-y-auto p-2 lg:max-h-[calc(100vh-14rem)]">
                                {isNew ? (
                                    <li>
                                        <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-2.5 py-2.5 ring-1 ring-inset ring-indigo-200" aria-current="true">
                                            <IconTile icon="edit" tone="brand" size="sm" />
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-indigo-900">{form.data.name.trim() || 'Nieuwe template'}</div>
                                                <div className="truncate text-xs text-indigo-800">{form.data.subject.trim() || 'Nog geen onderwerp'}</div>
                                            </div>
                                        </div>
                                    </li>
                                ) : null}
                                {visibleTemplates.map((template) => {
                                    const active = selectedId === template.id;
                                    return (
                                        <li key={template.id}>
                                            <button
                                                type="button"
                                                onClick={() => selectTemplate(template.id)}
                                                aria-current={active ? 'true' : undefined}
                                                disabled={busy && !active}
                                                className={cx(
                                                    'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-60',
                                                    active ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-zinc-50',
                                                )}
                                            >
                                                <IconTile icon="mail" tone={!template.is_active ? 'neutral' : active ? 'brand' : 'neutral'} size="sm" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center gap-1.5">
                                                        <span className={cx('truncate text-sm font-semibold', active ? 'text-indigo-900' : 'text-zinc-900')}>{template.name || 'Template zonder naam'}</span>
                                                        {active && dirty ? <StatusDot tone="warning" label="Niet opgeslagen" /> : null}
                                                    </span>
                                                    <span className={cx('mt-0.5 block truncate text-xs', active ? 'text-indigo-800' : 'text-zinc-500')}>{template.subject || 'Geen onderwerp'}</span>
                                                    {template.is_system || !template.is_active ? (
                                                        <span className="mt-1.5 flex flex-wrap gap-1">
                                                            {template.is_system ? (
                                                                <Badge tone="brand" icon="shield">
                                                                    Standaard
                                                                </Badge>
                                                            ) : null}
                                                            {!template.is_active ? <Badge tone="warning">Inactief</Badge> : null}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                                {query && visibleTemplates.length === 0 ? (
                                    <li className="px-3 py-6 text-center text-sm text-zinc-500">
                                        Geen templates gevonden voor "{search.trim()}".
                                        <button type="button" className="link mt-1 block w-full text-center text-sm" onClick={() => setSearch('')}>
                                            Zoekopdracht wissen
                                        </button>
                                    </li>
                                ) : null}
                            </ul>
                        )}
                    </div>
                </aside>

                {/* Rechterpaneel: editor en live voorbeeld */}
                <div className="min-w-0 space-y-6 lg:col-span-8 xl:col-span-9">
                    <form ref={editorRef} onSubmit={saveTemplate} noValidate className="card">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 sm:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <IconTile icon={isNew ? 'edit' : 'mail'} tone="brand" />
                                <div className="min-w-0">
                                    <h2 className="section-heading truncate">{isNew ? 'Nieuwe template' : selectedTemplate?.name || 'Template'}</h2>
                                    <span className={cx('mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', saveStateClass)} aria-live="polite">
                                        {saving ? <Spinner className="h-3 w-3" /> : <Icon name={saveState.icon} className="h-3.5 w-3.5" />}
                                        {saveState.text}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {!isNew && selectedTemplate ? (
                                    <Tooltip content={isProtected ? 'Standaard templates kun je niet verwijderen zolang ze actief zijn.' : 'Template verwijderen'}>
                                        <Button variant="danger-ghost" size="sm" icon="trash" onClick={deleteTemplate} disabled={isProtected || saving} loading={deleting}>
                                            {deleting ? 'Verwijderen...' : 'Verwijderen'}
                                        </Button>
                                    </Tooltip>
                                ) : null}
                                <Button type="submit" icon="check" loading={saving} disabled={deleting || (!dirty && !isNew)} title="Opslaan (Ctrl + S)">
                                    {saving ? 'Opslaan...' : isNew ? 'Template toevoegen' : 'Opslaan'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-5 p-5 sm:p-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field id="email-template-name" label="Naam" hint="Alleen voor intern gebruik." required error={form.errors.name}>
                                    <input
                                        id="email-template-name"
                                        maxLength={120}
                                        required
                                        aria-invalid={form.errors.name ? 'true' : undefined}
                                        className={inputClasses}
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                    />
                                </Field>
                                <Field id="email-template-subject" label="Onderwerp" hint="Velden werken hier ook." required error={form.errors.subject}>
                                    <input
                                        id="email-template-subject"
                                        ref={subjectInputRef}
                                        onFocus={() => {
                                            lastFieldRef.current = 'subject';
                                        }}
                                        maxLength={255}
                                        required
                                        aria-invalid={form.errors.subject ? 'true' : undefined}
                                        className={inputClasses}
                                        value={form.data.subject}
                                        onChange={(e) => form.setData('subject', e.target.value)}
                                    />
                                </Field>
                            </div>

                            <div>
                                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                    <span id="email-template-fields-label" className="label">
                                        Velden invoegen
                                    </span>
                                    <span className="text-xs text-zinc-500">Klik om in te voegen op de cursor, in het onderwerp of de inhoud.</span>
                                </div>
                                {variableKeys.length === 0 ? (
                                    <p className="text-sm text-zinc-500">Geen velden beschikbaar.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="email-template-fields-label">
                                        {variableKeys.map((token, index) => {
                                            const recommended = index === 0 && token === 'activatielink';
                                            const meta = variableMeta(token);
                                            return (
                                                <button
                                                    key={token}
                                                    type="button"
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => insertVariable(token)}
                                                    title={`{{ ${token} }} Voorbeeld: ${variables[token]}`}
                                                    aria-label={`Veld ${meta.label} invoegen`}
                                                    className={cx(
                                                        'tap-target inline-flex h-8 items-center gap-1.5 rounded-full pl-2 pr-3 text-xs font-medium ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                                                        recommended ? 'bg-indigo-50 text-indigo-900 ring-indigo-200 hover:bg-indigo-100' : 'bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50 hover:ring-zinc-300',
                                                    )}
                                                >
                                                    <Icon name={meta.icon} className={cx('h-3.5 w-3.5', recommended ? 'text-indigo-600' : 'text-zinc-400')} />
                                                    {meta.label}
                                                    {recommended ? <span className="rounded-full bg-indigo-600 px-1.5 text-2xs font-semibold text-white">Aanbevolen</span> : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <span id="email-template-body-label" className="label mb-1.5">
                                    Inhoud
                                </span>
                                <div className="overflow-hidden rounded-xl border border-zinc-300 shadow-sm transition-colors focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                                    <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50/80 px-2 py-1.5" role="toolbar" aria-label="Opmaak">
                                        <ToolbarButton title="Vet" active={editor?.isActive('bold')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()}>
                                            <span className="font-bold">B</span>
                                        </ToolbarButton>
                                        <ToolbarButton title="Cursief" active={editor?.isActive('italic')} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()}>
                                            <span className="font-serif italic">I</span>
                                        </ToolbarButton>
                                        <ToolbarDivider />
                                        <ToolbarButton title="Opsomming" active={editor?.isActive('bulletList')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                                            <Icon name="list" className="h-4 w-4" />
                                        </ToolbarButton>
                                        <ToolbarButton title="Genummerde lijst" active={editor?.isActive('orderedList')} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                                            <span className="tabular-nums">1.</span>
                                        </ToolbarButton>
                                        <ToolbarButton title="Link" active={editor?.isActive('link')} disabled={!editor} onClick={setLink}>
                                            <Icon name="link" className="h-4 w-4" />
                                        </ToolbarButton>
                                        <ToolbarDivider />
                                        <ToolbarButton title="Opmaak wissen" disabled={!editor} onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}>
                                            Wissen
                                        </ToolbarButton>
                                        <span className="ml-auto flex items-center gap-0.5">
                                            <ToolbarButton title="Ongedaan maken" disabled={!editor || !editor.can().undo()} onClick={() => editor?.chain().focus().undo().run()}>
                                                Ongedaan
                                            </ToolbarButton>
                                            <ToolbarButton title="Opnieuw" disabled={!editor || !editor.can().redo()} onClick={() => editor?.chain().focus().redo().run()}>
                                                Opnieuw
                                            </ToolbarButton>
                                        </span>
                                    </div>
                                    <EditorContent editor={editor} className="bg-white px-4 py-3 text-sm leading-6 text-zinc-900 [&_.tiptap]:min-h-[240px]" />
                                </div>
                                {form.errors.body_html ? (
                                    <p className="field-error" role="alert">
                                        {form.errors.body_html}
                                    </p>
                                ) : null}
                            </div>

                            <div className="rounded-xl bg-zinc-50 p-3.5">
                                <label htmlFor="email-template-active" className="flex items-start gap-3 text-sm">
                                    <input
                                        id="email-template-active"
                                        name="is_active"
                                        type="checkbox"
                                        className="checkbox mt-0.5"
                                        checked={!!form.data.is_active}
                                        onChange={(e) => form.setData('is_active', e.target.checked ? 1 : 0)}
                                    />
                                    <span>
                                        <span className="font-medium text-zinc-900">Actief</span>
                                        <span className="block text-xs text-zinc-500">Alleen actieve templates kun je kiezen bij het versturen.</span>
                                    </span>
                                </label>
                                {selectedTemplate?.is_system && !form.data.is_active ? <p className="mt-2 text-xs text-amber-800">Dit is een standaardtemplate. Na opslaan als inactief wordt deze uit de lijst verborgen.</p> : null}
                                {form.errors.is_active ? (
                                    <p className="field-error" role="alert">
                                        {form.errors.is_active}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </form>

                    <section className="card" aria-labelledby="email-template-preview-title">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 sm:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <IconTile icon="eye" tone="info" size="sm" />
                                <div className="min-w-0">
                                    <h2 id="email-template-preview-title" className="section-heading">
                                        Voorbeeld
                                    </h2>
                                    <p className="text-sm text-zinc-500">Er wordt niets verstuurd of opgeslagen.</p>
                                </div>
                            </div>
                            <div className="inline-flex rounded-xl bg-zinc-100 p-1" role="group" aria-label="Gegevens voor het voorbeeld">
                                {[
                                    ['sample', 'Voorbeeldgegevens', 'sparkles'],
                                    ['customer', 'Echte klant', 'building'],
                                ].map(([mode, label, icon]) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        aria-pressed={previewMode === mode}
                                        onClick={() => setPreviewMode(mode)}
                                        className={cx(
                                            'tap-target inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                                            previewMode === mode ? 'bg-white text-zinc-900 shadow-card ring-1 ring-black/5' : 'text-zinc-600 hover:text-zinc-900',
                                        )}
                                    >
                                        <Icon name={icon} className={cx('h-3.5 w-3.5', previewMode === mode ? 'text-indigo-600' : 'text-zinc-400')} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-5 sm:p-6">
                            {!showLive ? (
                                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                                    <Field id="email-template-preview-customer" label="Klant" className="sm:w-80">
                                        <select
                                            id="email-template-preview-customer"
                                            className={inputClasses}
                                            value={previewCompanyId}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setPreviewCompanyId(value);
                                                if (value) {
                                                    loadPreview(value);
                                                } else {
                                                    previewSeqRef.current += 1;
                                                    setPreview(null);
                                                    setPreviewError('');
                                                    setPreviewLoading(false);
                                                }
                                            }}
                                        >
                                            <option value="">Kies een klant</option>
                                            {previewCustomers.map((customer) => (
                                                <option key={customer.id} value={customer.id}>
                                                    {customer.label}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Button variant="secondary" icon="refresh" disabled={!previewCompanyId} loading={previewLoading} onClick={() => loadPreview()}>
                                        {previewLoading ? 'Laden...' : 'Voorbeeld vernieuwen'}
                                    </Button>
                                </div>
                            ) : null}

                            {!showLive && previewError ? (
                                <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                                    <Icon name="alert-circle" className="mt-0.5 h-4 w-4 shrink-0" />
                                    {previewError}
                                </div>
                            ) : null}

                            {showLive || preview ? (
                                <div className={cx('overflow-hidden rounded-2xl border border-hairline bg-white shadow-card', !showLive && previewLoading && 'opacity-60')}>
                                    {!showLive && previewOutdated ? (
                                        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900" role="status">
                                            <span>De inhoud is gewijzigd sinds dit voorbeeld.</span>
                                            <button type="button" className="shrink-0 rounded font-semibold underline underline-offset-2 focus-ring" onClick={() => loadPreview()}>
                                                Vernieuwen
                                            </button>
                                        </div>
                                    ) : null}
                                    <div className="flex items-start gap-3 border-b border-zinc-100 px-4 py-3.5">
                                        <Avatar name="Kivii" size="md" />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-base font-semibold text-zinc-900">{(showLive ? liveSubject : preview?.subject) || 'Geen onderwerp'}</div>
                                            <dl className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
                                                <div className="flex gap-1">
                                                    <dt>Van:</dt>
                                                    <dd className="font-medium text-zinc-700">Kivii</dd>
                                                </div>
                                                <div className="flex min-w-0 gap-1">
                                                    <dt>Aan:</dt>
                                                    <dd className="min-w-0 truncate font-medium text-zinc-700">{showLive ? variables?.naam || 'Voorbeeldklant' : preview?.to || '-'}</dd>
                                                </div>
                                            </dl>
                                        </div>
                                        {showLive ? (
                                            <Badge tone="info" icon="sparkles">
                                                Live
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <iframe
                                        title="Voorbeeld van de e-mail"
                                        sandbox=""
                                        className="h-80 w-full bg-white"
                                        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#18181b;margin:16px 20px;}a{color:#667319;}</style></head><body>${frameHtml}</body></html>`}
                                    />
                                </div>
                            ) : !previewError ? (
                                <EmptyState
                                    compact
                                    illustration="search"
                                    title={previewLoading ? 'Voorbeeld laden...' : 'Kies een klant'}
                                    description={previewLoading ? null : previewCustomers.length === 0 ? 'Er zijn nog geen klanten om een voorbeeld mee te tonen.' : 'Zie hoe de e-mail eruitziet met de gegevens van een echte klant.'}
                                />
                            ) : null}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
