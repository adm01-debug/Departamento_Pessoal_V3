// V15-490
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
export function generateId() { return Math.random().toString(36).substring(2, 9); }
export function truncate(str: string, length: number) { return str.length > length ? str.substring(0, length) + '...' : str; }
export function capitalize(str: string) { return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(); }
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) { let timeoutId: ReturnType<typeof setTimeout>; return (...args: Parameters<T>) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => fn(...args), delay); }; }
export function formatBytes(bytes: number, decimals = 2) { if (bytes === 0) return '0 Bytes'; const k = 1024; const dm = decimals < 0 ? 0 : decimals; const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]; }
