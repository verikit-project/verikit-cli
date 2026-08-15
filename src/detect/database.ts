import { hasDependency, type PackageJson } from "./project.js";

export type Adapter = "prisma" | "drizzle" | null;

export interface DatabaseInfo {
  prisma: boolean;
  drizzle: boolean;
}

export function detectDatabase(pkg: PackageJson): DatabaseInfo {
  return {
    prisma: hasDependency(pkg, "@prisma/client") || hasDependency(pkg, "prisma"),
    drizzle: hasDependency(pkg, "drizzle-orm"),
  };
}
