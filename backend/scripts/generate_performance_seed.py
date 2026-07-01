#!/usr/bin/env python3
"""Generate performance seed SQL from the government Word template."""

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCX = ROOT / "template/ទិន្នន័យ_ឬព័ត៌មានលទ្ធផលនៃការអនុវត្ត_គិតចាប់ពីដើមឆ្នាំ២០២២_ដល់ខែមិថុនា copy.docx"
OUT = ROOT / "backend/migrations/010_seed_all_performance_from_template.sql"

ROMAN_ORDER = ["I", "II", "III", "IV", "V", "VI", "VII"]
SKIP_LINES = {
    "មាន",
    "មិនមាន",
    "បាន",
    "មិនបាន",
    "មានមិនមាន",
    "បានមិនបាន",
    "ល្អ",
    "មធ្យម",
    "មិនទាន់បានល្អ",
}
UNIT_EN = {
    "នាក់": "people",
    "ករណី": "cases",
    "ភាគរយ(%)": "%",
    "%": "%",
    "វគ្គ": "sessions",
    "កម្មវិធី": "programs",
    "គម្រោង": "projects",
    "កន្លែង": "places",
    "ខ្សែ": "lines",
    "គីឡូម៉ែត្រ": "km",
    "ម៉ែត្រ": "m",
    "សេវា": "services",
    "ដង": "times",
    "សហគមន៍": "communities",
    "សហគ្រាស": "enterprises",
    "ផ្សារ": "markets",
    "គ្រួសារ": "households",
    "កសិដ្ឋាន": "farms",
    "រៀល": "riel",
    "សាលាមត្តេយ្យសហគមន៍": "community-preschools",
    "មាន / មិនមាន": "Yes / No",
    "បាន / មិនបាន": "Yes / No",
    "គ្រប់គ្រាន់ / មិនគ្រប់គ្រាន់ / គ្មាន": "Enough / Not enough / None",
}


def sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def para_text(paragraph) -> str:
    return "".join(
        node.text or ""
        for node in paragraph.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
    ).strip()


def kh2ar(text: str) -> str:
    return text.translate(str.maketrans("០១២៣៤៥៦៧៨៩", "0123456789"))


def is_skip_line(line: str) -> bool:
    compact = line.replace("\u00a0", " ").replace(" ", "")
    if compact in SKIP_LINES:
        return True
    if compact.startswith("មាន") and len(compact) <= 12:
        return True
    if compact.startswith("បាន") and len(compact) <= 12:
        return True
    if "គ្រប់គ្រាន់" in line and len(line) < 40:
        return True
    return False


def parse_docx(path: Path) -> list[dict]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))

    lines = [
        para_text(paragraph)
        for paragraph in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p")
    ]
    lines = [line for line in lines if line and line not in ("សូចនាករ",)]

    domain_re = re.compile(r"^(I{1,3}|IV|V|VI|VII)\.\s+(.+)$")
    sub_re = re.compile(r"^([0-9]+\.[0-9]+)\.?\s+(.+)$")
    ind_re = re.compile(r"^([0-9]+|[០-៩]+)\.\s+(.+)$")
    unit_re = re.compile(r"^ចំនួន\s*(.+)$")

    domains: list[dict] = []
    current_domain = None
    current_sub = None
    current_ind = None

    for line in lines:
        if line.startswith("ទិន្នន័យ"):
            continue

        domain_match = domain_re.match(line)
        if domain_match:
            current_domain = {
                "code": domain_match.group(1),
                "name_kh": domain_match.group(2).strip(),
                "sub_domains": [],
            }
            domains.append(current_domain)
            current_sub = None
            current_ind = None
            continue

        if not current_domain:
            continue

        if is_skip_line(line):
            continue

        normalized = kh2ar(line)
        sub_match = sub_re.match(normalized)
        if sub_match and not ind_re.match(line):
            current_sub = {
                "code": sub_match.group(1),
                "name_kh": sub_match.group(2).strip(),
                "indicators": [],
            }
            current_domain["sub_domains"].append(current_sub)
            current_ind = None
            continue

        ind_match = ind_re.match(line)
        if ind_match and current_sub is not None:
            current_ind = {
                "code": kh2ar(ind_match.group(1)),
                "name_kh": ind_match.group(2).strip(),
                "data_type": None,
                "unit_kh": None,
            }
            current_sub["indicators"].append(current_ind)
            continue

        if current_sub is not None and current_ind is None and not ind_match:
            if unit_re.match(line) or line.startswith("ចំនួន") or "ភាគរយ" in line:
                continue
            if sub_re.match(normalized):
                continue
            code = str(len(current_sub["indicators"]) + 1)
            current_sub["indicators"].append(
                {"code": code, "name_kh": line, "data_type": None, "unit_kh": None}
            )
            current_ind = current_sub["indicators"][-1]
            continue

        if current_ind is not None:
            if line.startswith("ជ្រើសរើស"):
                if "គ្រប់គ្រាន់" in line:
                    current_ind["data_type"] = "binary"
                    current_ind["unit_kh"] = "គ្រប់គ្រាន់ / មិនគ្រប់គ្រាន់ / គ្មាន"
                else:
                    current_ind["data_type"] = "binary"
                    current_ind["unit_kh"] = "មាន / មិនមាន"
                current_ind = None
                continue

            unit_match = unit_re.match(line)
            if unit_match:
                unit = unit_match.group(1).strip()
                if "ភាគរយ" in unit or "%" in unit:
                    current_ind["data_type"] = "percentage"
                    current_ind["unit_kh"] = "ភាគរយ(%)"
                else:
                    current_ind["data_type"] = "number"
                    current_ind["unit_kh"] = unit.split()[0]
                current_ind = None
                continue

            if "ភាគរយ" in line:
                current_ind["data_type"] = "percentage"
                current_ind["unit_kh"] = "ភាគរយ(%)"
                current_ind = None

    for index, domain in enumerate(domains):
        domain["sort_order"] = ROMAN_ORDER.index(domain["code"]) + 1
        domain["name_en"] = f"{domain['code']}. {domain['name_kh'][:120]}"
        for sub_index, sub in enumerate(domain["sub_domains"], 1):
            sub["sort_order"] = sub_index
            for ind_index, indicator in enumerate(sub["indicators"], 1):
                indicator["sort_order"] = int(indicator["code"]) if indicator["code"].isdigit() else ind_index
                if indicator["data_type"] is None:
                    if "ភាគរយ" in indicator["name_kh"]:
                        indicator["data_type"] = "percentage"
                        indicator["unit_kh"] = "ភាគរយ(%)"
                    elif any(
                        token in indicator["name_kh"]
                        for token in ("ឃុំ សង្កាត់", "ក្រុមប្រឹក្សា", "បាន", "មាន")
                    ):
                        indicator["data_type"] = "binary"
                        indicator["unit_kh"] = "បាន / មិនបាន" if "បាន" in indicator["name_kh"] else "មាន / មិនមាន"
                    else:
                        indicator["data_type"] = "number"
                        indicator["unit_kh"] = indicator["unit_kh"] or "ចំនួន"
                indicator["unit_en"] = UNIT_EN.get(indicator["unit_kh"], indicator["unit_kh"])

    for domain in domains:
        if domain["code"] == "III":
            for sub in domain["sub_domains"]:
                if sub["code"] == "3.7" and not sub["indicators"]:
                    sub["indicators"] = [
                        {
                            "code": "1",
                            "name_kh": "ភាគរយនៃភូមិក្នុងឃុំ សង្កាត់នីមួយៗមានអគ្គិសនីប្រើប្រាស់ពេញលេញ",
                            "data_type": "percentage",
                            "unit_kh": "ភាគរយ(%)",
                            "unit_en": "%",
                            "sort_order": 1,
                        }
                    ]
        if domain["code"] == "V":
            for sub in domain["sub_domains"]:
                if sub["code"] == "5.1" and not sub["indicators"]:
                    sub["indicators"] = [
                        {
                            "code": "1",
                            "name_kh": "ឃុំ សង្កាត់បានអនុវត្តសកម្មភាព និងផ្តល់សេវាថែទាំកុមារដែលមានពិការភាព គ្មានទីពឹង និងក្រុមកុមារងាយរងគ្រោះផ្សេងៗទៀត",
                            "data_type": "binary",
                            "unit_kh": "បាន / មិនបាន",
                            "unit_en": "Yes / No",
                            "sort_order": 1,
                        }
                    ]
        if domain["code"] == "II":
            for sub in domain["sub_domains"]:
                if sub["code"] == "2.1":
                    for indicator in sub["indicators"]:
                        if indicator["code"] in {"3", "6"}:
                            indicator["data_type"] = "number"
                            indicator["unit_kh"] = "ករណី"
                            indicator["unit_en"] = "cases"

    return domains


def generate_sql(domains: list[dict]) -> str:
    parts = [
        "-- Migration: Seed all performance domains/sub-domains/indicators from government template",
        "-- Generated by backend/scripts/generate_performance_seed.py",
        "",
        "-- 1) Upsert domains",
    ]

    for domain in domains:
        parts.append(
            f"""INSERT INTO performance_domains (id, code, name_kh, name_en, sort_order)
VALUES (gen_random_uuid(), {sql_str(domain['code'])}, {sql_str(domain['name_kh'])}, {sql_str(domain['name_en'])}, {domain['sort_order']})
ON CONFLICT (code) DO UPDATE SET name_kh = EXCLUDED.name_kh, name_en = EXCLUDED.name_en, sort_order = EXCLUDED.sort_order;"""
        )

    parts.extend(
        [
            "",
            "-- 2) Move misplaced sub-domains from Domain I to II and III",
            """UPDATE performance_sub_domains sd
SET domain_id = d2.id
FROM performance_domains d1, performance_domains d2
WHERE sd.domain_id = d1.id AND d1.code = 'I' AND d2.code = 'II'
  AND sd.code IN ('2.1', '2.2');""",
            """UPDATE performance_sub_domains sd
SET domain_id = d3.id
FROM performance_domains d1, performance_domains d3
WHERE sd.domain_id = d1.id AND d1.code = 'I' AND d3.code = 'III'
  AND sd.code ~ '^3\\.';""",
            "",
            "-- 3) Upsert sub-domains",
        ]
    )

    for domain in domains:
        for sub in domain["sub_domains"]:
            kh_name = sub["name_kh"]
            if not kh_name.startswith(sub["code"]):
                kh_name = f"{sub['code']} {kh_name}"
            parts.append(
                f"""INSERT INTO performance_sub_domains (id, domain_id, code, name_kh, name_en, sort_order)
SELECT gen_random_uuid(), dom.id, {sql_str(sub['code'])}, {sql_str(kh_name)}, {sql_str(sub['code'] + ' ' + sub['name_kh'][:80])}, {sub['sort_order']}
FROM performance_domains dom WHERE dom.code = {sql_str(domain['code'])}
ON CONFLICT (domain_id, code) DO UPDATE SET name_kh = EXCLUDED.name_kh, name_en = EXCLUDED.name_en, sort_order = EXCLUDED.sort_order;"""
            )

    parts.append("\n-- 4) Upsert indicators")
    for domain in domains:
        for sub in domain["sub_domains"]:
            if not sub["indicators"]:
                continue
            values = []
            for indicator in sub["indicators"]:
                values.append(
                    f"({sql_str(indicator['code'])}, {sql_str(indicator['name_kh'])}, NULL, "
                    f"{sql_str(indicator['data_type'])}, {sql_str(indicator['unit_kh'])}, "
                    f"{sql_str(indicator.get('unit_en'))}, {indicator['sort_order']})"
                )
            parts.append(
                f"""INSERT INTO performance_indicators (id, sub_domain_id, code, name_kh, name_en, data_type, unit_kh, unit_en, sort_order)
SELECT gen_random_uuid(), sd.id, v.code, v.name_kh, v.name_en, v.data_type::indicator_data_type, v.unit_kh, v.unit_en, v.sort_order
FROM performance_sub_domains sd
JOIN performance_domains dom ON dom.id = sd.domain_id AND dom.code = {sql_str(domain['code'])}
CROSS JOIN (VALUES
  {",\n  ".join(values)}
) AS v(code, name_kh, name_en, data_type, unit_kh, unit_en, sort_order)
WHERE sd.code = {sql_str(sub['code'])}
ON CONFLICT (sub_domain_id, code) DO UPDATE SET
  name_kh = EXCLUDED.name_kh,
  data_type = EXCLUDED.data_type,
  unit_kh = EXCLUDED.unit_kh,
  unit_en = EXCLUDED.unit_en,
  sort_order = EXCLUDED.sort_order;"""
            )

    return "\n\n".join(parts) + "\n"


def main() -> None:
    domains = parse_docx(DOCX)
    sql = generate_sql(domains)
    OUT.write_text(sql, encoding="utf-8")
    total_indicators = sum(len(sub["indicators"]) for domain in domains for sub in domain["sub_domains"])
    print(f"Wrote {OUT}")
    print(f"Domains: {len(domains)}, indicators: {total_indicators}")


if __name__ == "__main__":
    main()
