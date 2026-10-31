import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent } from '@tiptap/react';
import { Badge, Button, Card, Field, IconTile, cx } from '../../../../components/ui';
import { CURRENT_DRAFT, FormField, Notice, ToolbarButton, WELCOME_STATUS_LABELS, WELCOME_STATUS_TONES, formatDateTime } from './showUtils';

const TOKENS = ['{{ naam }}', '{{ bedrijfsnaam }}', '{{ loginnaam }}', '{{ activatielink }}', '{{ reset_link }}', '{{ weblink }}'];

function EditorToolbar({ editor }) {
    const disabled = !editor;
    const setLink = () => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href || '';
        const url = window.prompt('Link (URL)', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };
    return (
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5" role="toolbar" aria-label="Opmaak welkomstmail">
            <ToolbarButton title="Vet" active={editor?.isActive('bold')} disabled={disabled} onClick={() => editor?.chain().focus().toggleBold().run()}>Vet</ToolbarButton>
            <ToolbarButton title="Cursief" active={editor?.isActive('italic')} disabled={disabled} onClick={() => editor?.chain().focus().toggleItalic().run()}>Cursief</ToolbarButton>
            <ToolbarButton title="Opsomming" active={editor?.isActive('bulletList')} disabled={disabled} onClick={() => editor?.chain().focus().toggleBulletList().run()}>Lijst</ToolbarButton>
            <ToolbarButton title="Genummerde lijst" active={editor?.isActive('orderedList')} disabled={disabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>Nummering</ToolbarButton>
            <ToolbarButton title="Link" active={editor?.isActive('link')} disabled={disabled} onClick={setLink}>Link</ToolbarButton>
            <span className="mx-1 h-5 w-px bg-zinc-200" aria-hidden="true" />
            <ToolbarButton title="Opmaak wissen" disabled={disabled} onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}>Wissen</ToolbarButton>
            <ToolbarButton title="Ongedaan maken" disabled={disabled} onClick={() => editor?.chain().focus().undo().run()}>Ongedaan</ToolbarButton>
            <ToolbarButton title="Opnieuw" disabled={disabled} onClick={() => editor?.chain().focus().redo().run()}>Opnieuw</ToolbarButton>
        </div>
    );
}

function OptionButton({ selected, onClick, title, subtitle }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={cx(
                'w-full rounded-lg border px-4 py-3 text-left transition-colors',
                selected ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-zinc-200 bg-white hover:bg-zinc-50'
            )}
        >
            <span className="block text-sm font-semibold text-zinc-900">{title}</span>
            <span className="mt-0.5 block truncate text-xs text-zinc-500">{subtitle}</span>
        </button>
    );
}

function TemplateDialog({ pendingSend, toEmail, draftSubject, templates, selectedTemplateId, setSelectedTemplateId, selectedTemplate, onClose, onConfirm, sending }) {
    const dialogRef = useRef(null);

    // Focus in de dialoog houden en daarna terugzetten op de knop die hem opende.
    useEffect(() => {
        const previous = document.activeElement;
        window.requestAnimationFrame(() => dialogRef.current?.querySelector('button[aria-pressed="true"], button')?.focus());
        const onKeyDown = (event) => {
            if (event.key !== 'Tab' || !dialogRef.current) return;
            const focusable = Array.from(dialogRef.current.querySelectorAll('button:not([disabled]), [href], input, select, textarea'));
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            if (previous && typeof previous.focus === 'function') previous.focus();
        };
    }, []);

    const confirmDisabled = pendingSend ? !toEmail || (!selectedTemplate && selectedTemplateId !== CURRENT_DRAFT) || sending : !selectedTemplate;

    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/40 p-0 sm:items-center sm:p-4"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="template-picker-title"
                aria-describedby="template-picker-description"
                className="flex max-h-dvh-90 w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            >
                <div className="border-b border-zinc-100 px-5 py-4">
                    <h2 id="template-picker-title" className="text-base font-semibold text-zinc-900">
                        {pendingSend ? 'Welkomstmail versturen' : 'Kies een e-mail template'}
                    </h2>
                    <p id="template-picker-description" className="mt-1 text-sm text-zinc-500">
                        {pendingSend ? 'Kies wat je verstuurt: het huidige concept of een template.' : 'Het concept wordt gevuld met de template. Je kunt daarna nog aanpassen.'}
                    </p>
                    {pendingSend && (
                        <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                            <span className="font-semibold">Aan:</span> {toEmail || <span className="font-medium text-rose-700">geen e-mailadres ingevuld</span>}
                        </p>
                    )}
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
                    {pendingSend && (
                        <OptionButton
                            selected={selectedTemplateId === CURRENT_DRAFT}
                            onClick={() => setSelectedTemplateId(CURRENT_DRAFT)}
                            title="Huidig concept"
                            subtitle={draftSubject || 'Geen onderwerp'}
                        />
                    )}
                    {templates.map((template) => (
                        <OptionButton
                            key={template.id}
                            selected={selectedTemplateId === template.id}
                            onClick={() => setSelectedTemplateId(template.id)}
                            title={template.name}
                            subtitle={template.subject || 'Geen onderwerp'}
                        />
                    ))}
                </div>
                {/* Voettekst valt buiten het scrollgebied en blijft dus altijd zichtbaar; onderaan ruimte voor de home-indicator. */}
                <div className="shrink-0 border-t border-zinc-100 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:pb-4">
                    {selectedTemplate ? (
                        <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                            <p className="font-semibold">{selectedTemplate.subject || 'Geen onderwerp'}</p>
                            <p className="mt-1 text-zinc-500">{selectedTemplate.preview || 'Geen voorbeeld'}</p>
                        </div>
                    ) : pendingSend && selectedTemplateId === CURRENT_DRAFT ? (
                        <p className="text-xs text-zinc-500">Het concept wordt verstuurd zoals het nu is.</p>
                    ) : (
                        <p className="text-xs text-zinc-500">Kies een template om een voorbeeld te zien.</p>
                    )}
                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button variant="secondary" onClick={onClose}>
                            Annuleren
                        </Button>
                        <Button onClick={onConfirm} disabled={confirmDisabled} loading={pendingSend && sending}>
                            {pendingSend ? 'Versturen' : 'Gebruik template'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default function WelcomeTab({
    welcomeEmail,
    welcomeEmailSent,
    welcomeExpanded,
    setWelcomeExpanded,
    welcomeSentText,
    form,
    editor,
    templates,
    mailConfigured,
    mailSender = 'info@kivii.nl',
    onRefresh,
    onSave,
    onOpenPicker,
    picker,
    sending,
}) {
    if (welcomeEmailSent && !welcomeExpanded) {
        return (
            <Notice
                tone="success"
                title="Welkomstmail al verstuurd"
                action={
                    <Button variant="secondary" size="sm" onClick={() => setWelcomeExpanded(true)}>
                        Opnieuw versturen
                    </Button>
                }
            >
                {welcomeSentText}
                {welcomeEmail?.to_email ? ` naar ${welcomeEmail.to_email}` : ''}.
            </Notice>
        );
    }

    const status = welcomeEmail?.status || 'concept';
    const currentTemplate = templates.find((item) => item.id === form.data.template_id) || null;

    return (
        <div className="space-y-4">
            {welcomeEmailSent && (
                <Notice
                    tone="success"
                    action={
                        <Button variant="ghost" size="sm" onClick={() => setWelcomeExpanded(false)}>
                            Inklappen
                        </Button>
                    }
                >
                    {welcomeSentText}. Controleer het concept en kies "Opnieuw versturen" om nogmaals te sturen.
                </Notice>
            )}

            <Card>
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <IconTile icon="mail" size="sm" />
                        <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="section-heading">Welkomstmail</h2>
                            {welcomeEmail && <Badge tone={WELCOME_STATUS_TONES[status] || 'neutral'}>{WELCOME_STATUS_LABELS[status] || status}</Badge>}
                            {form.isDirty && <Badge tone="warning">Niet opgeslagen</Badge>}
                        </div>
                        <p className="mt-0.5 text-sm text-zinc-500">Concept op basis van een template. Controleer, pas aan en verstuur handmatig.</p>
                        {welcomeEmail?.sent_at && <p className="mt-1 text-xs text-zinc-500">Laatst verstuurd: {formatDateTime(welcomeEmail.sent_at)}</p>}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" icon="refresh" onClick={onRefresh} disabled={!welcomeEmail || sending}>
                            Concept vernieuwen
                        </Button>
                        <Button variant="secondary" size="sm" icon="layers" onClick={() => onOpenPicker(false)} disabled={!welcomeEmail || !templates.length || sending}>
                            Template kiezen
                        </Button>
                        <Button variant="secondary" size="sm" onClick={onSave} disabled={!welcomeEmail || sending} loading={form.processing}>
                            Concept opslaan
                        </Button>
                        <Button size="sm" icon="mail" onClick={() => onOpenPicker(true)} disabled={!welcomeEmail || sending} loading={sending}>
                            {sending ? 'Versturen...' : welcomeEmailSent ? 'Opnieuw versturen' : 'Verstuur welkomstmail'}
                        </Button>
                    </div>
                </div>

                {!welcomeEmail && (
                    <Notice tone="warning">Welkomstmail is nog niet beschikbaar. Draai migraties en ververs deze pagina.</Notice>
                )}

                {welcomeEmail && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="space-y-5 lg:col-span-8">
                            <FormField form={form} name="to_email" id="welcome-to-email" label="Ontvanger" type="email" required placeholder="klant@voorbeeld.nl" />
                            <FormField form={form} name="subject" id="welcome-subject" label="Onderwerp" required />
                            <Field id="welcome-body" error={form.errors.body_html}>
                                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                    <span id="welcome-body-label" className="text-sm font-medium text-zinc-800">Inhoud</span>
                                    {currentTemplate && <Badge>Template: {currentTemplate.name}</Badge>}
                                </div>
                                <div className="overflow-hidden rounded-lg border border-zinc-300 shadow-sm focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                                    <EditorToolbar editor={editor} />
                                    <EditorContent editor={editor} className="tiptap min-h-[16rem] px-3 py-2 text-sm" />
                                </div>
                            </Field>
                        </div>

                        <aside className="space-y-4 lg:col-span-4">
                            {!mailConfigured && (
                                <Notice tone="warning" title="Microsoft 365 niet gekoppeld">
                                    Mails gaan alleen via {mailSender}. Versturen kan pas als een beheerder de Microsoft 365-koppeling heeft ingesteld.
                                </Notice>
                            )}
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4">
                                <h3 className="text-sm font-semibold text-zinc-900">Beschikbare velden</h3>
                                <p className="mt-0.5 text-xs text-zinc-500">Worden bij versturen vervangen door de gegevens van deze klant.</p>
                                <ul className="mt-3 flex flex-wrap gap-1.5 lg:flex-col">
                                    {TOKENS.map((token) => (
                                        <li key={token} className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-700">
                                            {token}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </aside>
                    </div>
                )}
            </Card>

            {picker.open && (
                <TemplateDialog
                    pendingSend={picker.pendingSend}
                    toEmail={form.data.to_email}
                    draftSubject={form.data.subject}
                    templates={templates}
                    selectedTemplateId={picker.selectedTemplateId}
                    setSelectedTemplateId={picker.setSelectedTemplateId}
                    selectedTemplate={picker.selectedTemplate}
                    onClose={picker.onClose}
                    onConfirm={picker.onConfirm}
                    sending={sending}
                />
            )}
        </div>
    );
}
