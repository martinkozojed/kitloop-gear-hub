export const getErrorMessage = (error: unknown): string => {
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
};

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
