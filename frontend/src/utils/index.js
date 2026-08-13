import { appConfig } from '../config';

export const currency = new Intl.NumberFormat(appConfig.locale, {
  style: 'currency',
  currency: appConfig.currency,
  maximumFractionDigits: 0,
});

export function displayRole(role) {
  return role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'STAFF';
}

export function toCents(value) {
  return Math.round(Number(value) * 100);
}

export function clean(values) {
  const cleaned = { ...values };
  for (const key in cleaned) {
    if (cleaned[key] === '') delete cleaned[key];
  }
  return cleaned;
}
