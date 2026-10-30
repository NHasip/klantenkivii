import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useConfirm } from '../../../components/ConfirmProvider';
import { Badge, Button, Card, CardHeader, EmptyState, Field, PageHeader, buttonClasses, cx, inputClasses } from '../../../components/ui';

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
                'h-8 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1',
                active ? 'bg-indigo-600 text-white' : 'text-zinc-700 hover:bg-zinc-200/70',
                disabled && 'cursor-not-allowed opacity-40'
            )}
        >
            {children}
        </button>
    );
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
            StarterKit.configure({ heading: { levels: [2, 3] } }),
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
        setSelectedId(id);
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

    return (
        <div>
            <Head title="E-mail templates" />

            <PageHeader
                title="E-mail templates"
                description="Beheer je e-mail templates en gebruik variabelen voor persoonlijke velden."
                actions={
                    <Link href={urls.back || '/dashboard'} className={buttonClasses({ variant: 'secondary' })}>
                        Terug
                    </Link>
                }
            />

            {flashText ? (
                <div
                    role={flashIsError ? 'alert' : 'status'}
                    className={cx(
                        'mb-6 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm',
                        flashIsError ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    )}
                >
                    <div>{flashText}</div>
                    <button
                        type="button"
                        className="shrink-0 rounded text-xs font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
                        onClick={() => setFlash(null)}
                    >
                        Sluiten
                    </button>
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-4">
                    <Card>
                        <CardHeader
                            title="Templates"
                            className="mb-3"
                            actions={
                                <Button variant="secondary" size="sm" onClick={() => selectTemplate('new')} aria-pressed={isNew} disabled={busy}>
                                    Nieuwe template
                                </Button>
                            }
                        />
                        {templates.length === 0 ? (
                            <EmptyState title="Nog geen templates" description="Maak je eerste template aan met de knop hierboven." className="py-6" />
                        ) : (
                            <ul className="space-y-1.5">
                                {templates.map((template) => {
                                    const active = selectedId === template.id;
                                    return (
                                        <li key={template.id}>
                                            <button
                                                type="button"
                                                onClick={() => selectTemplate(template.id)}
                                                aria-current={active ? 'true' : undefined}
                                                disabled={busy && !active}
                                                className={cx(
                                                    'w-full rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 disabled:opacity-60',
                                                    active ? 'border-indigo-300 bg-indigo-50' : 'border-transparent hover:border-zinc-200 hover:bg-zinc-50'
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={cx('truncate text-sm font-semibold', active ? 'text-indigo-900' : 'text-zinc-900')}>
                                                        {template.name || 'Template zonder naam'}
                                                    </span>
                                                    <span className="flex shrink-0 items-center gap-1">
                                                        {template.is_system ? <Badge tone="brand">Standaard</Badge> : null}
                                                        {!template.is_active ? <Badge tone="warning">Inactief</Badge> : null}
                                                    </span>
                                                </div>
                                                <div className={cx('mt-0.5 truncate text-xs', active ? 'text-indigo-800' : 'text-zinc-500')}>
                                                    {template.subject || 'Geen onderwerp'}
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                                {isNew ? (
                                    <li>
                                        <div className="rounded-lg border border-dashed border-indigo-300 bg-indigo-50/60 px-3 py-2.5 text-sm font-semibold text-indigo-900" aria-current="true">
                                            {form.data.name.trim() || 'Nieuwe template'}
                                        </div>
                                    </li>
                                ) : null}
                            </ul>
                        )}
                    </Card>

                    <Card>
                        <CardHeader title="Beschikbare velden" description="Klik om in te voegen op de cursor, in het onderwerp of de inhoud." className="mb-3" />
                        {variableKeys.length === 0 ? (
                            <p className="text-sm text-zinc-500">Geen variabelen beschikbaar.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {variableKeys.map((token, index) => {
                                    const recommended = index === 0 && token === 'activatielink';
                                    return (
                                        <button
                                            key={token}
                                            type="button"
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => insertVariable(token)}
                                            title={`Voorbeeld: ${variables[token]}`}
                                            aria-label={`Variabele ${token} invoegen`}
                                            className={cx(
                                                'flex min-h-[2rem] w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1 text-left font-mono text-xs text-zinc-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1',
                                                recommended ? 'border-indigo-200 bg-indigo-50/60' : 'border-zinc-200 bg-zinc-50'
                                            )}
                                        >
                                            <span className="truncate">{`{{ ${token} }}`}</span>
                                            {recommended ? <Badge tone="brand" className="font-sans">Aanbevolen</Badge> : null}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-6 lg:col-span-8">
                    <form onSubmit={saveTemplate} className="space-y-6" noValidate>
                        <Card>
                            <CardHeader
                                title={isNew ? 'Nieuwe template' : selectedTemplate?.name || 'Template'}
                                description={isNew ? 'Vul een naam en onderwerp in en schrijf de inhoud.' : null}
                                actions={dirty ? <Badge tone="warning">Niet opgeslagen</Badge> : null}
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field id="email-template-name" label="Naam" required error={form.errors.name}>
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
                                <Field id="email-template-subject" label="Onderwerp" required error={form.errors.subject}>
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
                            <div className="mt-4">
                                <label htmlFor="email-template-active" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
                                    <input
                                        id="email-template-active"
                                        name="is_active"
                                        type="checkbox"
                                        className="rounded border-zinc-300 text-indigo-600 focus-visible:ring-indigo-600"
                                        checked={!!form.data.is_active}
                                        onChange={(e) => form.setData('is_active', e.target.checked ? 1 : 0)}
                                    />
                                    Actief
                                </label>
                                {selectedTemplate?.is_system && !form.data.is_active ? (
                                    <p className="mt-1 text-xs text-amber-800">
                                        Dit is een standaardtemplate. Na opslaan als inactief wordt deze uit de lijst verborgen.
                                    </p>
                                ) : null}
                                {form.errors.is_active ? <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{form.errors.is_active}</p> : null}
                            </div>
                        </Card>

                        <Card>
                            <h2 id="email-template-body-label" className="mb-3 text-base font-semibold text-zinc-900">
                                Inhoud
                            </h2>
                            <div className="overflow-hidden rounded-lg border border-zinc-300 shadow-sm focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                                <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5" role="toolbar" aria-label="Opmaak">
                                    <ToolbarButton title="Vet" active={editor?.isActive('bold')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()}>
                                        Vet
                                    </ToolbarButton>
                                    <ToolbarButton title="Cursief" active={editor?.isActive('italic')} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()}>
                                        Cursief
                                    </ToolbarButton>
                                    <ToolbarDivider />
                                    <ToolbarButton title="Opsomming" active={editor?.isActive('bulletList')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                                        Lijst
                                    </ToolbarButton>
                                    <ToolbarButton title="Genummerde lijst" active={editor?.isActive('orderedList')} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                                        Nummering
                                    </ToolbarButton>
                                    <ToolbarButton title="Link" active={editor?.isActive('link')} disabled={!editor} onClick={setLink}>
                                        Link
                                    </ToolbarButton>
                                    <ToolbarDivider />
                                    <ToolbarButton title="Opmaak wissen" disabled={!editor} onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}>
                                        Wissen
                                    </ToolbarButton>
                                    <ToolbarButton title="Ongedaan maken" disabled={!editor || !editor.can().undo()} onClick={() => editor?.chain().focus().undo().run()}>
                                        Ongedaan
                                    </ToolbarButton>
                                    <ToolbarButton title="Opnieuw" disabled={!editor || !editor.can().redo()} onClick={() => editor?.chain().focus().redo().run()}>
                                        Opnieuw
                                    </ToolbarButton>
                                </div>
                                <EditorContent editor={editor} className="bg-white px-3 py-2.5 text-sm text-zinc-900 [&_.tiptap]:min-h-[220px]" />
                            </div>
                            {form.errors.body_html ? <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{form.errors.body_html}</p> : null}
                        </Card>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-3">
                                {!isNew && selectedTemplate ? (
                                    <Button variant="danger-ghost" onClick={deleteTemplate} disabled={isProtected || saving} loading={deleting}>
                                        {deleting ? 'Verwijderen...' : 'Verwijderen'}
                                    </Button>
                                ) : null}
                                {isProtected ? <p className="text-xs text-zinc-500">Standaard templates kun je niet verwijderen zolang ze actief zijn.</p> : null}
                            </div>
                            <Button type="submit" loading={saving} disabled={deleting}>
                                {saving ? 'Opslaan...' : isNew ? 'Template toevoegen' : 'Opslaan'}
                            </Button>
                        </div>
                    </form>

                    <Card aria-labelledby="email-template-preview-title">
                        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                            <div className="min-w-0">
                                <h2 id="email-template-preview-title" className="text-base font-semibold text-zinc-900">
                                    Voorbeeld met klantgegevens
                                </h2>
                                <p className="mt-0.5 text-sm text-zinc-500">
                                    Gebruikt de huidige inhoud, ook als die nog niet is opgeslagen. Er wordt niets verstuurd of opgeslagen.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
                            <Button variant="secondary" disabled={!previewCompanyId} loading={previewLoading} onClick={() => loadPreview()}>
                                {previewLoading ? 'Laden...' : 'Voorbeeld vernieuwen'}
                            </Button>
                        </div>

                        {previewError ? (
                            <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                                {previewError}
                            </div>
                        ) : null}

                        {preview ? (
                            <div className={cx('mt-4 overflow-hidden rounded-lg border border-zinc-200', previewLoading && 'opacity-60')}>
                                {previewOutdated ? (
                                    <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900" role="status">
                                        De inhoud is gewijzigd. Klik op Voorbeeld vernieuwen voor de laatste versie.
                                    </div>
                                ) : null}
                                <dl className="space-y-1 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                                    <div className="flex gap-1">
                                        <dt className="font-semibold text-zinc-700">Aan:</dt>
                                        <dd className="min-w-0 truncate">{preview.to || '-'}</dd>
                                    </div>
                                    <div className="flex gap-1">
                                        <dt className="font-semibold text-zinc-700">Onderwerp:</dt>
                                        <dd className="min-w-0">{preview.subject || '-'}</dd>
                                    </div>
                                </dl>
                                <iframe
                                    title="Voorbeeld van de e-mail"
                                    sandbox=""
                                    className="h-96 w-full bg-white"
                                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#18181b;margin:16px;}a{color:#4f46e5;}</style></head><body>${preview.html || ''}</body></html>`}
                                />
                            </div>
                        ) : !previewError ? (
                            <EmptyState
                                className="mt-4 py-8"
                                title={previewLoading ? 'Voorbeeld laden...' : 'Nog geen voorbeeld'}
                                description={previewLoading ? null : previewCustomers.length === 0 ? 'Er zijn nog geen klanten om een voorbeeld mee te tonen.' : 'Kies een klant om te zien hoe de e-mail eruitziet.'}
                            />
                        ) : null}
                    </Card>
                </div>
            </div>
        </div>
    );
}
