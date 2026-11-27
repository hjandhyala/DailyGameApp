import { loadEnvConfig } from "@next/env";

// Load .env* files the same way Next does, for scripts and tools that run outside Next.
loadEnvConfig(process.cwd());
