"""
Importer scaffold สำหรับนำ Excel เดิมเข้าระบบ
รองรับ .xls/.xlsx ผ่าน python-calamine

ตัวอย่าง:
    python scripts/import_excel_notes.py "F-RD-002 สูตร.xlsx"

หมายเหตุ:
ไฟล์เดิมเป็นแบบฟอร์มที่มี merged cells จำนวนมาก จึงไม่ควร import แบบ
'ทุก cell = database column' โดยตรง ควร map field ตาม workflow ก่อน.
"""
import sys
from python_calamine import CalamineWorkbook

if len(sys.argv)<2:
    raise SystemExit("usage: python scripts/import_excel_notes.py <file.xls/xlsx>")

wb=CalamineWorkbook.from_path(sys.argv[1])
for name in wb.sheet_names:
    sheet=wb.get_sheet_by_name(name)
    print("\n#",name)
    for row in sheet.to_python():
        vals=[str(v).strip() for v in row if v not in (None,"")]
        if vals:
            print(" | ".join(vals))
