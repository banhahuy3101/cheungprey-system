import { lunarDate, solarDate, numeric } from '@kdamdev/khmerformat';

/**
 * Khmer Number & Currency Spell-Out Utility
 * Converts numbers and dates using @kdamdev/khmerformat
 */

export { lunarDate, solarDate, numeric };

export function toKhmerDigits(num, useGrouping = true) {
  if (num === null || num === undefined || num === '') return '០';
  const cleanStr = String(num).replace(/,/g, '').trim();
  if (isNaN(Number(cleanStr))) return '០';
  const n = Number(cleanStr);
  const parts = n.toLocaleString('en-US', { maximumFractionDigits: 2 }).split('.');
  const intStr = parts[0].replace(/,/g, '');
  const intKhmer = numeric(intStr).toKhmer(useGrouping);
  if (parts.length > 1) {
    const decKhmer = numeric(parts[1]).toKhmer(false);
    return `${intKhmer}.${decKhmer}`;
  }
  return intKhmer;
}

export function toKhmerDigitsInText(text) {
  if (text === null || text === undefined) return '';
  const khmerDigitMap = {
    '0': '០', '1': '១', '2': '២', '3': '៣', '4': '៤',
    '5': '៥', '6': '៦', '7': '៧', '8': '៨', '9': '៩',
  };
  return String(text).replace(/[0-9]/g, (d) => khmerDigitMap[d] || d);
}

export function toKhmerYear(year) {
  if (year === null || year === undefined) return '';
  return toKhmerDigits(year, false);
}

export function formatKhmerCurrency(amount, currency = 'USD') {
  const digits = toKhmerDigits(amount);
  if (currency === 'USD') {
    return `${digits} ដុល្លារ`;
  }
  return `${digits} រៀល`;
}

export function numberToKhmerWords(num, currency = '') {
  if (num === null || num === undefined || isNaN(Number(num))) return 'សូន្យ';
  const n = Math.abs(Number(num));
  if (n === 0) {
    return currency ? `សូន្យ ${currency === 'USD' ? 'ដុល្លារ' : 'រៀល'}` : 'សូន្យ';
  }

  const intPart = Math.floor(n);
  const decPart = Math.round((n - intPart) * 100);

  let result = numeric(String(intPart)).toKhmerText();

  if (currency === 'USD') {
    result += ' ដុល្លារ';
    if (decPart > 0) {
      result += ' និង ' + numeric(String(decPart)).toKhmerText() + ' សេន';
    }
  } else if (currency === 'KHR') {
    result += ' រៀល';
  }

  return result.trim();
}

export function getKhmerSolarDate(dateInput) {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    const solar = solarDate(d);
    return `ថ្ងៃទី ${solar.getDay()} ខែ ${solar.getMonth()} ឆ្នាំ ${solar.getYear()}`;
  } catch {
    return 'ថ្ងៃទី..... ខែ......... ឆ្នាំ ២០...';
  }
}

export function getKhmerLunarHeaderDate(dateInput) {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    const lunar = lunarDate(d);
    return `ព.ស. ${lunar.getBeYear()}`;
  } catch {
    return 'ព.ស.';
  }
}

export function getKhmerLunarFullDate(dateInput) {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    const lunar = lunarDate(d);
    return lunar.toString(); // ឧទាហរណ៍ ៖ ថ្ងៃសៅរ៍ ៨ រោច ខែស្រាពណ៍ ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០
  } catch {
    return '';
  }
}
