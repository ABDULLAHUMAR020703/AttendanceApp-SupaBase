/**
 * Shared currency reference for payroll. Salary records store the ISO 4217
 * currency *code* (see `employee_payroll_profiles.currency`), so the UI always
 * binds to `code` and never lets the user type a free-form value.
 */

export const DEFAULT_CURRENCY_CODE = 'PKR';

export const CURRENCIES = [
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'NPR', name: 'Nepalese Rupee' },
  { code: 'AFN', name: 'Afghan Afghani' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'TWD', name: 'New Taiwan Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'ILS', name: 'Israeli New Shekel' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'UGX', name: 'Ugandan Shilling' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'DZD', name: 'Algerian Dinar' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'PEN', name: 'Peruvian Sol' },
];

const CURRENCY_CODES = new Set(CURRENCIES.map((c) => c.code));

/** True when `code` is one of the currencies we offer. */
export function isSupportedCurrency(code) {
  return CURRENCY_CODES.has(code);
}

/** "PKR — Pakistani Rupee" for a known code, or the bare code as a fallback. */
export function currencyLabel(code) {
  const match = CURRENCIES.find((c) => c.code === code);
  return match ? `${match.code} — ${match.name}` : code || '';
}

/**
 * Normalises a stored/incoming value to a supported code, falling back to the
 * app default so the form never shows an empty or invalid currency.
 */
export function resolveCurrency(code) {
  return isSupportedCurrency(code) ? code : DEFAULT_CURRENCY_CODE;
}
