export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export const MIN_DEPOSIT_USD = 25;
export const PRESET_AMOUNTS = [25, 50, 100, 250] as const;
export type PresetAmount = (typeof PRESET_AMOUNTS)[number];
