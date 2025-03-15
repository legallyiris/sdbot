export interface UnsplashConfig {
  accessKey: string;
  secretKey: string;
  id: string;
}

export interface CloudConvertConfig {
  token: string;
  sandbox: boolean;
}

export interface Config {
  token: string;
  developer: string;
  unsplash: UnsplashConfig;
  databasePath: string;
  cloudconvert: CloudConvertConfig;
  logChannel: string;
  images: string[];
  rblx: string;
}
