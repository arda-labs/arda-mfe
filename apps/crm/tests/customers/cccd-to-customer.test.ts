import { describe, expect, test } from "bun:test"
import { defaultValues, type CustomerFormValues } from "../../src/features/customers/schemas"
import { cccdFormPatch, existingFromForm, shouldSetProvince, toVietnameseNameCase } from "../../src/features/customers/utils/cccd-to-customer"
import { CCCD_FIELDS, type CccdFieldName } from "@workspace/document-scan"

const ocr = (over: Partial<Record<CccdFieldName, string>> = {}) =>
  ({
    ...Object.fromEntries(CCCD_FIELDS.map((f) => [f, ""])),
    id_number: "082088123456",
    full_name: "HOÀNG THÙY HUYỀN",
    date_of_birth: "1988-05-26",
    sex: "F",
    residence: "Số 3 Lê Duẩn, Phường Phú Hội, Thành phố Huế",
    issue_date: "2021-07-10",
    issue_place: "CỤC TRƯỞNG CỤC CẢNH SÁT QUẢN LÝ HÀNH CHÍNH VỀ TRẬT TỰ XÃ HỘI",
    expiry_date: "2028-05-26",
    ...over,
  }) as Record<CccdFieldName, string>

describe("toVietnameseNameCase", () => {
  test("title-cases Vietnamese names", () => {
    expect(toVietnameseNameCase("HOÀNG THÙY HUYỀN")).toBe("Hoàng Thùy Huyền")
    expect(toVietnameseNameCase("  đặng   văn  ĐẠT ")).toBe("Đặng Văn Đạt")
  })
})

describe("cccdFormPatch", () => {
  test("maps fields into form space", () => {
    const patch = cccdFormPatch({ values: ocr(), overwrite: new Set(), cardVersion: "can_cuoc_2024" }, { ...defaultValues } as CustomerFormValues)
    expect(patch.identityNo).toBe("082088123456")
    expect(patch.name).toBe("Hoàng Thùy Huyền")
    expect(patch.gender).toBe("Nữ")
    expect(patch.dateOfBirth).toBe("1988-05-26")
    expect(patch.identityIssueDate).toBe("2021-07-10")
    expect(patch.identityExpiryDate).toBe("2028-05-26")
    expect(patch.identityIssuePlace).toBe(ocr().issue_place)
    expect(patch.permanentAddress).toBe(ocr().residence)
    expect(patch.identityType).toBe("Căn cước")
  })

  test("never writes empty OCR values and respects overwrite choices", () => {
    const current = { ...defaultValues, identityNo: "001122334455", name: "" } as CustomerFormValues
    const values = ocr({ expiry_date: "" })
    const kept = cccdFormPatch({ values, overwrite: new Set(), cardVersion: "cccd_chip_2021" }, current)
    expect(kept.identityNo).toBeUndefined()
    expect(kept.identityExpiryDate).toBeUndefined()
    const replaced = cccdFormPatch({ values, overwrite: new Set<CccdFieldName>(["id_number"]), cardVersion: "cccd_chip_2021" }, current)
    expect(replaced.identityNo).toBe("082088123456")
  })
})

describe("existingFromForm", () => {
  test("converts form values to OCR space for comparison", () => {
    const e = existingFromForm({ ...defaultValues, name: "Hoàng Thùy Huyền", gender: "Nữ", identityNo: "082088123456" } as CustomerFormValues)
    expect(e.full_name).toBe("HOÀNG THÙY HUYỀN")
    expect(e.sex).toBe("F")
    expect(e.id_number).toBe("082088123456")
  })
})

describe("shouldSetProvince", () => {
  test("sets when the address was patched", () => {
    expect(shouldSetProvince({ permanentAddress: "x" }, "79")).toBe(true)
  })
  test("sets when not patched but no province chosen", () => {
    expect(shouldSetProvince({}, "")).toBe(true)
  })
  test("keeps the chosen province when the address overwrite was declined", () => {
    expect(shouldSetProvince({}, "79")).toBe(false)
  })
})
