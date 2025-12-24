import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export type MemberRole = 'owner' | 'staff' | 'viewer';

interface Permissions {
    role: MemberRole | null;
    loading: boolean;
    canViewFinancials: boolean;
    canManageTeam: boolean;
    canDeleteAssets: boolean;
    canEditSettings: boolean;
}

export const usePermissions = () => {
    const { user, provider } = useAuth();
    const [role, setRole] = useState<MemberRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchRole = async () => {
            if (!user || !provider) {
                if (isMounted) {
                    setRole(null);
                    setLoading(false);
                }
                return;
            }

            // Optimization: If user is the provider owner (via auth.uid = provider.user_id), they are Owner.
            // But we should check the `provider_members` table for consistency if we move away from `provider.user_id`.
            // For now, let's trust the new RBAC table as the source of truth, 
            // BUT we must remember that the original "Owner" might not be in that table yet if we didn't migrate them perfectly?
            // Actually, existing owners might rely on `provider.user_id`.
            // Let's check both for safety.

            try {
                // Check direct ownership first (Legacy/Compat)
                if (provider.user_id === user.id) {
                    if (isMounted) {
                        setRole('owner');
                        setLoading(false);
                    }
                    return;
                }

                // Check Members Table
                const { data, error } = await supabase
                    .from('provider_members')
                    .select('role')
                    .eq('provider_id', provider.id)
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;

                if (isMounted) {
                    setRole((data?.role as MemberRole) || null);
                }
            } catch (err) {
                console.error('Error fetching permissions:', err);
                if (isMounted) setRole(null);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchRole();

        return () => { isMounted = false; };
    }, [user, provider]);

    // Derived Permissions
    const isOwner = role === 'owner';
    // Staff can do ops but not money/structure
    const isStaff = role === 'staff';

    return {
        role,
        loading,
        canViewFinancials: isOwner,
        canManageTeam: isOwner,
        canEditSettings: isOwner,
        // Staff can edit but NOT delete
        canDeleteAssets: isOwner,
        // Everyone (even viewers? maybe not) can view lines
    } as Permissions;
};
