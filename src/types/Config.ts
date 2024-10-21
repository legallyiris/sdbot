export interface UnsplashConfig {
  accessKey: string;
  secretKey: string;
  id: string;
}

export interface Config {
  token: string;
  developer: string;
  unsplash: UnsplashConfig;
  databasePath: string;
  logChannel: string;
}
