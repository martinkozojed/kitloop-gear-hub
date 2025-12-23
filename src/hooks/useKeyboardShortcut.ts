
import { useEffect } from 'react';

type KeyCombo = {
    key: string;
    metaOrCtrl?: boolean; // Cmd on Mac, Ctrl on Windows
    shift?: boolean;
    alt?: boolean;
};

export const useKeyboardShortcut = (
    combo: KeyCombo,
    callback: (e: KeyboardEvent) => void,
    options?: { enabled?: boolean; preventDefault?: boolean }
) => {
    const { enabled = true, preventDefault = true } = options || {};

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. Check Key
            if (e.key.toLowerCase() !== combo.key.toLowerCase() && e.key !== combo.key) return;

            // 2. Check Modifiers
            const metaOrCtrlPressed = e.metaKey || e.ctrlKey;
            if (combo.metaOrCtrl && !metaOrCtrlPressed) return;
            if (!combo.metaOrCtrl && metaOrCtrlPressed) return; // Strict mode: if we didn't ask for mod, don't allow it (unless it's a simple key like 'c' where we might accept Cmd+C... wait, no. 'c' usually implies NO modifiers for the action)

            // Wait, for 'c', we definitely don't want Cmd+C to trigger it. 
            // So strict checking of modifiers is good.

            const shiftPressed = e.shiftKey;
            if (combo.shift && !shiftPressed) return;
            if (!combo.shift && shiftPressed) return;

            const altPressed = e.altKey;
            if (combo.alt && !altPressed) return;
            if (!combo.alt && altPressed) return;

            // 3. Ignore inputs (unless it's a "Cmd+Enter" which should work in textareas sometimes, but generally ignoring focused inputs for single keys is safer)
            // For 'c', we must ignore if typing in input.
            // For 'Cmd+Enter', we usually ALLOW it in inputs (to submit form).

            const target = e.target as HTMLElement;
            const isInput = target.matches('input, textarea, select, [contenteditable]');

            if (!combo.metaOrCtrl && isInput) {
                return; // Don't trigger single keys like 'c' inside inputs
            }

            // 4. Trigger
            if (preventDefault) e.preventDefault();
            callback(e);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [combo.key, combo.metaOrCtrl, combo.shift, combo.alt, enabled, preventDefault, callback]);
};
