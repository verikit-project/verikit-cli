import type {
  InstallPackages,
  InstallResult,
} from "../../src/install/dependencies.js";
import type { Prompts } from "../../src/commands/init.js";

export const CANCEL = Symbol("cancel");
type Response = string | boolean | typeof CANCEL;

export interface FakePromptsHandle {
  prompts: Prompts;
  /** Every prompt interaction, in order, as human-readable strings for substring assertions. */
  events: string[];
}

/** A scripted `Prompts` implementation: each select()/confirm() call consumes the next queued response. */
export function makeFakePrompts(responses: Response[]): FakePromptsHandle {
  let cursor = 0;
  const events: string[] = [];

  const prompts: Prompts = {
    intro: (title) => events.push(`intro:${title}`),
    outro: (message) => events.push(`outro:${message}`),
    log: {
      success: (message) => events.push(`log:success:${message}`),
      warn: (message) => events.push(`log:warn:${message}`),
      error: (message) => events.push(`log:error:${message}`),
      step: (message) => events.push(`log:step:${message}`),
    },
    select: async (opts) => {
      events.push(`select:${opts.message}`);
      return responses[cursor++] as string | symbol;
    },
    confirm: async (opts) => {
      events.push(`confirm:${opts.message}`);
      return responses[cursor++] as boolean | symbol;
    },
    spinner: () => ({
      start: (message) => events.push(`spinner:start:${message}`),
      stop: (message) => events.push(`spinner:stop:${message}`),
    }),
    isCancel: (value): value is symbol => value === CANCEL,
    cancel: (message) => events.push(`cancel:${message}`),
  };

  return { prompts, events };
}

export interface FakeInstallHandle {
  installPackages: InstallPackages;
  calls: { manager: string; packages: string[]; cwd: string }[];
}

export function makeFakeInstall(result: InstallResult): FakeInstallHandle {
  const calls: { manager: string; packages: string[]; cwd: string }[] = [];
  const installPackages: InstallPackages = async (manager, packages, cwd) => {
    calls.push({ manager, packages, cwd });
    return result;
  };
  return { installPackages, calls };
}
