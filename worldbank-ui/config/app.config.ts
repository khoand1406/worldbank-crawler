/**
 * Shared application configuration values.
 *
 * The client-side UI uses NEXT_PUBLIC_* env variables so values are
 * available during frontend build/runtime.
 */
export class AppConfig {
  static readonly DEFAULT_API_BASE_URL = "http://localhost:8080";

  static readonly API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? AppConfig.DEFAULT_API_BASE_URL;

  static get apiBaseUrl(): string {
    return AppConfig.API_BASE_URL;
  }

  static get env(): string {
    return process.env.NODE_ENV ?? "development";
  }

  static get isDevelopment(): boolean {
    return AppConfig.env === "development";
  }
}
