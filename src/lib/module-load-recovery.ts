const RECOVERY_KEY = "krishisetu:module-load-reload";

const MODULE_LOAD_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" ? message : "";
}

export function isModuleLoadError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const message = errorMessage(error);
  return name === "ChunkLoadError" || MODULE_LOAD_PATTERNS.some((pattern) => pattern.test(message));
}

type RecoveryOptions = {
  pathname: string;
  storage: Pick<Storage, "getItem" | "setItem">;
  reload: () => void;
};

/** Reload once for a stale route module, but never create a reload loop. */
export function attemptModuleLoadRecovery(error: unknown, options: RecoveryOptions): boolean {
  if (!isModuleLoadError(error)) return false;
  const fingerprint = `${options.pathname}\n${errorMessage(error)}`;
  try {
    if (options.storage.getItem(RECOVERY_KEY) === fingerprint) return false;
    options.storage.setItem(RECOVERY_KEY, fingerprint);
  } catch {
    return false;
  }
  options.reload();
  return true;
}

