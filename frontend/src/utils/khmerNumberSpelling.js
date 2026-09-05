/**
 * Khmer Number & Currency Spell-Out Utility
 * Converts numbers into Khmer written words (e.g. 566,063 USD -> ប្រាំរយហុកសិបប្រាំមួយពាន់ហុកសិបបី ដុល្លារ)
 */

const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

const ONES = ['', 'មួយ', 'ពីរ', 'បី', 'បួន', 'ប្រាំ', 'ប្រាំមួយ', 'ប្រាំពីរ', 'ប្រាំបី', 'ប្រាំបួន'];
const TENS = ['', 'ដប់', 'ម្ភៃ', 'សាមសិប', 'សែសិប', 'ហាសិប', 'ហុកសិប', 'ចិតសិប', 'ប៉ែតសិប', 'កៅសិប'];

export function toKhmerDigits(num) {
  if (num === null || num === undefined || isNaN(Number(num))) return '០';
  const parts = Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 }).split('.');
  const intKhmer = parts[0].replace(/[0-9]/g, (d) => KHMER_DIGITS[d]);
  if (parts.length > 1) {
    const decKhmer = parts[1].replace(/[0-9]/g, (d) => KHMER_DIGITS[d]);
    return `${intKhmer}.${decKhmer}`;
  }
  return intKhmer;
}

export function formatKhmerCurrency(amount, currency = 'USD') {
  const digits = toKhmerDigits(amount);
  if (currency === 'USD') {
    return `${digits} ដុល្លារ`;
  }
  return `${digits} រៀល`;
}

function spellThreeDigits(n) {
  let result = '';
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const tens = Math.floor(remainder / 10);
  const ones = remainder % 10;

  if (hundreds > 0) {
    result += ONES[hundreds] + 'រយ';
  }

  if (tens > 0) {
    result += TENS[tens];
  }

  if (ones > 0) {
    result += ONES[ones];
  }

  return result;
}

export function numberToKhmerWords(num, currency = '') {
  if (num === null || num === undefined || isNaN(Number(num))) return 'សូន្យ';
  const n = Math.abs(Number(num));
  if (n === 0) {
    return currency ? `សូន្យ ${currency === 'USD' ? 'ដុល្លារ' : 'រៀល'}` : 'សូន្យ';
  }

  const intPart = Math.floor(n);
  const decPart = Math.round((n - intPart) * 100);

  let result = '';

  const billions = Math.floor(intPart / 1_000_000_000);
  const millions = Math.floor((intPart % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((intPart % 1_000_000) / 1_000);
  const hundreds = intPart % 1_000;

  if (billions > 0) {
    result += spellThreeDigits(billions) + 'ពាន់លាន';
  }
  if (millions > 0) {
    result += spellThreeDigits(millions) + 'លាន';
  }
  if (thousands > 0) {
    result += spellThreeDigits(thousands) + 'ពាន់';
  }
  if (hundreds > 0) {
    result += spellThreeDigits(hundreds);
  }

  if (currency === 'USD') {
    result += ' ដុល្លារ';
    if (decPart > 0) {
      result += ' និង ' + spellThreeDigits(decPart) + ' សេន';
    }
  } else if (currency === 'KHR') {
    result += ' រៀល';
  }

  return result.trim();
}

const KHMER_MONTHS = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

export function getKhmerSolarDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const day = toKhmerDigits(d.getDate());
  const month = KHMER_MONTHS[d.getMonth()];
  const year = toKhmerDigits(d.getFullYear());
  return `ថ្ងៃទី ${day} ខែ ${month} ឆ្នាំ ${year}`;
}

export function getKhmerLunarHeaderDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const beYear = toKhmerDigits(d.getFullYear() + 543);
  return `ព.ស. ${beYear}`;
}
