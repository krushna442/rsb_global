import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getISTDate(date = new Date()) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffset);
  return istTime.toISOString().split("T")[0];
}

/**
 * Returns the "Working Date" based on a 6 AM shift start.
 * If current time is < 6 AM IST, it returns the previous calendar day.
 */
export function getWorkingDate(date = new Date()) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffset);
  const hours = istTime.getUTCHours();
  if (hours < 6) {
    istTime.setUTCDate(istTime.getUTCDate() - 1);
  }
  return istTime.toISOString().split("T")[0];
}

