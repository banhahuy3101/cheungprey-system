const KHMER_MONTHS = [
  "",
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
  "សីហា",
  "កញ្ញា",
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
];

function toKhmerDigits(n) {
  const digits = "០១២៣៤៥៦៧៨៩";
  return String(n).replace(/\d/g, (d) => digits[Number(d)]);
}

function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

export function formatPerformancePeriodLabel(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return "";

  const sm = start.month;
  const em = end.month;
  const syKh = toKhmerDigits(start.year);
  const eyKh = toKhmerDigits(end.year);

  if (sm === 1) {
    let label = `គិតចាប់ពីដើមឆ្នាំ${syKh} ដល់ខែ${KHMER_MONTHS[em]}`;
    if (end.year !== start.year) {
      label += ` ឆ្នាំ${eyKh}`;
    }
    return label;
  }
  if (start.year === end.year) {
    return `គិតចាប់ពីខែ${KHMER_MONTHS[sm]} ដល់ខែ${KHMER_MONTHS[em]} ឆ្នាំ${syKh}`;
  }
  return `គិតចាប់ពីខែ${KHMER_MONTHS[sm]} ឆ្នាំ${syKh} ដល់ខែ${KHMER_MONTHS[em]} ឆ្នាំ${eyKh}`;
}
