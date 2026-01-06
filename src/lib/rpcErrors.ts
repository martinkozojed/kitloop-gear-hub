export interface RpcError {
    code: string;
    message: string;
    details?: string;
    hint?: string;
}

export const RPC_ERROR_CODES = {
    PAYMENT_REQUIRED: 'P0003',
    STATUS_INVALID: 'P0002',
    OVERRIDE_REQUIRED: 'P0004',
    NO_ASSETS: 'P0005',
    UNAUTHORIZED: '42501', // Standard Postgres RLS
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapRpcError = (error: any): RpcError => {
    // Supabase error object usually has 'code', 'message', 'details'
    const code = error?.code || 'UNKNOWN';
    let message = error?.message || 'Unknown error occurred';
    let hint = error?.hint;

    switch (code) {
        case RPC_ERROR_CODES.PAYMENT_REQUIRED:
            message = 'Platba nebo záloha chybí.';
            hint = 'Pro vydání bez platby použijte možnost "Override" (Vynutit vydání).';
            break;
        case RPC_ERROR_CODES.STATUS_INVALID:
            message = 'Rezervace není ve stavu k vydání/vrácení.';
            hint = 'Zkontrolujte, zda je rezervace potvrzena.';
            break;
        case RPC_ERROR_CODES.OVERRIDE_REQUIRED:
            message = 'Chybí důvod pro vynucení vydání.';
            break;
        case RPC_ERROR_CODES.NO_ASSETS:
            message = 'Nedostatek volných kusů (Assets) na skladě.';
            hint = 'Zkontrolujte fyzický stav nebo konflikty.';
            break;
        case RPC_ERROR_CODES.UNAUTHORIZED:
            message = 'Nemáte oprávnění k této akci.';
            break;
        case '23505': // Unique violation
            message = 'Duplicitní záznam.';
            break;
        default:
            // Keep original message for unknown errors
            break;
    }

    return { code, message, details: error?.details, hint };
};
