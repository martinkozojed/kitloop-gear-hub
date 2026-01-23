import * as React from "react"
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Box,
    LayoutDashboard,
    PlusCircle,
    Search,
    QrCode,
    LogOut
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { useCommand } from "@/context/CommandContext"

export function CommandMenu() {
    const { open, setOpen } = useCommand()
    const navigate = useNavigate()
    const { logout } = useAuth()

    // Keyboard listener moved to context


    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [setOpen])

    // If user is not logged in, maybe show limited menu or nothing?
    // For now showing limited menu for guests is fine, but mostly this is for providers.

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Suggestions">
                    <CommandItem onSelect={() => runCommand(() => navigate("/provider/dashboard"))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/provider/reservations/new"))}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>New Reservation</span>
                        <CommandShortcut>⌘N</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/browse"))}>
                        <Search className="mr-2 h-4 w-4" />
                        <span>Browse Gear</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Operations">
                    <CommandItem onSelect={() => runCommand(() => navigate("/provider/reservations"))}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Reservations</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/provider/inventory"))}>
                        <Box className="mr-2 h-4 w-4" />
                        <span>Inventory</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/provider/calendar"))}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Calendar</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/provider/customers"))}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Customers</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/provider/dashboard/verify"))}>
                        <QrCode className="mr-2 h-4 w-4" />
                        <span>Scan / Verify</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Settings">
                    <CommandItem onSelect={() => runCommand(() => navigate("/provider/settings"))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/provider/analytics"))}>
                        <Calculator className="mr-2 h-4 w-4" />
                        <span>Analytics</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => logout())}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}

