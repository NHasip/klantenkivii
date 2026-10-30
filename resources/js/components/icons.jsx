import React from 'react';
import ICONS from './icons.json';

/*
 * Kivii icoonset: 24px lijniconen (lucide-stijl, eigen paden, geen dependency).
 * Bron van waarheid is icons.json; de Blade-component <x-icon name="..."> leest hetzelfde bestand.
 *
 * Gebruik:
 *   import { Icon, UsersIcon } from '@/components/icons'  (of relatief: './components/icons')
 *   <UsersIcon className="h-4 w-4 text-zinc-500" />
 *   <Icon name="calendar" size={20} />
 *   <Icon name="trash" title="Verwijderen" />   // met title wordt het icoon aangekondigd (role="img"), anders aria-hidden
 *
 * Props: name, size (px, standaard 24; className met h-/w- wint), strokeWidth (standaard 1.75), title, className.
 */

export const ICON_NAMES = Object.freeze(Object.keys(ICONS));

/** Generiek icoon op naam. Onbekende namen renderen niets (en waarschuwen in dev). */
export function Icon({ name, size = 24, strokeWidth = 1.75, title, className = '', ...props }) {
    const body = ICONS[name];
    if (!body) {
        if (import.meta.env?.DEV) console.warn(`[icons] onbekend icoon: ${name}`);
        return null;
    }
    const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true, focusable: 'false' };
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className || undefined}
            {...a11y}
            {...props}
            dangerouslySetInnerHTML={{ __html: (title ? `<title>${String(title).replace(/[<&>]/g, '')}</title>` : '') + body }}
        />
    );
}

function makeIcon(name) {
    const Component = (props) => <Icon name={name} {...props} />;
    Component.displayName = `Icon(${name})`;
    return Component;
}

export const ActivityIcon = makeIcon('activity');
export const AlertCircleIcon = makeIcon('alert-circle');
export const AlertTriangleIcon = makeIcon('alert-triangle');
export const ArchiveIcon = makeIcon('archive');
export const ArrowDownRightIcon = makeIcon('arrow-down-right');
export const ArrowLeftIcon = makeIcon('arrow-left');
export const ArrowRightIcon = makeIcon('arrow-right');
export const ArrowUpRightIcon = makeIcon('arrow-up-right');
export const BarChartIcon = makeIcon('bar-chart');
export const BellIcon = makeIcon('bell');
export const BriefcaseIcon = makeIcon('briefcase');
export const BuildingIcon = makeIcon('building');
export const CalendarIcon = makeIcon('calendar');
export const CarIcon = makeIcon('car');
export const CheckIcon = makeIcon('check');
export const CheckCircleIcon = makeIcon('check-circle');
export const CheckSquareIcon = makeIcon('check-square');
export const ChevronDownIcon = makeIcon('chevron-down');
export const ChevronLeftIcon = makeIcon('chevron-left');
export const ChevronRightIcon = makeIcon('chevron-right');
export const ChevronUpIcon = makeIcon('chevron-up');
export const ChevronsUpDownIcon = makeIcon('chevrons-up-down');
export const ClockIcon = makeIcon('clock');
export const CopyIcon = makeIcon('copy');
export const CreditCardIcon = makeIcon('credit-card');
export const DownloadIcon = makeIcon('download');
export const EditIcon = makeIcon('edit');
export const EuroIcon = makeIcon('euro');
export const ExternalLinkIcon = makeIcon('external-link');
export const EyeIcon = makeIcon('eye');
export const FileTextIcon = makeIcon('file-text');
export const FilterIcon = makeIcon('filter');
export const GlobeIcon = makeIcon('globe');
export const GridIcon = makeIcon('grid');
export const HomeIcon = makeIcon('home');
export const InboxIcon = makeIcon('inbox');
export const InfoIcon = makeIcon('info');
export const KeyIcon = makeIcon('key');
export const LayersIcon = makeIcon('layers');
export const LinkIcon = makeIcon('link');
export const ListIcon = makeIcon('list');
export const LogOutIcon = makeIcon('log-out');
export const MailIcon = makeIcon('mail');
export const MapPinIcon = makeIcon('map-pin');
export const MenuIcon = makeIcon('menu');
export const MessageSquareIcon = makeIcon('message-square');
export const MinusIcon = makeIcon('minus');
export const MoreHorizontalIcon = makeIcon('more-horizontal');
export const MoreVerticalIcon = makeIcon('more-vertical');
export const PackageIcon = makeIcon('package');
export const PhoneIcon = makeIcon('phone');
export const PlusIcon = makeIcon('plus');
export const RefreshIcon = makeIcon('refresh');
export const SearchIcon = makeIcon('search');
export const SettingsIcon = makeIcon('settings');
export const ShieldIcon = makeIcon('shield');
export const SlidersIcon = makeIcon('sliders');
export const SparklesIcon = makeIcon('sparkles');
export const TagIcon = makeIcon('tag');
export const TrashIcon = makeIcon('trash');
export const UploadIcon = makeIcon('upload');
export const UserIcon = makeIcon('user');
export const UsersIcon = makeIcon('users');
export const XIcon = makeIcon('x');
export const XCircleIcon = makeIcon('x-circle');
