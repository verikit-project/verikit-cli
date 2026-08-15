import pc from "picocolors";

/** The colored "VeriKit" wordmark used in the CLI's intro/outro banners. */
export function logo(suffix?: string): string {
  const word = pc.bold(`${pc.cyan("Veri")}${pc.magenta("Kit")}`);
  return suffix ? `${word} ${pc.dim(suffix)}` : word;
}
