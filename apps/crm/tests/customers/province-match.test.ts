import { describe, expect, test } from "bun:test"
import { foldVietnamese, matchProvinceCode } from "../../src/features/customers/utils/province-match"

const provinces = [
  { code: "01", name: "Hà Nội" },
  { code: "24", name: "Bắc Ninh" },
  { code: "46", name: "Huế", full_name: "Thành phố Huế" },
  { code: "79", name: "Hồ Chí Minh", full_name: "Thành phố Hồ Chí Minh" },
  { code: "48", name: "Đà Nẵng" },
  { code: "66", name: "Đắk Lắk" },
]

describe("foldVietnamese", () => {
  test("strips marks, đ, prefixes and punctuation", () => {
    expect(foldVietnamese("Tỉnh Bà Rịa - Vũng Tàu")).toBe("ba ria vung tau")
    expect(foldVietnamese("TP. Hồ Chí Minh")).toBe("ho chi minh")
    expect(foldVietnamese("Thành phố Đà Nẵng")).toBe("da nang")
  })
})

describe("matchProvinceCode", () => {
  test("matches the current province name in the last segment", () => {
    expect(matchProvinceCode("Số 1 Tràng Tiền, Phường Hoàn Kiếm, Hà Nội", provinces)).toBe("01")
    expect(matchProvinceCode("Số 9, Phường Phú Hội, Thành phố Huế", provinces)).toBe("46")
  })
  test("maps pre-merger provinces to the merged province", () => {
    expect(matchProvinceCode("Xã Tân Lập, Huyện Lục Ngạn, Bắc Giang", provinces)).toBe("24")
    expect(matchProvinceCode("Phường 1, TP Vũng Tàu, Bà Rịa - Vũng Tàu", provinces)).toBe("79")
    expect(matchProvinceCode("Xã Điện Dương, Thị xã Điện Bàn, Quảng Nam", provinces)).toBe("48")
    expect(matchProvinceCode("Phường Phú Hội, Thành phố Huế, Thừa Thiên Huế", provinces)).toBe("46")
    expect(matchProvinceCode("Xã An Phú, Huyện Tuy An, Phú Yên", provinces)).toBe("66")
  })
  test("returns null when nothing or several match", () => {
    expect(matchProvinceCode("Số 3, Phường X, Atlantis", provinces)).toBeNull()
    expect(matchProvinceCode("", provinces)).toBeNull()
    expect(matchProvinceCode("Hà Nội", [...provinces, { code: "99", name: "Hà Nội" }])).toBeNull()
  })
})
