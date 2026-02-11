import React, { useEffect, useMemo, useState } from 'react';
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
            onClick={onClick}
            disabled={disabled}
            className={cx(
                'rounded-md px-2 py-1 text-xs font-semibold transition',
                active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100',
                disabled && 'cursor-not-allowed opacity-40'
            )}
        >
            {children}
        </button>
    );
}

export default function Index({ templates, variables, urls }) {
    const confirm = useConfirm();
    const [selectedId, setSelectedId] = useState(templates?.[0]?.id ?? 'new');

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
    const deleteUrl = urls.delete_post || urls.delete;

    const form = useForm({
        name: '',
        subject: '',
        body_html: '',
        is_active: 1,
    });

    useEffect(() => {
        if (selectedTemplate) {
            form.setData({
                name: selectedTemplate.name || '',
                subject: selectedTemplate.subject || '',
                body_html: selectedTemplate.body_html || '',
                is_active: selectedTemplate.is_active ? 1 : 0,
            });
        } else if (isNew) {
            form.setData({
                name: '',
                subject: '',
                body_html: '<p></p>',
                is_active: 1,
            });
        }
    }, [selectedTemplate?.id, isNew]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [2, 3] } }),
            LinkExtension.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
            Placeholder.configure({ placeholder: 'Schrijf je e-mail template...' }),
        ],
        content: form.data.body_html || '<p></p>',
        onUpdate: ({ editor: ed }) => {
            form.setData('body_html', ed.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) return;
        const nextHtml = form.data.body_html?.trim() ? form.data.body_html : '<p></p>';
        if (editor.getHTML() !== nextHtml) {
            editor.commands.setContent(nextHtml, false);
        }
    }, [editor, form.data.body_html]);

    const submitTemplate = (method, url, options = {}) => {
        const latestHtml = editor ? editor.getHTML() : form.data.body_html;
        const payload = {
            ...form.data,
            body_html: latestHtml,
        };
        const requestOptions = {
            preserveScroll: true,
            ...options,
            onSuccess: (...args) => {
                router.reload({ only: ['templates'], preserveScroll: true, preserveState: true });
                options.onSuccess?.(...args);
            },
            onError: (errors) => {
                form.setError(errors || {});
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
            submitTemplate('post', urls.store, { onSuccess: () => setSelectedId('new') });
            return;
        }
        if (selectedTemplate) {
            form.clearErrors();
            const targetUrl = updateUrl.replace('__TEMPLATE__', selectedTemplate.id);
            submitTemplate(updateUrl ? 'post' : 'patch', targetUrl);
        }
    };

    const deleteTemplate = async () => {
        if (!selectedTemplate || (selectedTemplate.is_system && selectedTemplate.is_active)) return;
        const ok = await confirm({
            title: 'Template verwijderen',
            message: `Weet je zeker dat je "${selectedTemplate.name}" wilt verwijderen?`,
            confirmText: 'Verwijderen',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (!ok) return;
        if (deleteUrl) {
            router.post(
                deleteUrl.replace('__TEMPLATE__', selectedTemplate.id),
                { is_active: form.data.is_active },
                {
                    preserveScroll: true,
                    onSuccess: () => setSelectedId('new'),
                }
            );
            return;
        }
        router.delete(urls.delete.replace('__TEMPLATE__', selectedTemplate.id), {
            preserveScroll: true,
            onSuccess: () => setSelectedId('new'),
        });
    };

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
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                >
                    Terug
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="space-y-3 lg:col-span-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">Templates</div>
                            <button
                                type="button"
                                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold hover:bg-zinc-50"
                                onClick={() => setSelectedId('new')}
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
                                    onClick={() => setSelectedId(template.id)}
                                    className={cx(
                                        'w-full rounded-lg border px-3 py-2 text-left transition',
                                        selectedId === template.id
                                            ? 'border-zinc-900 bg-zinc-900 text-white'
                                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                                    )}
                                >
                                    <div className="text-sm font-semibold">{template.name}</div>
                                    <div className={cx('mt-1 text-xs', selectedId === template.id ? 'text-zinc-200' : 'text-zinc-500')}>
                                        {template.subject || 'Geen onderwerp'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="text-xs font-semibold text-zinc-500">Beschikbare velden</div>
                        <div className="mt-2 space-y-1 text-xs text-zinc-600">
                            {Object.keys(variables || {}).map((token) => (
                                <div key={token} className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono">
                                    {`{{ ${token} }}`}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 lg:col-span-8">
                    <form onSubmit={saveTemplate} className="space-y-4">
                        <div className="rounded-xl border border-zinc-200 bg-white p-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-500">Naam</label>
                                    <input
                                        className="mt-2 w-full rounded-md border-zinc-300 text-sm"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                    />
                                    {form.errors.name && <div className="mt-1 text-xs text-rose-600">{form.errors.name}</div>}
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-zinc-500">Onderwerp</label>
                                    <input
                                        className="mt-2 w-full rounded-md border-zinc-300 text-sm"
                                        value={form.data.subject}
                                        onChange={(e) => form.setData('subject', e.target.value)}
                                    />
                                    {form.errors.subject && <div className="mt-1 text-xs text-rose-600">{form.errors.subject}</div>}
                                </div>
                            </div>
                            <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-zinc-600">
                                <input
                                    type="checkbox"
                                    className="rounded border-zinc-300"
                                    checked={!!form.data.is_active}
                                    onChange={(e) => form.setData('is_active', e.target.checked ? 1 : 0)}
                                />
                                Actief
                            </label>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-white p-4">
                            <div className="text-xs font-semibold text-zinc-500">Template inhoud</div>
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
                                            const url = window.prompt('Link URL', previousUrl);
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
                                        Undo
                                    </ToolbarButton>
                                    <ToolbarButton
                                        title="Opnieuw"
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().redo().run()}
                                    >
                                        Redo
                                    </ToolbarButton>
                                </div>
                                <EditorContent editor={editor} className="tiptap px-3 py-2 text-sm" />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                                disabled={form.processing}
                                onClick={saveTemplate}
                            >
                                {form.processing ? 'Opslaan...' : 'Opslaan'}
                            </button>
                            {!isNew && selectedTemplate && (
                                <button
                                    type="button"
                                    className={cx(
                                        'rounded-md border px-3 py-2 text-sm font-semibold',
                                        selectedTemplate.is_system && selectedTemplate.is_active
                                            ? 'cursor-not-allowed border-zinc-200 text-zinc-400'
                                            : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                    )}
                                    onClick={deleteTemplate}
                                    disabled={selectedTemplate.is_system && selectedTemplate.is_active}
                                >
                                    Verwijderen
                                </button>
                            )}
                            {!canDelete && !isNew && selectedTemplate && selectedTemplate.is_system && selectedTemplate.is_active && (
                                <div className="text-xs text-zinc-500">Standaard templates kun je niet verwijderen zolang ze actief zijn.</div>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
