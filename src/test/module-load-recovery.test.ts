import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  attemptModuleLoadRecovery,
  isModuleLoadError,
} from "@/lib/module-load-recovery";

const staleModuleError = new TypeError(
  "Failed to fetch dynamically imported module: /@oj-start/forecast-DOBO-wvc.js",
);

describe("module load recovery", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("recognizes browser route-module failures without treating ordinary errors as stale modules", () => {
    expect(isModuleLoadError(staleModuleError)).toBe(true);
    expect(isModuleLoadError(new Error("Importing a module script failed."))).toBe(true);
    expect(isModuleLoadError(new Error("Official prices are unavailable"))).toBe(false);
  });

  it("reloads a failed route once and blocks a reload loop for the same failure", () => {
    const reload = vi.fn();
    const options = { pathname: "/forecast", storage: window.sessionStorage, reload };

    expect(attemptModuleLoadRecovery(staleModuleError, options)).toBe(true);
    expect(attemptModuleLoadRecovery(staleModuleError, options)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("allows recovery from a different stale module after a later update", () => {
    const reload = vi.fn();
    const options = { pathname: "/forecast", storage: window.sessionStorage, reload };
    attemptModuleLoadRecovery(staleModuleError, options);

    const nextError = new TypeError(
      "Failed to fetch dynamically imported module: /@oj-start/forecast-Cpow7kgn.js",
    );
    expect(attemptModuleLoadRecovery(nextError, options)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("leaves recovery manual when browser storage is unavailable", () => {
    const reload = vi.fn();
    const storage = {
      getItem: () => {
        throw new Error("Storage blocked");
      },
      setItem: vi.fn(),
    };

    expect(attemptModuleLoadRecovery(staleModuleError, { pathname: "/forecast", storage, reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
