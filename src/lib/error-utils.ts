/**
 * P0 SECURITY FIX: Sanitized error messages for production
 * Prevents leaking database structure, table names, constraints
 * 
 * @param error - Error object from any source
 * @param sanitize - If false, returns raw message (DEV only)
 * @returns User-friendly error message
 */
export const getErrorMessage = (error: unknown, sanitize = true): string => {
  const isDev = import.meta.env.DEV;
  
  // In development, optionally return raw messages for debugging
  if (!sanitize && isDev) {
    return getRawErrorMessage(error);
  }

  // Extract error code for mapping
  const errorCode = getErrorCode(error);
  
  // Map known error codes to user-friendly messages
  if (errorCode && sanitize) {
    const userMessage = mapErrorCodeToMessage(errorCode);
    if (userMessage) {
      return userMessage;
    }
  }

  // Fallback: extract message but sanitize it
  const rawMessage = getRawErrorMessage(error);
  
  if (sanitize) {
    return sanitizeErrorMessage(rawMessage);
  }
  
  return rawMessage;
};

/**
 * Get raw error message without sanitization (internal use)
 */
function getRawErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Sanitize error message by removing DB-specific details
 */
function sanitizeErrorMessage(message: string): string {
  // Remove table names patterns: "table_name_constraint"
  message = message.replace(/\b[a-z_]+_[a-z_]+_key\b/gi, '[constraint]');
  message = message.replace(/\bpublic\.[a-z_]+\b/gi, '[table]');
  
  // Remove column names in parentheses: "(column1, column2)"
  message = message.replace(/\([a-z_,\s]+\)/gi, '');
  
  // Remove UUID patterns
  message = message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]');
  
  // Remove "Detail:" sections
  message = message.replace(/Detail:.*$/gi, '');
  message = message.replace(/DETAIL:.*$/gi, '');
  
  // Remove "Hint:" sections
  message = message.replace(/Hint:.*$/gi, '');
  message = message.replace(/HINT:.*$/gi, '');
  
  // Clean up whitespace
  message = message.trim();
  
  // If message is now too generic or empty, return default
  if (message.length < 10 || !message) {
    return 'Operace se nezdařila. Zkuste to prosím znovu.';
  }
  
  return message;
}

/**
 * Map PostgreSQL error codes to user-friendly Czech messages
 */
function mapErrorCodeToMessage(code: string): string | null {
  const errorMap: Record<string, string> = {
    // Integrity constraint violations
    '23505': 'Tento záznam již existuje. Zkuste použít jiné hodnoty.',
    '23503': 'Operaci nelze dokončit - chybí související data.',
    '23514': 'Data nesplňují požadované podmínky systému.',
    '23502': 'Vyžadované pole není vyplněno.',
    '23000': 'Porušena integrita dat.',
    
    // Authorization/RLS
    '42501': 'Nemáte oprávnění k této operaci.',
    '42P01': 'Požadovaný zdroj nebyl nalezen.',
    
    // Custom application errors (P0xxx)
    'P0001': 'Operace byla zamítnuta systémem.',
    'P0002': 'Záznam není ve správném stavu pro tuto operaci.',
    'P0003': 'Platba nebo záloha chybí.',
    'P0004': 'Rezervace není ve stavu k vydání/vrácení.',
    'P0005': 'Nedostatek volných kusů na skladě.',
    
    // Connection/timeout
    '08000': 'Chyba připojení k databázi.',
    '08003': 'Připojení bylo ukončeno.',
    '08006': 'Spojení selhalo.',
    '57014': 'Operace trvala příliš dlouho a byla přerušena.',
    
    // Unique constraint (specific patterns)
    '23P01': 'Operace způsobila konflikt s existujícími daty.',
    
    // Invalid input
    '22P02': 'Neplatný formát dat.',
    '22001': 'Text je příliš dlouhý.',
    '22003': 'Číselná hodnota je mimo povolený rozsah.',
  };

  return errorMap[code] || null;
}

export const getErrorCode = (error: unknown): string | undefined => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }

  return undefined;
};

export const isFetchError = (error: unknown): boolean => {
  return (
    error instanceof TypeError &&
    typeof error.message === "string" &&
    error.message.includes("fetch")
  );
};

export const isSupabaseConstraintError = (
  error: unknown
): boolean => {
  const message = getErrorMessage(error);
  return message.includes("constraint");
};
