import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useConfirm } from '../../../components/ConfirmProvider';

function cx(...parts) {
    return parts.filter(Boolean).join(' ');
}

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
                'rounded-md px-2 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1',
                active ? 'bg-indigo-600 text-white' : 'text-zinc-700 hover:bg-zinc-100',
                disabled && 'cursor-not-allowed opacity-40'
            )}
        >
            {children}
        </button>
    );
}

export default function Index({ templates, variables, urls, previewCustomers = [] }) {
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
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const baselineRef = useRef({ name: '', subject: '', is_active: 1 });

    const selectedTemplate = useMemo(
        () => templates.find((item) => item.id === selectedId),
        [templates, selectedId]
    );
    const isNew = selectedId === 'new';
    const canDelete =
        !isNew &&
        selectedTemplate &&
        (!selectedTemplate.is_system || !selectedTemplate.is_active);
    const updateUrl = urls.update_post || urls.update;

    const form = useForm({
        name: '',
        subject: '',
        body_html: '',
        is_active: 1,
    });

    useEffect(() => {
        bodyTouchedRef.current = false;
        form.clearErrors();
        if (selectedTemplate) {
            baselineRef.current = {
                name: selectedTemplate.name || '',
                subject: selectedTemplate.subject || '',
                is_active: selectedTemplate.is_active ? 1 : 0,
            };
            form.setData({
                name: selectedTemplate.name || '',
                subject: selectedTemplate.subject || '',
                body_html: selectedTemplate.body_html || '',
                is_active: selectedTemplate.is_active ? 1 : 0,
            });
        } else if (isNew) {
            baselineRef.current = { name: '', subject: '', is_active: 1 };
            form.setData({
                name: '',
                subject: '',
                body_html: '<p></p>',
                is_active: 1,
            });
        }
    }, [selectedTemplate?.id, isNew]);

    const editor = useEditor({
        // Zorgt dat de actieve status van de toolbarknoppen meebeweegt met de cursor.
        shouldRerenderOnTransaction: true,
        extensions: [
            StarterKit.configure({ heading: { levels: [2, 3] } }),
            LinkExtension.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
            Placeholder.configure({ placeholder: 'Schrijf je e-mail template...' }),
        ],
        content: form.data.body_html || '<p></p>',
        editorProps: {
            attributes: {
                role: 'textbox',
                'aria-multiline': 'true',
                'aria-label': 'Template inhoud',
            },
        },
        onFocus: () => {
            lastFieldRef.current = 'body';
        },
        onUpdate: ({ editor: ed }) => {
            bodyTouchedRef.current = true;
            form.setData('body_html', ed.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) return;
        const nextHtml = form.data.body_html?.trim() ? form.data.body_html : '<p></p>';
        if (editor.getHTML() !== nextHtml) {
            editor.commands.setContent(nextHtml, { emitUpdate: false });
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
        if (saving) return;
        const latestHtml = editor ? editor.getHTML() : form.data.body_html;
        const payload = {
            ...form.data,
            body_html: latestHtml,
        };
        form.clearErrors();
        setFlash(null);
        const requestOptions = {
            preserveScroll: true,
            preserveState: true,
            ...options,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: (page) => {
                bodyTouchedRef.current = false;
                baselineRef.current = {
                    name: payload.name || '',
                    subject: payload.subject || '',
                    is_active: payload.is_active ? 1 : 0,
                };
                options.onSuccess?.(page);
            },
            onError: (errors) => {
                form.setError(errors || {});
                setFlash({ tone: 'error', text: 'Controleer de gemarkeerde velden.' });
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
        if (deleting || !selectedTemplate || (selectedTemplate.is_system && selectedTemplate.is_active)) return;
        const ok = await confirm({
            title: 'Template verwijderen',
            message: `Weet je zeker dat je "${selectedTemplate.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`,
            confirmText: 'Verwijderen',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (!ok) return;
        setFlash(null);
        const options = {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => setDeleting(false),
            onSuccess: (page) => {
                bodyTouchedRef.current = false;
                setSelectedId('new');
            },
            onError: () => setFlash({ tone: 'error', text: 'Verwijderen mislukt. Probeer opnieuw.' }),
        };
        if (urls.delete_post) {
            router.post(urls.delete_post.replace('__TEMPLATE__', selectedTemplate.id), { is_active: form.data.is_active }, options);
            return;
        }
        router.delete(urls.delete.replace('__TEMPLATE__', selectedTemplate.id), options);
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

    const loadPreview = async (companyId = previewCompanyId) => {
        if (!companyId || !urls.preview) return;
        setPreviewLoading(true);
        setPreviewError('');
        try {
            const response = await window.axios.post(urls.preview, {
                garage_company_id: Number(companyId),
                subject: form.data.subject || '',
                body_html: editor ? editor.getHTML() : form.data.body_html || '',
            });
            setPreview(response.data);
        } catch (error) {
            setPreview(null);
            setPreviewError('Voorbeeld laden mislukt. Probeer opnieuw.');
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        setPreview(null);
    }, [selectedId]);

    const variableKeys = Object.keys(variables || {});

    const flashText = typeof flash === 'string' ? flash : flash?.text;
    const flashIsError = typeof flash === 'object' && flash?.tone === 'error';

    return (
        <div className="space-y-6">
            <Head title="E-mail templates" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900">E-mail templates</h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        Beheer je e-mail templates en gebruik variabelen voor persoonlijke velden.
                    </p>
                </div>
                <Link
                    href={urls.back || '/dashboard'}
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
                >
                    Terug
                </Link>
            </div>

            {flashText ? (
                <div
                    role={flashIsError ? 'alert' : 'status'}
                    className={cx(
                        'flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm',
                        flashIsError ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    )}
                >
                    <div>{flashText}</div>
                    <button type="button" className="rounded text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1" onClick={() => setFlash(null)}>
                        Sluiten
                    </button>
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="space-y-3 lg:col-span-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">Templates</div>
                            <button
                                type="button"
                                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
                                onClick={() => selectTemplate('new')}
                                aria-pressed={isNew}
                                aria-label="Nieuwe template"
                            >
                                Nieuw
                            </button>
                        </div>
                        <div className="mt-3 space-y-2">
                            {templates.length === 0 && (
                                <div className="text-xs text-zinc-500">Nog geen templates.</div>
                            )}
                            {templates.map((template) => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => selectTemplate(template.id)}
                                    aria-current={selectedId === template.id ? 'true' : undefined}
                                    aria-label={`${template.name || 'Template zonder naam'} bewerken${template.subject ? `, onderwerp: ${template.subject}` : ''}`}
                                    className={cx(
                                        'w-full rounded-lg border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1',
                                        selectedId === template.id
                                            ? 'border-indigo-600 bg-indigo-600 text-white'
                                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                                    )}
                                >
                                    <div className="truncate text-sm font-semibold">{template.name}</div>
                                    <div className={cx('mt-1 text-xs', selectedId === template.id ? 'text-indigo-50' : 'text-zinc-500')}>
                                        {template.subject || 'Geen onderwerp'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="text-xs font-semibold text-zinc-500">Beschikbare velden</div>
                        <p className="mt-1 text-xs text-zinc-500">Klik om in te voegen op de cursor (onderwerp of inhoud).</p>
                        <div className="mt-2 space-y-1 text-xs text-zinc-600">
                            {variableKeys.map((token, index) => (
                                <button
                                    key={token}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => insertVariable(token)}
                                    title={`Voorbeeld: ${variables[token]}`}
                                    className={cx(
                                        'flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1 text-left font-mono transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1',
                                        index === 0 && token === 'activatielink' ? 'border-indigo-200 bg-indigo-50/60' : 'border-zinc-200 bg-zinc-50'
                                    )}
                                >
                                    <span>{`{{ ${token} }}`}</span>
                                    {index === 0 && token === 'activatielink' ? (
                                        <span className="font-sans text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Aanbevolen</span>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 lg:col-span-8">
                    <form onSubmit={saveTemplate} className="space-y-4">
                        <div className="rounded-xl border border-zinc-200 bg-white p-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="email-template-name" className="text-xs font-semibold text-zinc-500">Naam</label>
                                    <input
                                        id="email-template-name"
                                        maxLength={120}
                                        aria-invalid={form.errors.name ? 'true' : undefined}
                                        className="mt-2 w-full rounded-md border-zinc-300 text-sm"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                    />
                                    {form.errors.name && <div className="mt-1 text-xs text-rose-600">{form.errors.name}</div>}
                                </div>
                                <div>
                                    <label htmlFor="email-template-subject" className="text-xs font-semibold text-zinc-500">Onderwerp</label>
                                    <input
                                        id="email-template-subject"
                                        ref={subjectInputRef}
                                        onFocus={() => {
                                            lastFieldRef.current = 'subject';
                                        }}
                                        maxLength={255}
                                        aria-invalid={form.errors.subject ? 'true' : undefined}
                                        className="mt-2 w-full rounded-md border-zinc-300 text-sm"
                                        value={form.data.subject}
                                        onChange={(e) => form.setData('subject', e.target.value)}
                                    />
                                    {form.errors.subject && <div className="mt-1 text-xs text-rose-600">{form.errors.subject}</div>}
                                </div>
                            </div>
                            <label htmlFor="email-template-active" className="mt-4 flex items-center gap-2 text-xs font-semibold text-zinc-600">
                                <input
                                    id="email-template-active"
                                    name="is_active"
                                    type="checkbox"
                                    aria-label="Actief"
                                    className="rounded border-zinc-300 text-indigo-600 focus-visible:ring-indigo-600"
                                    checked={!!form.data.is_active}
                                    onChange={(e) => form.setData('is_active', e.target.checked ? 1 : 0)}
                                />
                                Actief
                            </label>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-white p-4">
                            <div id="email-template-body-label" className="text-xs font-semibold text-zinc-500">Template inhoud</div>
                            <div className="mt-2 rounded-lg border border-zinc-200">
                                <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 bg-zinc-50 px-2 py-2">
                                    <ToolbarButton
                                        title="Vet"
                                        active={editor?.isActive('bold')}
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().toggleBold().run()}
                                    >
                                        Vet
                                    </ToolbarButton>
                                    <ToolbarButton
                                        title="Cursief"
                                        active={editor?.isActive('italic')}
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                                    >
                                        Cursief
                                    </ToolbarButton>
                                    <ToolbarButton
                                        title="Opsomming"
                                        active={editor?.isActive('bulletList')}
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                    >
                                        Lijst
                                    </ToolbarButton>
                                    <ToolbarButton
                                        title="Genummerde lijst"
                                        active={editor?.isActive('orderedList')}
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                                    >
                                        Nummering
                                    </ToolbarButton>
                                    <ToolbarButton
                                        title="Link"
                                        active={editor?.isActive('link')}
                                        disabled={!editor}
                                        onClick={() => {
                                            if (!editor) return;
                                            const previousUrl = editor.getAttributes('link').href || '';
                                            const url = window.prompt('Link (URL)', previousUrl);
                                            if (url === null) return;
                                            if (url === '') {
                                                editor.chain().focus().unsetLink().run();
                                                return;
                                            }
                                            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                                        }}
                                    >
                                        Link
                                    </ToolbarButton>
                                    <ToolbarButton
                                        title="Opmaak wissen"
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
                                    >
                                        Wissen
                                    </ToolbarButton>
                                    <ToolbarButton
                                        title="Ongedaan maken"
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().undo().run()}
                                    >
                                        Ongedaan
                                    </ToolbarButton>
                                    <ToolbarButton
                                        title="Opnieuw"
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().redo().run()}
                                    >
                                        Opnieuw
                                    </ToolbarButton>
                                </div>
                                <EditorContent editor={editor} className="tiptap px-3 py-2 text-sm" />
                            </div>
                            {form.errors.body_html && <div className="mt-1 text-xs text-rose-600">{form.errors.body_html}</div>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="submit"
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={saving}
                            >
                                {saving ? 'Opslaan...' : 'Opslaan'}
                            </button>
                            {!isNew && selectedTemplate && (
                                <button
                                    type="button"
                                    className={cx(
                                        'rounded-md border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1',
                                        selectedTemplate.is_system && selectedTemplate.is_active
                                            ? 'cursor-not-allowed border-zinc-200 text-zinc-400'
                                            : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                    )}
                                    onClick={deleteTemplate}
                                    disabled={deleting || (selectedTemplate.is_system && selectedTemplate.is_active)}
                                >
                                    {deleting ? 'Verwijderen...' : 'Verwijderen'}
                                </button>
                            )}
                            {!canDelete && !isNew && selectedTemplate && selectedTemplate.is_system && selectedTemplate.is_active && (
                                <div className="text-xs text-zinc-500">Standaard templates kun je niet verwijderen zolang ze actief zijn.</div>
                            )}
                        </div>
                    </form>

                    <section className="rounded-xl border border-zinc-200 bg-white p-4" aria-labelledby="email-template-preview-title">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="min-w-0">
                                <h2 id="email-template-preview-title" className="text-sm font-semibold text-zinc-900">Voorbeeld met klantgegevens</h2>
                                <p className="mt-1 text-xs text-zinc-500">
                                    Alleen lezen. Gebruikt de huidige (ook niet opgeslagen) inhoud. Er wordt niets verstuurd of opgeslagen.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-end gap-2">
                                <div>
                                    <label htmlFor="email-template-preview-customer" className="block text-xs font-semibold text-zinc-500">Klant</label>
                                    <select
                                        id="email-template-preview-customer"
                                        className="mt-1 w-64 max-w-full rounded-md border-zinc-300 text-sm"
                                        value={previewCompanyId}
                                        onChange={(e) => {
                                            setPreviewCompanyId(e.target.value);
                                            if (e.target.value) loadPreview(e.target.value);
                                        }}
                                    >
                                        <option value="">Kies een klant</option>
                                        {previewCustomers.map((customer) => (
                                            <option key={customer.id} value={customer.id}>
                                                {customer.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={!previewCompanyId || previewLoading}
                                    onClick={() => loadPreview()}
                                >
                                    {previewLoading ? 'Laden...' : 'Voorbeeld vernieuwen'}
                                </button>
                            </div>
                        </div>

                        {previewError ? (
                            <div role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                                {previewError}
                            </div>
                        ) : null}

                        {preview ? (
                            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
                                <div className="space-y-1 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                                    <div>
                                        <span className="font-semibold text-zinc-700">Aan:</span> {preview.to || '-'}
                                    </div>
                                    <div>
                                        <span className="font-semibold text-zinc-700">Onderwerp:</span> {preview.subject || '-'}
                                    </div>
                                </div>
                                <iframe
                                    title="Voorbeeld van de e-mail"
                                    sandbox=""
                                    className="h-96 w-full bg-white"
                                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#18181b;margin:16px;}a{color:#4f46e5;}</style></head><body>${preview.html || ''}</body></html>`}
                                />
                            </div>
                        ) : !previewError ? (
                            <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-500">
                                Kies een klant om het voorbeeld te tonen.
                            </div>
                        ) : null}
                    </section>
                </div>
            </div>
        </div>
    );
}
