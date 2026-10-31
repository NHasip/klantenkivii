import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { useConfirm } from '../../../../components/ConfirmProvider';
import { Badge, Button, Card, CardHeader } from '../../../../components/ui';
import { Notice, formatDate, formatDateTime } from './showUtils';

const STEP_META = {
    gepland: { label: 'Gepland', tone: 'info' },
    bezig: { label: 'Bezig met versturen', tone: 'warning' },
    verstuurd: { label: 'Verstuurd', tone: 'success' },
    overgeslagen: { label: 'Overgeslagen', tone: 'neutral' },
    gestopt: { label: 'Gestopt', tone: 'neutral' },
    mislukt: { label: 'Mislukt', tone: 'danger' },
};

const SEQUENCE_META = {
    actief: { label: 'Actief', tone: 'success' },
    gestopt: { label: 'Gestopt', tone: 'neutral' },
    afgerond: { label: 'Afgerond', tone: 'neutral' },
};

function stepDetail(step, testMode) {
    switch (step.status) {
        case 'gepland':
            return `Gepland op ${formatDateTime(step.due_at)}${testMode ? ` (na ${step.day} minuten)` : ''}${step.last_error ? `. Vorige poging mislukt: ${step.last_error}` : ''}`;
        case 'verstuurd':
            return `Verstuurd op ${formatDateTime(step.sent_at)}${step.recipient ? ` naar ${step.recipient}` : ''}`;
        case 'mislukt':
            return step.last_error || step.reason || 'Versturen mislukt.';
        case 'bezig':
            return 'De verzendtaak is met deze mail bezig.';
        default:
            return step.reason || '';
    }
}

export default function DemoMailSequenceCard({ data }) {
    const confirm = useConfirm();
    const [busy, setBusy] = useState(false);
    if (!data) return null;

    const sequence = data.sequence;
    const active = sequence?.status === 'actief';
    const testMode = Boolean(sequence?.test_mode);
    if (!sequence && !data.is_demo) return null;

    const post = (url) => {
        setBusy(true);
        router.post(url, {}, { preserveScroll: true, onFinish: () => setBusy(false) });
    };

    const onStop = async () => {
        const ok = await confirm({
            title: 'Demo-mailreeks stoppen?',
            message: 'De mails die nog gepland staan worden niet meer verstuurd.',
            confirmText: 'Reeks stoppen',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (ok) post(data.urls.stop);
    };

    const onRestart = async () => {
        const ok = await confirm({
            title: sequence ? 'Reeks opnieuw starten?' : 'Reeks starten?',
            message: 'Er worden drie nieuwe mails gepland: over 2, 5 en 13 dagen vanaf nu. Ook mails die eerder al verstuurd zijn, gaan dan opnieuw uit.',
            confirmText: sequence ? 'Opnieuw starten' : 'Reeks starten',
            cancelText: 'Annuleren',
        });
        if (ok) post(data.urls.restart);
    };

    const onStartTest = async () => {
        if (!data.recipient) {
            await confirm({
                title: 'Geen e-mailadres',
                message: 'Vul eerst een login-e-mail, hoofd-e-mail of e-mail bij het hoofdcontact in.',
                confirmText: 'Sluiten',
                showCancel: false,
            });
            return;
        }
        const ok = await confirm({
            title: 'Testmodus starten?',
            message: `De huidige reeks wordt gestopt en er start een testreeks. De drie mails gaan automatisch na 2, 5 en 13 minuten naar ${data.recipient}, namens ${data.sender}. Het verzendvenster (08:00 tot 20:00) geldt niet voor de testreeks. Gebruik dit alleen met een eigen testadres.`,
            confirmText: 'Testmodus starten',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (ok) post(data.urls.start_test);
    };

    const canSendNow = (step) =>
        data.can_manage && active && data.available && step.send_now_url && (step.status === 'gepland' || step.status === 'mislukt');

    const onSendNow = async (step) => {
        if (!data.graph_configured) {
            await confirm({
                title: 'Microsoft-koppeling ontbreekt',
                message: `Microsoft Graph is niet ingesteld voor ${data.sender}, dus deze mail kan nu niet verstuurd worden.`,
                confirmText: 'Sluiten',
                showCancel: false,
            });
            return;
        }
        if (!data.recipient) {
            await confirm({
                title: 'Geen e-mailadres',
                message: 'Vul eerst een login-e-mail, hoofd-e-mail of e-mail bij het hoofdcontact in.',
                confirmText: 'Sluiten',
                showCancel: false,
            });
            return;
        }
        const ok = await confirm({
            title: `${step.name} nu versturen?`,
            message: `Deze mail gaat nu direct naar de klant op ${data.recipient}, namens ${data.sender}. De geplande datum en het verzendvenster worden genegeerd. De andere mails in de reeks blijven ongewijzigd.`,
            confirmText: 'Nu versturen',
            cancelText: 'Annuleren',
        });
        if (!ok) return;
        // De redirect terug levert verse props en de flashmelding (toast) met het resultaat.
        post(step.send_now_url);
    };

    const seqMeta = sequence ? SEQUENCE_META[sequence.status] || { label: sequence.status, tone: 'neutral' } : null;
    const actions = data.can_manage ? (
        <>
            {active ? (
                <Button variant="secondary" size="sm" onClick={onStop} loading={busy}>
                    Reeks stoppen
                </Button>
            ) : null}
            {(!active || testMode) && data.is_demo && data.available ? (
                <Button variant="secondary" size="sm" onClick={onRestart} loading={busy}>
                    {sequence ? 'Reeks opnieuw starten' : 'Reeks starten'}
                </Button>
            ) : null}
            {data.is_demo && data.available && data.test_mode_available ? (
                <Button variant="secondary" size="sm" onClick={onStartTest} loading={busy}>
                    Testmodus starten (minuten)
                </Button>
            ) : null}
        </>
    ) : null;

    return (
        <Card>
            <CardHeader
                icon="mail"
                title="Demo-mailreeks"
                description={`Automatische mails op dag 2, 5 en 13 van de demo, namens ${data.sender}.`}
                actions={actions}
            />

            <div className="space-y-3">
                {!data.available ? (
                    <Notice tone="warning" title="Migratie ontbreekt">
                        Voer de migratie voor de demo-mailreeks uit om deze functie te gebruiken.
                    </Notice>
                ) : null}
                {data.available && active && !data.graph_configured ? (
                    <Notice tone="warning" title="Microsoft-koppeling ontbreekt">
                        Er wordt niets verstuurd zolang Microsoft Graph voor {data.sender} niet is ingesteld. De mails blijven gepland staan.
                    </Notice>
                ) : null}
                {data.available && active && !data.schedule_enabled ? (
                    <Notice tone="warning" title="Automatische taak staat uit">
                        CRM_SCHEDULE_DEMO_SEQUENCE staat uit, dus de geplande mails worden niet verstuurd.
                    </Notice>
                ) : null}
                {data.available && active && !data.recipient ? (
                    <Notice tone="warning" title="Geen e-mailadres">
                        Vul een login-e-mail, hoofd-e-mail of e-mail bij het hoofdcontact in. Anders wordt de mail overgeslagen.
                    </Notice>
                ) : null}

                {sequence ? (
                    <>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                            <Badge tone={seqMeta.tone} dot>{seqMeta.label}</Badge>
                            {testMode ? <Badge tone="warning">Testmodus</Badge> : null}
                            <span>Gestart op {testMode ? formatDateTime(sequence.started_at) : formatDate(sequence.started_at)}</span>
                            {active && data.recipient ? <span>· Naar {data.recipient}</span> : null}
                        </div>
                        {testMode ? (
                            <Notice tone="warning" title="Testmodus">
                                Deze reeks verstuurt de mails automatisch na 2, 5 en 13 minuten in plaats van dagen, ook buiten 08:00 tot 20:00.
                                Met Reeks opnieuw starten ga je terug naar de normale reeks (dag 2, 5 en 13).
                            </Notice>
                        ) : null}
                        {sequence.status === 'gestopt' && sequence.stop_reason ? (
                            <p className="text-sm text-zinc-600">
                                {sequence.stop_reason}
                                {sequence.stopped_at ? ` (${formatDateTime(sequence.stopped_at)})` : ''}
                            </p>
                        ) : null}
                        <ol className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                            {sequence.steps.map((step) => {
                                const meta = STEP_META[step.status] || { label: step.status, tone: 'neutral' };
                                return (
                                    <li key={step.key} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-900">{step.name}</p>
                                            <p className="text-xs text-zinc-500">{stepDetail(step, testMode)}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                                            <Badge tone={meta.tone} dot>
                                                {meta.label}
                                            </Badge>
                                            {canSendNow(step) ? (
                                                <Button variant="secondary" size="xs" onClick={() => onSendNow(step)} loading={busy}>
                                                    Nu versturen
                                                </Button>
                                            ) : null}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </>
                ) : data.available ? (
                    <p className="text-sm text-zinc-600">
                        Voor deze klant loopt geen reeks. De reeks start automatisch als de status van Demo aangevraagd naar Demo gaat.
                    </p>
                ) : null}

                {data.can_manage ? (
                    <p className="text-xs text-zinc-500">
                        De teksten pas je aan bij <a className="font-medium text-indigo-700 hover:underline" href={data.urls.templates}>E-mailtemplates</a>.
                    </p>
                ) : null}
            </div>
        </Card>
    );
}
