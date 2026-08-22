# FINAL v29.6 — QP OPEN / RENDER FIX

แก้สาเหตุที่กด ADMIN -> QP แล้วเปิดไม่ได้

สาเหตุจริง:
1. `ADMIN-QP.widths` ใน exact_forms.json เป็น object
   แต่ Exact Form Engine เรียก `form.widths.map(...)`
   ทำให้ JavaScript error ตอนเปิดฟอร์ม
2. row-render loop มี conditional ซ้ำจาก patch ก่อนหน้า
3. title map ไม่มี ADMIN-QP

แก้แล้ว:
- widths ของ ADMIN-QP เปลี่ยนเป็น array เหมือน exact form อื่น
- renderer รองรับทั้ง width array และ object เพื่อป้องกันพังอีก
- เอา duplicate ingredient-row conditional ออก
- title map เพิ่ม ADMIN-QP
- QP เปิดผ่าน `openExactForm('ADMIN-QP')`
- ADMIN-QP ไม่ผ่าน popup จำนวนสารของสูตร
- คงรายละเอียดต้นฉบับ QP จาก v29.4

# FINAL v29.4 — ADMIN-QP METADATA FIX

แก้ปัญหา:
`ADMIN-QP — undefined`

สาเหตุ:
Exact Form Engine เปิด ADMIN-QP ได้แล้ว แต่ metadata ชื่อ/คำอธิบายฟอร์มไม่ครบ
ทำให้ renderer นำค่า undefined ไปต่อท้าย form code

แก้:
- title = ADMIN-QP
- display_name = Quotation / Purchase Order
- description = แบบฟอร์มใบเสนอราคา / ใบสั่งซื้อ — ADMIN
- subtitle / department / form_code ครบ
- เพิ่ม fallback exactFormDisplayName()
- ถ้าฟอร์มอื่น metadata ไม่ครบก็ไม่แสดง undefined

# FINAL v29.3 — QP FULL ORIGINAL DETAILS

ยังใช้ Exact Form Engine แบบเดียวกับ F-RD-002 / F-RD-002.1
ไม่ได้สร้าง HTML form ใหม่

เพิ่มรายละเอียดที่พบในไฟล์ต้นฉบับ QP:
- บริษัท ไลฟ์ พลัส ฟาร์มาซูติคอล (ประเทศไทย) จำกัด
- ที่อยู่ 89/3, 89/4, 89/5 หมู่ 9 ... โทร. 02-105-4436 / www.lifepluspharma.com
- วันที่ / Ref. No. / Job Code / Sales Executive
- นามผู้ซื้อ / โทรศัพท์-แฟกซ์ / Administration Officer / Quotation-Purchase Order
- Address / ชื่อสินค้า / เลขที่สูตร
- ตาราง No. / Desciption / Ingredients / Quantity (Mg.) / Quantity / Unit / Unit Price / Amount (Bath)
- Inactive Ingredient
- รวมปริมาณ / ยอดหลังหักส่วนลด / มูลค่ารวม / VAT 7% / Grand Total
- งวดที่ 1 (50%) / งวดที่ 2 (50%)
- สูตร / วิธีรับประทาน / รายละเอียดบรรจุภัณฑ์ / ชิ้น-กล่อง / ราคาต่อซอง
- วิธีการชำระเงิน
- เงื่อนไขการโอนเงิน
- ไม่รวมค่าขนส่งต่างจังหวัด
- เงื่อนไขดอกเบี้ยยอดค้างชำระ
- เงื่อนไขกรรมสิทธิ์สินค้า
- เจ้าหน้าที่ผู้เสนอราคา / วันที่

Calculation:
- Amount = Quantity × Unit Price
- Total Quantity = SUM Quantity
- Subtotal = SUM Amount
- After Discount = Subtotal (จนกว่าผู้ใช้ override)
- VAT = After Discount × 7%
- Grand Total = After Discount + VAT
- Installment 1 = Grand Total × 50%
- Installment 2 = Grand Total × 50%

# FINAL v29.2 — QP ORIGINAL EXACT FORM

- ADMIN-QP ใช้ Exact Form Engine แบบเดียวกับสูตร/สูตรผลิต
- ไม่ใช้ HTML ฟอร์ม QP ที่สร้างใหม่
- ใช้ไฟล์ต้นฉบับล่าสุดเป็น ADMIN-QP-SOURCE.xls
- เลขที่สูตรอยู่ใน toolbar เท่านั้นเพื่อ link F-RD-002 โดยไม่แก้ layout ตัวฟอร์ม
- ดึง Active + Inactive Ingredient และ quantity mg ลงแถวเดิม
- Auto Calculate Amount/Grand Total แต่แก้เองได้
- Save/Edit/List/Export ใช้ Source Form Record เดียวกัน

# FINAL v29.1 — QP LINK BY FORMULA NUMBER

เพิ่มการเชื่อมข้อมูลระหว่าง ADMIN-QP และ F-RD-002 สูตร

Key:
- ใช้ `เลขที่สูตร / formula_no` เป็นตัวเชื่อม

การทำงาน:
1. เข้า ADMIN -> QP / Quotation
2. กรอกเลขที่สูตร
3. ระบบค้นหา F-RD-002 ที่ formula_no ตรงกัน
4. ดึงทั้ง:
   - สารสกัดสำคัญ (ingredients)
   - ส่วนประกอบไม่สำคัญ (inactive_ingredients)
5. ลิงก์เข้า QP:
   - ประเภท ACTIVE / INACTIVE
   - ชื่อสาร
   - รหัสสาร
   - ปริมาณ mg
   - หน่วย
   - ราคาอ้างอิง ถ้ามี
6. customer / product name เติมจากสูตรถ้าช่อง QP ยังว่าง
7. ทุกค่าที่ลิงก์มายังแก้เองได้
8. กด “ดึงข้อมูลสูตร” เพื่อบังคับ refresh ได้

Backend endpoint:
`GET /api/source-forms/formula-link/{formula_no}`

# FINAL v29 — ADMIN QP FORM

เพิ่มฟอร์ม QP ในแผนก ADMIN โดยใช้ไฟล์ QP 6901-0038 ที่ผู้ใช้ส่งมาเป็นต้นแบบอ้างอิง

- Customer ค้นหาและลิงก์เบอร์โทรจากฐานข้อมูลลูกค้า
- Ingredients ค้นหา/dropdown จากฐาน supplement codes
- Auto Fill ชื่อสาร / รหัส / หน่วย / ราคาอ้างอิงเท่าที่มี
- ทุกช่องที่ Auto Fill ยังแก้เองได้
- Amount = Quantity × Unit Price อัตโนมัติ แต่ override ได้
- Grand Total = SUM Amount อัตโนมัติ แต่ override ได้
- เพิ่ม/ลบแถวรายการได้
- บันทึก แก้ไข ดูรายการ และ Export Excel ได้
- ดาวน์โหลดต้นฉบับ .xls ได้
- เปลี่ยนชื่อต้นฉบับเป็น `ADMIN-QP-SOURCE.xls` เพื่อให้ Render clone ได้

# FINAL v28.3 — MAPPING FIX

พบสาเหตุ:
ช่องผลลัพธ์ราคาต่อแถวถูกใช้ชื่อ sub ว่า `price_mg`
ขณะที่ calculation/master workbook จริงช่องนั้นคือ “ราคาต้นทุนของแถว”
จึงเกิด mapping ปนกับ field อื่นและอัปเดตไม่ตรงช่อง

แก้ mapping ชัดเจน:

F-RD-002
- T = quantity_mg
- Z = production_kg
- AD = percent
- AE = price_kg
- AI = row_cost = AE/1,000,000*T

F-RD-002.1
- P = quantity_mg
- V = production_kg
- Z = percent
- AA = price_kg
- AE = row_cost = AA/1,000,000*P

เมื่อเปลี่ยน quantity หรือ price/kg:
1. อัปเดต row_cost ของแถวนั้นทันที
2. แล้วคำนวณ % / production / summary ต่อ

# FINAL v28.2 — LIVE RECALCULATE FIX

แก้ทั้ง F-RD-002 สูตร และ F-RD-002.1 สูตรผลิต

ปัญหา:
ราคาต้นทุนคำนวณถูกตอนกรอกครั้งแรก แต่เมื่อเปลี่ยนปริมาณ ผลลัพธ์ไม่เปลี่ยนตาม

แก้:
- quantity_mg เปลี่ยน -> recalculate ทุกครั้ง
- price_kg เปลี่ยน -> recalculate ทุกครั้ง
- order_quantity เปลี่ยน -> recalculate ทุกครั้ง
- รองรับทั้ง input และ change event
- ช่อง row cost (price_mg ใน UI เดิม) จะไม่ค้าง manualOverride
- row cost จะถูกคำนวณใหม่เสมอด้วย:
  ราคา/kg / 1,000,000 * ปริมาณ mg

ตัวอย่าง:
ราคา 1000, ปริมาณ 500 -> 0.5
เปลี่ยนปริมาณเป็น 600 -> 0.6 ทันที

# FINAL v28.1 — WEB COST FORMULA FIX

แก้การคำนวณบนหน้าเว็บโดยตรง ทั้งสูตรและสูตรผลิต

สูตร:
ราคาต้นทุนสาร = ราคา/kg / 1,000,000 * ปริมาณ mg

JavaScript:
rowCost = priceKg / 1000000 * qty

ตัวอย่าง:
ราคา = 1000
ปริมาณ = 500
ผลลัพธ์ = 1000 / 1000000 * 500 = 0.5

เมื่อแก้ช่องปริมาณหรือราคา/kg หน้าเว็บจะ recalculate ทันที

# FINAL v28 — CALCULATION MASTER

ใช้ไฟล์ `original_forms/CALCULATION_MASTER.xlsx` ที่ผู้ใช้ส่งมาเป็นต้นแบบการคำนวณ

F-RD-002 สูตร:
- ปริมาณใช้ผลิต = ปริมาณ mg × จำนวนสั่งผลิต ÷ 1,000,000
- % = ปริมาณ mg × 100 ÷ Total
- ราคาต่อแถว = ราคา/kg ÷ 1,000,000 × ปริมาณ mg
- Ingredient subtotal
- Inactive Ingredient subtotal
- Total = Ingredient + Inactive Ingredient
- ปริมาณส่วนผสม/หน่วย = Total
- ปริมาณที่ใช้ผลิต = Total production
- ราคาต้นทุนส่วนผสม/หน่วย = SUM(row costs) × 120
- รวมต้นทุน = จำนวนสั่งผลิต × ราคาต้นทุน/หน่วย
- รวมราคาขาย = จำนวนสั่งผลิต × ราคาขาย/หน่วย
- กำไร/หน่วย = ราคาขาย/หน่วย - ราคาต้นทุน/หน่วย
- รวมกำไร = รวมขาย - รวมต้นทุน

Excel row formula ตัวอย่าง:
=SUM(AE16/1000000*T16)

F-RD-002.1 สูตรผลิต:
- ใช้หลัก quantity / production / percent / row-cost เดียวกัน
- แก้ capacity ตามไฟล์จริงเป็น 12 แถว (16-27)
- คง calculation เฉพาะ packaging/tester ของสูตรผลิต

ช่วง SUM และตำแหน่ง summary จะขยับตามจำนวนสารที่เพิ่มจริง

# FINAL v27.8 — EXACT EXCEL FORMULA FIX

แก้สูตรในไฟล์ Excel Export โดยตรง

F-RD-002:
=SUM(AE16/1000000*T16)
แถวถัดไปใช้เลขแถวตามจริง เช่น
=SUM(AE17/1000000*T17)

F-RD-002.1 ใช้หลักเดียวกันตามคอลัมน์ของสูตรผลิต:
=SUM(AA16/1000000*P16)

# FINAL v27.7 — COST × QUANTITY FIX

แก้ทั้งสูตรและสูตรผลิต:
ราคาต่อ mg = ราคา/kg ÷ 1,000,000
ราคาต้นทุนสาร = ราคาต่อ mg × ปริมาณที่ใช้ (mg)

ตัวอย่าง:
calculatedPricePerMg = AE16 / 1000000
rowCost = calculatedPricePerMg * T16

Excel: =(AE16/1000000)*T16

# FINAL v27.6 — MERGEDCELL EXPORT FIX

แก้ error:
`AttributeError: 'MergedCell' object attribute 'value' is read-only`

สาเหตุ:
ตอนเพิ่มแถวสารและ Export Excel มีการเขียน/คัดลอกไปยัง child cell
ของ merged range ซึ่ง openpyxl ไม่อนุญาตให้แก้ `.value`

แก้แล้ว:
- put() ตรวจ MergedCell และย้ายการเขียนไป top-left ของ merge
- copy row style ข้าม merged child cells
- ก่อน insert rows เก็บ merge ranges เดิมและ unmerge เฉพาะส่วนที่ได้รับผลกระทบ
- หลัง insert สร้าง merge pattern ของแถวสารใหม่
- merge ของตารางด้านล่างถูกสร้างคืนหลังเลื่อนแถว
- ใช้กับทั้ง F-RD-002 สูตร และ F-RD-002.1 สูตรผลิต
- คง Save / AI Feedback / Dynamic Rows / Person ownership เดิม

# FINAL v27.5 — FOREIGN KEY SAVE FIX

พบสาเหตุ Save 500 ที่สำคัญ:
`SourceFormRecord.workspace_user_id` เป็น ForeignKey ไปที่ `form_workspace_users.id`
แต่ v27.4 ใส่ `u.id` ซึ่งเป็น id จากตาราง `users`

บน PostgreSQL จึงเกิด ForeignKeyViolation ตอน db.flush() และ Save ล้มทันที

แก้:
- `created_by = u.id` ใช้เป็น owner ของบัญชี Login
- `owner_person_key` ใช้แยกแผนก/คนที่ 1–4
- `workspace_user_id = NULL` ไม่ใส่ users.id ผิดตาราง
- List/Get/Update/Export ตรวจ `created_by + owner_person_key`
- ครอบ db.flush() ด้วย error handler เพื่อให้เห็น DB error จริง
- เพิ่ม diagnostics endpoint `/api/source-forms/diagnostics/source-form-schema`
- cache bust v27.5

# FINAL v27.4 — INTERNAL SERVER ERROR FIX

สาเหตุของ Save 500 ใน v27.3:
1. source_forms.save() ใช้ `person_key` แต่ endpoint ไม่ได้รับ parameter นี้
   ทำให้เกิด NameError ตอนสร้าง SourceFormRecord
2. PostgreSQL เดิมบน Render อาจสร้าง source_form_records ก่อนมี
   `owner_person_key` และ create_all() ไม่เพิ่มคอลัมน์ให้ตารางเดิม

แก้แล้ว:
- Save / List / Get / Update รับ `person_key` จาก X-Person-Key
- Save เก็บ owner_person_key ถูกต้อง
- เพิ่ม migration สำหรับ PostgreSQL:
  ADD COLUMN IF NOT EXISTS owner_person_key VARCHAR(40)
- รองรับ SQLite เดิมด้วย
- Save/Update rollback และคืน error detail หาก database มีปัญหา
- /login-check แสดง FINAL-v27.4-internal-server-fix
- static cache bust v27.4
- คง AI Feedback / Dynamic Rows / Save-Export logic เดิม

# FINAL v27.3 — RESPONSE BODY STREAM FIX

แก้ error:
Failed to execute 'text' on 'Response': body stream already read

สาเหตุ:
ฟังก์ชัน api() เดิมเรียก response.json() ก่อน และเมื่อ parse ไม่สำเร็จไปเรียก response.text()
ซึ่ง Response body อ่านได้เพียงครั้งเดียว

แก้:
- อ่าน response.text() เพียงครั้งเดียว
- ถ้าเป็น JSON จึง JSON.parse จาก string ที่อ่านมา
- Error จาก Backend แสดง detail ได้ตามปกติ
- ไม่อ่าน body ซ้ำ
- คง Save/Export/person key/AI Feedback จาก v27.2 ทั้งหมด

# FINAL v27.2 — SAVE + EXPORT FIXED

แก้จาก v27.1:
- บันทึก Record ผูก owner_person_key ตั้งแต่ครั้งแรก
- List/Get/Update/Export ใช้ person_key เดียวกัน
- แก้ person_key undefined ใน GET/PUT record
- Export ส่ง X-Person-Key จาก Browser
- Export Excel สร้างเป็น .xlsx ใน memory
- ชื่อไฟล์ download ปลอดภัย
- error Save/Export แสดงบนหน้าเว็บ
- คง AI Feedback Learning และชื่อไฟล์สั้นทั้งหมด

# FINAL v27 — AI FEEDBACK LEARNING

เพิ่มระบบเรียนรู้จากคอมเมนต์ R&D ทั้ง F-RD-002 สูตร และ F-RD-002.1 สูตรผลิต

- หลัง AI เสนอสูตร จะมีช่อง “คอมเมนต์สอน AI” ต่อท้ายสารทุกตัว
- เว้นว่าง = ถือว่าสารนั้นถูกต้องในบริบทนั้น
- มีคอมเมนต์ = ถือว่าเป็น Negative Feedback พร้อมเหตุผล
- Feedback เก็บลง PostgreSQL/SQLite ตาราง `formula_ai_feedback`
- เก็บ Product Type / Concept / Requirement / Code / Name / เหตุผลที่ AI เสนอ / ผลผ่านหรือไม่ / Comment
- AI ครั้งถัดไปจะได้รับ Feedback ที่เกี่ยวข้องกับบริบทเป็นตัวอย่าง
- Local-assisted fallback ก็ใช้ Feedback ปรับคะแนน: สารที่ผ่านมีคะแนนเพิ่ม สารที่ถูกปฏิเสธในบริบทใกล้เคียงมีคะแนนลด
- กด “นำสารที่ AI เลือกใส่ฟอร์ม” ระบบจะบันทึก Feedback ก่อนอัตโนมัติถ้ายังไม่ได้กดบันทึกเอง
- ไม่มีการให้ AI กำหนด dose/mg อัตโนมัติ; R&D/QA ยังเป็นผู้กรอกและตรวจ

# FINAL v26 — SAVE + EXPORT FIXED

แก้ทั้ง F-RD-002 สูตร และ F-RD-002.1 สูตรผลิต

- บันทึก Record ได้ทั้ง Record ใหม่และ Record เดิม
- Dynamic ingredient rows ทั้งหมดถูกเก็บลง payload
- Inactive ingredients ถูกเก็บลง payload
- Manual Excel cells ถูกเก็บครบ
- ปุ่ม Export จะ Save ข้อมูลล่าสุดก่อน แล้วค่อยสร้าง Excel
- รองรับ X-Person-Key / owner ของแต่ละคน
- Export รองรับจำนวนสารเกิน template และเลื่อนตำแหน่ง manual cells ตามแถวที่ insert
- เพิ่มข้อความ Error ชัดเจนถ้า Save/Export ไม่สำเร็จ
- cache bust เป็น v26

# FINAL v25 — Inactive Dropdown + Cost Formula Fix

แก้พร้อมกันทั้ง F-RD-002 สูตร และ F-RD-002.1 สูตรผลิต

- ส่วนประกอบไม่สำคัญค้นหา/เลือกแบบ dropdown ได้เหมือนสารสกัด
- เลือกรหัสหรือชื่อแล้วลิงก์ Name / Code / Supplier / Import / Price / Halal
- ข้อมูล Auto Fill ยังแก้เองได้
- ปริมาณของส่วนประกอบไม่สำคัญกรอกเองได้

สูตรต้นทุนต่อหน่วย/ต่อ ml:
ราคา/kg ÷ 1,000,000 × ปริมาณ mg

ตัวอย่างแถว 16:
=AE16/1000000*T16

รวมราคาต้นทุนส่วนผสม = SUM ต้นทุนทุกแถว

# FINAL v24 — FORMULA PRODUCTION ROWS FIXED

แก้พร้อมกันโดยอ้าง logic เดียวกันสำหรับ:
- F-RD-002 สูตร
- F-RD-002.1 สูตรผลิต

จุดที่แก้:
- สูตรผลิตใช้จำนวนสารที่กรอกจริงเหมือนสูตร
- ถ้ากรอกน้อยกว่าแถวเดิม ซ่อนแถวส่วนเกิน
- ถ้ากรอกมากกว่าแถวเดิม ต่อแถวเพิ่มทันทีหลังแถวสารสุดท้าย
- dynamic row map ของสูตรผลิตแก้ให้ตรงกับคอลัมน์ของ F-RD-002.1
- แสดงจำนวนสารที่เลือกในหัวฟอร์มเพื่อเช็กได้ทันที
- จำนวนสารของสูตรและสูตรผลิตเก็บแยกกัน
- เปิด Record เดิมแล้วคืนจำนวนแถวตาม ingredient_count เดิม
- คง AI Formula Draft, Auto Fill, Auto Calculate และ editable override ไว้ครบ

# FINAL v23 — AI FORMULA DRAFT

เพิ่ม AI คิดสูตรร่างพร้อมกันทั้ง F-RD-002 สูตร และ F-RD-002.1 สูตรผลิต

- ปุ่ม `AI คิดสูตร` อยู่ใน toolbar ของทั้งสองฟอร์ม
- AI อ่านชื่อสินค้า, Product Type, Concept/Objective, Requirement ลูกค้า, Target price และหมายเหตุ
- เลือกสารจาก `supplement_codes.json` ที่มีอยู่จริงในระบบเท่านั้น
- Auto Fill Code / Name / Supplier / Import / Price / Halal ลงฟอร์มได้
- ปริมาณ mg ไม่ถูก AI กำหนดอัตโนมัติ ให้ R&D/QA กรอกและตรวจเอง
- ถ้ามี `OPENAI_API_KEY` จะใช้ OpenAI Responses API; ถ้าไม่มีจะใช้ local-assisted matching เป็น fallback
- Default model: `gpt-5.6-luna` (แก้ได้ด้วย `OPENAI_MODEL`)
- ห้าม commit API key ลง GitHub; ตั้งค่าใน Render Environment เท่านั้น

# FINAL v22 — RESTORE V17 TABLES + DYNAMIC EXCEL ROWS

ฐานไฟล์ใช้ v17 ที่ผู้ใช้แนบมา เพื่อคืนตารางที่เคยมีทั้งหมด

แก้พร้อมกันทั้ง F-RD-002 สูตร และ F-RD-002.1 สูตรผลิต:
- คืนตาราง/ส่วนล่างทั้งหมดจาก v17
- เอาออกเฉพาะตาราง helper ด้านบนที่ไม่ใช่ฟอร์ม Excel
- แก้บั๊กช่องปริมาณ (mg) ที่ถูก virtual unit field ทับ ทำให้พิมพ์ไม่ได้
- ปริมาณ mg และช่องข้อมูลหลักทุกแถวพิมพ์ได้
- ช่องคำนวณอัตโนมัติยังแก้ทับเองได้
- Supplier / Import / Code / Price / Halal ที่ลิงก์ได้จะเติมอัตโนมัติ แต่แก้เองได้
- ช่องว่างที่อยู่ในตาราง Excel (มี border/fill) เปิดให้พิมพ์ได้
- จำนวนสารไม่จำกัด
- ถ้าเลือกน้อยกว่าแถวเดิม จะแสดงเฉพาะจำนวนที่เลือก
- ถ้าเลือกมากกว่าแถวเดิม แถวใหม่จะต่อทันทีหลังแถวสารสุดท้าย ก่อนตารางถัดไป
- Export Excel จะแทรกแถวเพิ่มและเลื่อนตารางด้านล่างลง

# FINAL v17 — Formula Auto Calculation

F-RD-002 ปรับใหม่:
- ปริมาณ (mg) พิมพ์ได้
- จำนวนผลิตพิมพ์ได้
- ราคา/kg พิมพ์ได้ และลิงก์จากฐานรหัสสารเมื่อมีข้อมูล
- ปริมาณที่ใช้ผลิต (kg) = ปริมาณ mg × จำนวนผลิต / 1,000,000
- ร้อยละ = ปริมาณของรายการ / ปริมาณรวมทั้งหมด × 100
- ต้นทุนสารต่อหน่วย = ราคา/kg × ปริมาณ mg / 1,000,000
- Supplier / Import / รหัสสาร / Halal ลิงก์อัตโนมัติจากฐานรหัสสาร
- รวมปริมาณ, รวมปริมาณผลิต, รวมต้นทุนส่วนผสม คำนวณอัตโนมัติ
- ราคาขาย/หน่วย (K48) เป็นช่องให้พิมพ์เอง
- รวมราคาขาย = ราคาขาย/หน่วย × จำนวนผลิต
- กำไร/หน่วย และรวมกำไร คำนวณอัตโนมัติ
- ช่องสีเขียวคือค่าที่คำนวณอัตโนมัติ

Render: `DATABASE_URL` ตั้งเป็น `sync: false` เพื่อไม่บังคับ Internal URL; ใส่ External URL ที่ใช้งานผ่านอยู่ใน Render Environment ได้โดยตรง.

# FINAL v16 — GitHub + Render + Domain Ready

เพิ่มไฟล์:
- `render.yaml`
- `.python-version`
- `.gitignore`
- `DEPLOY_GITHUB_RENDER.md`

Production ใช้ Render PostgreSQL ผ่าน `DATABASE_URL`
และ start command รองรับ `$PORT` ของ Render

# FINAL v15 — 4 PEOPLE + PERSONAL PIN PER DEPARTMENT

Flow ใหม่:
1. Login Username/Password
2. เลือกแผนก
3. ใส่รหัสแผนก
4. เลือก คนที่ 1 / 2 / 3 / 4
5. ใส่รหัสส่วนตัวของคนนั้น
6. เข้าใช้งานและเห็นเฉพาะฟอร์มของคนนั้น

ตัวอย่าง RD:
รหัสแผนก RD = 1201
คนที่ 1 = 211
คนที่ 2 = 212
คนที่ 3 = 213
คนที่ 4 = 214

ตัวอย่าง SALE:
รหัสแผนก SALE = 1203
คนที่ 1 = 231
คนที่ 2 = 232
คนที่ 3 = 233
คนที่ 4 = 234

ดูทั้งหมดได้ใน PERSON_CODES.txt

Source Form Records ถูกผูกกับ `department-person`
ดังนั้น RD คนที่ 1 ไม่เห็นข้อมูล RD คนที่ 2–4 และไม่เห็นข้อมูลคนของแผนกอื่น

# FINAL v14 — DEPARTMENT PIN

เพิ่มรหัสอีกชั้นตอนกดเข้าแต่ละแผนก

ขั้นตอน:
1. Login ด้วยบัญชีของแต่ละคน เช่น rd1 / rd11234
2. กดเลือกแผนก
3. ระบบถาม “รหัสแผนก”
4. ใส่รหัสถูกต้องจึงเข้าแผนกได้

รหัส:
RD 1201
ADMIN 1202
SALE 1203
JOB 1204
PLANNING 1205
STOCK 1206
PURCHASE 1207
PRODUCTION 1208
GRAPHIC 1209
QC 1210
QUALITY 1211
CEO 1212

การตรวจรหัสทำที่ Backend `/api/department-access/verify`
ไม่ใช่ตรวจเฉพาะ JavaScript หน้าเว็บ

# FINAL v13.1 — OPEN FIXED

แก้ปัญหา Login ผ่าน `/api/ui/me` 200 OK แต่หน้าเว็บเปิดไม่ได้

สาเหตุ:
Frontend ยังเรียก `adminNav` จาก UI เวอร์ชันเก่า แต่ Department Portal เวอร์ชันใหม่ไม่มี element นี้แล้ว
จึงเกิด JavaScript error หลัง Login สำเร็จ

แก้แล้ว:
- adminNav เป็น null-safe
- Bootstrap ไม่ลบ token ทันทีเมื่อเกิด UI error
- เพิ่มข้อความ error หน้า Login หาก frontend render มีปัญหา
- login-check แสดง build `FINAL-v13.1-open-fixed`

วิธีใช้:
1. ปิด Server เก่าด้วย Ctrl+C
2. แตก ZIP นี้เป็นโฟลเดอร์ใหม่
3. ดับเบิลคลิก START_WINDOWS.bat
4. เปิด http://127.0.0.1:8000/login-check
5. ต้องเห็น FINAL-v13.1-open-fixed
6. เข้า http://127.0.0.1:8000

ทดสอบ:
rd1 / rd11234
admin / admin1234

# FINAL v13 — 4 USERS PER DEPARTMENT

แต่ละแผนกมีผู้ใช้ 4 คน และแต่ละบัญชีเป็นเจ้าของข้อมูลฟอร์มของตัวเองโดยตรง
ไม่ต้องเลือก “คนที่ 1–4” และใส่ PIN ซ้ำหลัง Login อีกแล้ว

รูปแบบบัญชี:
- RD: rd1/rd11234, rd2/rd21234, rd3/rd31234, rd4/rd41234
- ADMIN: admin1/admin11234 ... admin4/admin41234
- SALE: sale1/sale11234 ... sale4/sale41234
- JOB: job1/job11234 ... job4/job41234
- PLANNING: planning1/planning11234 ... planning4/planning41234
- STOCK: stock1/stock11234 ... stock4/stock41234
- PURCHASE: purchase1/purchase11234 ... purchase4/purchase41234
- PRODUCTION: production1/production11234 ... production4/production41234
- GRAPHIC: graphic1/graphic11234 ... graphic4/graphic41234
- QC: qc1/qc11234 ... qc4/qc41234
- QUALITY: quality1/quality11234 ... quality4/quality41234
- CEO: ceo1/ceo11234 ... ceo4/ceo41234

ADMIN หลักยังใช้ admin/admin1234

ความเป็นส่วนตัว:
Source Form Records ใช้ user id ของบัญชีที่ Login เป็นเจ้าของ
ดังนั้น rd1 จะไม่เห็น/แก้/Export ฟอร์มของ rd2, rd3, rd4

Windows:
ดับเบิลคลิก START_WINDOWS.bat
สคริปต์นี้ไม่ใช้ Activate.ps1 จึงไม่ติด Execution Policy

# FINAL v12.2 — LOGIN GUARANTEED

แก้ Login แบบไม่พึ่งฐานข้อมูลเดิม:
เมื่อกรอกบัญชีแผนกและ Password ที่กำหนด ระบบจะตรวจบัญชีโดยตรง และสร้าง/ซ่อมบัญชีใน Database ให้อัตโนมัติ

วิธีง่ายที่สุดบน Windows:
ดับเบิลคลิก `START_WINDOWS.bat`

จากนั้นเช็ก:
http://127.0.0.1:8000/login-check

ต้องเห็น:
`"build": "FINAL-v12.2-login-guaranteed"`

แล้วเข้า:
admin / admin1234

บัญชีแผนก:
rd / rd1234
admin / admin1234
sale / sale1234
job / job1234
planning / planning1234
stock / stock1234
purchase / purchase1234
production / production1234
graphic / graphic1234
qc / qc1234
quality / quality1234
ceo / ceo1234

# LOGIN FIX v12.1
บัญชี 12 แผนกจะถูกตรวจและสร้าง/รีเซ็ตอัตโนมัติทุกครั้งที่ Server เริ่มทำงาน จึงใช้ฐานข้อมูลเดิมได้

rd / rd1234
admin / admin1234
sale / sale1234
job / job1234
planning / planning1234
stock / stock1234
purchase / purchase1234
production / production1234
graphic / graphic1234
qc / qc1234
quality / quality1234
ceo / ceo1234

หลังแตกไฟล์ ให้ปิด Uvicorn เดิมด้วย Ctrl+C แล้วเปิดเวอร์ชันนี้ใหม่

# FINAL v11 — Department Portal

หลัง Login มีหน้าเลือกแผนก:
RD, ADMIN, SALE, JOB, PLANNING, STOCK, PURCHASE, PRODUCTION, GRAPHIC, QC, QUALITY, CEO

- RD: F-RD-002 สูตร, F-RD-002.1 สูตรผลิต, F-RD-003 Tester, F-RD-004 Rate
- SALE: F-RD-001 รายละเอียดผลิตภัณฑ์ตามความต้องการของลูกค้า
- ADMIN: Users/Audit, Original Forms, Customer Database
- PLANNING: Production/MRP
- STOCK: Inventory/Raw Materials
- PURCHASE: Suppliers/Stock Requirement
- PRODUCTION: สูตรผลิต + Production/MRP
- QUALITY: Registration/FDA
- QC/JOB/GRAPHIC: หน้าเตรียมไว้และขึ้น “ให้ใส่ Data”
- CEO: Executive Dashboard, AI Insights, Department Overview

ระบบ 4 คน + PIN และการแยกข้อมูลของแต่ละคนในฟอร์มยังคงอยู่

# FINAL v10 — Lower Formula Section Fully Editable

แก้ตามภาพล่าสุด:
- F-RD-002 ส่วน Inactive Ingredient พิมพ์เองได้ทุกคอลัมน์
- ปริมาณส่วนผสม / ปริมาณใช้ผลิต พิมพ์เองได้
- ราคาต้นทุน / ราคาขาย / กำไร และยอดรวม พิมพ์เองได้
- ตารางเรทราคาแต่ละบรรทัดพิมพ์เองได้
- กล่องหมายเหตุพิมพ์เองได้
- ชื่อผู้ลงชื่อพิมพ์เองได้
- การตักโปรตีน/คอลลาเจน, สีแคปซูล, ต้นทุนส่งตรวจ และการรับประทานต่อวันพิมพ์เองได้
- F-RD-002.1 ส่วนต้นทุน/กำไร/Tester, เรทราคา, ลงชื่อ และหมายเหตุพิมพ์เองได้
- ค่าที่กรอกถูก Save ใน Record ของผู้ใช้คนนั้น และ Export กลับลงเซลล์เดิมของ Excel ต้นฉบับ

ช่องที่แก้ได้ในส่วนนี้จะแสดงพื้นสีเหลืองอ่อนและกรอบสีส้มเพื่อให้เห็นชัด

# FINAL v9 — Complete Requested Workflow

เพิ่ม/แก้ตาม Requirement ล่าสุด:
- F-RD-001: Customer ที่พิมพ์ในฟอร์มถูกเพิ่ม/อัปเดตเข้า Customer Database อัตโนมัติ
- ก่อนเข้าฟอร์มต้องเลือกคนที่ 1–4 และใส่ PIN
- คนแต่ละคนเห็น/แก้ไข/Export ได้เฉพาะฟอร์มของตัวเอง
- สามารถเปิดฟอร์มของตัวเองกลับมาแก้ไขและ Save ทับ Record เดิมได้
- รหัสสารเดียวกันเก็บ “ชื่อสารสกัด” + “ชื่ออีกชื่อ” ได้
- F-RD-002 และ F-RD-002.1 เพิ่มช่องหน่วยของสารแต่ละรายการ
- ช่อง “ประเภทผลิตภัณฑ์” ในสูตรเป็นช่องพิมพ์เอง
- วันที่ในสูตรตั้งเป็นวันที่ปัจจุบันอัตโนมัติ
- เลือกรหัสสารหรือชื่อสารจากฐาน 5,517 records แล้วลิงก์ Code / Supplier / Import / Price / Halal อัตโนมัติ
- ช่องอื่นในสูตรเป็นช่องพิมพ์เอง
- ลงชื่อ / เรทราคา / หมายเหตุ เป็นช่องพิมพ์เองและ Export กลับ Excel ต้นฉบับ
- Order Unit เป็นช่องพิมพ์เอง

PIN เริ่มต้น:
1 = 1111
2 = 2222
3 = 3333
4 = 4444

ควรเปลี่ยน PIN ก่อนใช้งานจริง

# FINAL v8 — Private 4-Person Form Workspaces

เพิ่มตาม Requirement ล่าสุด:

- เมื่อกดเข้า F-RD Form จะให้เลือก **คนที่ 1 / 2 / 3 / 4**
- ต้องใส่ PIN ก่อนเข้าใช้งาน
- PIN เริ่มต้น:
  - คนที่ 1 = `1111`
  - คนที่ 2 = `2222`
  - คนที่ 3 = `3333`
  - คนที่ 4 = `4444`
- Source Form ทุก record มีเจ้าของ
- Backend กรอง record ตามเจ้าของจริง ไม่ใช่แค่ซ่อนบนหน้าเว็บ
- คนหนึ่งไม่สามารถ List / Open / Export Excel ของอีกคนผ่าน Source Form API ได้
- ข้อมูล Customer ที่กรอกใน **F-RD-001** ถูกเพิ่ม/อัปเดตเข้า `customers` database อัตโนมัติ
- เพิ่มฐาน `supplement_aliases`
- รหัสสารเดียวกันเก็บได้ทั้ง **ชื่อสารสกัด** และ **ชื่ออีกชื่อ**
- F-RD-002 และ F-RD-002.1 มีตารางเสริม “ชื่อสารสกัดเพิ่มเติม” ผูกตามรหัสสาร
- ฟอร์ม Excel ต้นฉบับยังคงเป็นตัวหลักเหมือน FINAL v7

> ก่อนใช้จริงควรเปลี่ยน PIN ทั้ง 4 คน

# FINAL v7 — Excel Exact Web Forms

ฟอร์ม F-RD ทั้ง 5 ตัวบนเว็บสร้างจากโครงสร้างของ Excel ต้นฉบับจริง:
- merged cells
- column width / row height
- fill, font, border, alignment
- ข้อความเดิมในเอกสาร

เปลี่ยนเฉพาะเซลล์ข้อมูลเป็นช่องกรอกบนเว็บ โดย:
- รหัสสารและชื่อสารสกัดค้นหาได้จากฐานรหัสอาหารเสริม
- Supplier พิมพ์ค้นหาได้แบบ dropdown
- ประเภทผลิตภัณฑ์ / Tester / Halal ใช้ dropdown
- ตัวเลขใช้ numeric input
- วันที่ใช้ date input

หลังบันทึกสามารถ Export Excel ต้นฉบับที่เติมข้อมูลแล้วผ่านรายการที่บันทึกได้

# FINAL v6.1 — Navigation Fix

แก้เมนู F-RD-001 ถึง F-RD-004 ให้เปิด Source Form จริงโดยตรง และแก้ Refresh ให้คงอยู่ใน Source Form ปัจจุบัน

# FINAL v6 — Exact Source Form Export

ใช้ F-RD-001, F-RD-002, F-RD-002.1, F-RD-003, F-RD-004 เป็นเอกสารแม่แบบจริง

Flow ที่ถูกต้อง:
1. เข้าเมนู F-RD ที่ต้องการ
2. กรอกข้อมูลตามช่องในเอกสารต้นฉบับ
3. กด บันทึกตามฟอร์มต้นฉบับ
4. กด ดาวน์โหลด Excel ต้นฉบับที่กรอกแล้ว
5. ระบบเปิดไฟล์ Excel ต้นฉบับและเติมข้อมูลลงใน template เดิม โดยไม่ export เป็นตาราง ERP รวม

ปุ่ม Export All เดิมไม่ใช่การ export แบบฟอร์มและไม่ควรใช้สำหรับงานเอกสาร F-RD

## Department login accounts

| Department | Username | Password |
|---|---|---|
| RD | rd | rd1234 |
| ADMIN | admin | admin1234 |
| SALE | sale | sale1234 |
| JOB | job | job1234 |
| PLANNING | planning | planning1234 |
| STOCK | stock | stock1234 |
| PURCHASE | purchase | purchase1234 |
| PRODUCTION | production | production1234 |
| GRAPHIC | graphic | graphic1234 |
| QC | qc | qc1234 |
| QUALITY | quality | quality1234 |
| CEO | ceo | ceo1234 |

ADMIN and CEO can enter every department. Normal department accounts see only their own department in the portal.
