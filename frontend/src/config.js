const environment = import.meta.env;

export const appConfig = {
  name: environment.VITE_APP_NAME || 'Institute Billing',
  locale: environment.VITE_LOCALE || 'en-IN',
  currency: environment.VITE_CURRENCY || 'INR',
};

export const paymentMethods = [
  ['CASH', 'Cash'],
  ['BANK_TRANSFER', 'Bank transfer'],
  ['CARD', 'Card'],
  ['UPI', 'UPI'],
  ['CHEQUE', 'Cheque'],
  ['OTHER', 'Other'],
];
