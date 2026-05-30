import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shorten a wallet address to `0x1234…abcd` format.
 * Returns null when addr is empty/null/undefined.
 */
export function shortAddress(addr: string | null | undefined): string | null {
  if (!addr) return null;
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * Derive the best display label for a wallet user.
 * Priority: displayName → shortened walletAddress → username.
 */
export function userDisplayLabel(user: {
  displayName?: string | null;
  walletAddress?: string | null;
  username?: string | null;
} | null | undefined): string {
  if (!user) return '';
  if (user.displayName) return user.displayName;
  const short = shortAddress(user.walletAddress);
  if (short) return short;
  return user.username ?? '';
}

/**
 * Derive avatar initials from a display label.
 * Strips the leading `0x` before taking the first two characters.
 */
export function addressInitials(label: string): string {
  const stripped = label.startsWith('0x') ? label.slice(2) : label;
  return (stripped.slice(0, 2).toUpperCase()) || '??';
}
