import { useEffect, useRef } from 'react';

const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Basis toegankelijkheid voor modals/drawers: Escape sluit, focus gaat naar
 * het eerste veld, Tab blijft binnen de dialog en focus keert terug na sluiten.
 * Met data-autofocus="desktop" krijgt dat veld alleen focus bij een muis/trackpad, niet op touch.
 */
export function useDialog(open, onClose) {
    const ref = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!open) return undefined;
        const previouslyFocused = document.activeElement;

        const focusFirst = () => {
            const node = ref.current;
            if (!node || node.contains(document.activeElement)) return;
            let target = node.querySelector('[data-autofocus]') || node.querySelector(FOCUSABLE);
            // data-autofocus="desktop": op touch-apparaten niet het veld focussen (anders schuift het toetsenbord
            // direct omhoog), maar de dialog zelf, zodat Tab en Escape gewoon werken.
            if (target?.getAttribute('data-autofocus') === 'desktop' && window.matchMedia?.('(pointer: coarse)').matches) {
                target = null;
            }
            (target || node).focus?.();
        };
        const raf = requestAnimationFrame(focusFirst);

        const handleKey = (event) => {
            const node = ref.current;
            if (!node) return;
            if (event.key === 'Escape') {
                if (event.defaultPrevented) return;
                event.preventDefault();
                onCloseRef.current?.();
                return;
            }
            if (event.key !== 'Tab') return;
            const items = Array.from(node.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
            if (items.length === 0) {
                event.preventDefault();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === node || !node.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = previousOverflow;
            if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
                previouslyFocused.focus();
            }
        };
    }, [open]);

    return ref;
}
