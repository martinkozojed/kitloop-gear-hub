
export type UserRole = 'operator' | 'manager' | 'admin';
export type Resource = 'reservation' | 'inventory' | 'customer' | 'financials';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'override';

interface UserContext {
    role: UserRole;
    id: string;
    is_verified?: boolean;
}

/**
 * Central Permission Gate
 * Usage: if (can(user, 'update', 'reservation')) { ... }
 */
export const can = (
    user: UserContext | null,
    action: Action,
    resource: Resource
): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    // Gatekeeper: Unverified users cannot create or update anything
    if (user.is_verified === false && (action === 'create' || action === 'update')) {
        return false;
    }

    // Manager Rules
    if (user.role === 'manager') {
        return true; // Managers can do almost anything except system config
    }

    // Operator Rules (Strict Operational Limits)
    if (user.role === 'operator') {
        // Operators CANNOT delete
        if (action === 'delete') return false;

        // Operators CANNOT see financials
        if (resource === 'financials') return false;

        // Operators CANNOT override guards (e.g. Unpaid Issue)
        if (action === 'override') return false;

        return true;
    }

    return false;
};
