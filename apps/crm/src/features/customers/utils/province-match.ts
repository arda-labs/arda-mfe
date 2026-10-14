// Province prefill from an address printed on a CCCD. Cards issued before
// 2025-07-01 carry pre-merger provinces; MERGED_INTO maps them to the 34
// provinces of Nghi quyet 202/2025/QH15. Names are ASCII-folded.
const MERGED_INTO: Record<string, string> = {
  "ha giang": "tuyen quang",
  "yen bai": "lao cai",
  "bac kan": "thai nguyen",
  "vinh phuc": "phu tho",
  "hoa binh": "phu tho",
  "bac giang": "bac ninh",
  "thai binh": "hung yen",
  "hai duong": "hai phong",
  "ha nam": "ninh binh",
  "nam dinh": "ninh binh",
  "quang binh": "quang tri",
  "quang nam": "da nang",
  "kon tum": "quang ngai",
  "binh dinh": "gia lai",
  "ninh thuan": "khanh hoa",
  "dak nong": "lam dong",
  "binh thuan": "lam dong",
  "phu yen": "dak lak",
  "binh duong": "ho chi minh",
  "ba ria vung tau": "ho chi minh",
  "binh phuoc": "dong nai",
  "long an": "tay ninh",
  "soc trang": "can tho",
  "hau giang": "can tho",
  "ben tre": "vinh long",
  "tra vinh": "vinh long",
  "tien giang": "dong thap",
  "bac lieu": "ca mau",
  "kien giang": "an giang",
  "thua thien hue": "hue",
}

const PREFIX = /^(tinh|thanh pho|tp)\s+/

export function foldVietnamese(s: string): string {
  const folded = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
  return folded.replace(PREFIX, "").trim()
}

export function matchProvinceCode(
  address: string,
  provinces: { code: string; name: string; full_name?: string }[]
): string | null {
  const segments = address.split(",").map(foldVietnamese).filter(Boolean)
  const last = segments.at(-1)
  if (!last) return null
  const candidates = [last, MERGED_INTO[last]].filter(Boolean) as string[]
  for (const candidate of candidates) {
    const hits = provinces.filter(
      (p) => foldVietnamese(p.name) === candidate || (p.full_name && foldVietnamese(p.full_name) === candidate)
    )
    if (hits.length === 1) return hits[0]!.code
    if (hits.length > 1) return null
  }
  return null
}
