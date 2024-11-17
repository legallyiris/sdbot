import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Config, UnsplashConfig } from "./types/Config";

const configPath = join(process.cwd(), "config.json");
const configFile = readFileSync(configPath, "utf-8");
const config = JSON.parse(configFile) as Config;

function validateConfig(config: Config): asserts config is Config {
  const requiredFields: (keyof Config)[] = [
    "token",
    "developer",
    "unsplash",
    "databasePath",
    "logChannel",
    "images",
    "rblx",
  ];

  for (const field of requiredFields) {
    if (!(field in config)) {
      throw new Error(`Missing required config field: ${field}`);
    }
  }

  if (!config.unsplash || typeof config.unsplash !== "object") {
    throw new Error("unsplash configuration is missing or invalid");
  }

  const requiredUnsplashFields: (keyof UnsplashConfig)[] = [
    "accessKey",
    "secretKey",
    "id",
  ];
  for (const field of requiredUnsplashFields) {
    if (!(field in config.unsplash)) {
      throw new Error(`Missing required unsplash config field: ${field}`);
    }
  }
}

validateConfig(config);

export default config;
