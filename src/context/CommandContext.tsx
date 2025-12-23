
import React, { createContext, useContext, useState, useEffect } from 'react';

interface CommandContextType {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
}

const CommandContext = createContext<CommandContextType | undefined>(undefined);

export const CommandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [open, setOpen] = useState(false);

    const toggle = () => setOpen(prev => !prev);

    // Handle keyboard shortcut here centrally
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    return (
        <CommandContext.Provider value={{ open, setOpen, toggle }}>
            {children}
        </CommandContext.Provider>
    );
};

export const useCommand = () => {
    const context = useContext(CommandContext);
    if (context === undefined) {
        throw new Error('useCommand must be used within a CommandProvider');
    }
    return context;
};
