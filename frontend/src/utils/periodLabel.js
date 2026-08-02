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
    const endIsYearEnd = em === 12 && end.day === 31;
    const endPart = endIsYearEnd
      ? `ចុងឆ្នាំ${end.year !== start.year ? eyKh : ""}`
      : `ខែ${KHMER_MONTHS[em]}`;
    let label = `គិតចាប់ពីដើមឆ្នាំ${syKh} ដល់${endPart}`;
    if (end.year !== start.year && !endIsYearEnd) {
      label += ` ឆ្នាំ${eyKh}`;
    }
    return label;
  }
  if (start.year === end.year) {
    const endPart = em === 12 && end.day === 31 ? "ចុងឆ្នាំ" : `ខែ${KHMER_MONTHS[em]}`;
    return `គិតចាប់ពីខែ${KHMER_MONTHS[sm]} ដល់${endPart} ឆ្នាំ${syKh}`;
  }
  const endPart = em === 12 && end.day === 31 ? "ចុងឆ្នាំ" : `ខែ${KHMER_MONTHS[em]}`;
  return `គិតចាប់ពីខែ${KHMER_MONTHS[sm]} ឆ្នាំ${syKh} ដល់${endPart} ឆ្នាំ${eyKh}`;
}
