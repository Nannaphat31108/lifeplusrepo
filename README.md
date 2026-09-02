## v31.52 — new PURCHASE database: บรรจุภัณฑ์ตามประเภท (packaging options catalog)

Third database the user has now asked for under PURCHASE, explicitly "อีก
database นึง" (another, separate one) from both Package Database and
เตรียมระบบ — seeded from a new uploaded workbook with one sheet per
packaging category (สติ๊กเกอร์ / ซองอลูมิเนียม / ม้วนอลูมิเนียม / กล่อง),
each with its own slightly different sub-columns.

- New `PackagingOption` table (`app/api/packaging_options.py`,
  `/api/packaging-options`) + dashboard card "บรรจุภัณฑ์ตามประเภท" in
  PURCHASE. Most fields nullable since only some categories use them
  (pack_qty/purpose only on ซองอลูมิเนียม/กล่อง; rate/packing/yield_qty
  only on ม้วนอลูมิเนียม) — the table/edit-form column set adapts per
  selected category tab instead of showing a wall of blank cells.
  `sample_job` (ตัวอย่างงาน) is always rendered **last**, per the user's
  explicit request to move it there — it's the sheet's "example job this
  price came from" reference, not part of the option's identity.
- Seeded at startup from `app/static/packaging_options_seed.json` (154
  rows across the 4 categories, merge-aware extraction like the เตรียมระบบ
  seed), via the same idempotent match-and-skip `import_*_seed` pattern
  used for the other two catalogs.
- **"เลือกใช้งาน" (select for use)**, the other half of the request: a
  panel above the table where you fill in ใช้สำหรับงาน (job name) +
  จำนวนที่ต้องการ (quantity needed) + หน่วย, then click "เลือกใช้งาน" on
  whichever catalog row matches (the existing search box + category tabs
  already do the "bring up matching ones to choose from" part) — this
  calls `POST /api/packaging-options/{id}/use`, which files a new
  เตรียมระบบ (`PackagingPrepItem`) row: job_name/quantity/unit from what
  you typed, item_name/spec/supplier/cost copied straight from the catalog
  option. Ties the two features together instead of leaving them as
  disconnected lists.
- Verified: curl round-trip (list/categories/create/update/delete, the
  `/use` endpoint filing correctly into เตรียมระบบ with the *requested*
  quantity rather than the catalog's own pricing-tier quantity, 400/401 on
  bad input), then a full real-browser (Playwright) pass — opened the
  card, switched category tabs (columns correctly adapt), ran the
  เลือกใช้งาน flow through the real form and confirmed the created row
  showed up in เตรียมระบบ, zero JS/console errors throughout.

## v31.51 — seed เตรียมระบบ with the user's real data; job_code/job_name now optional

Follow-up to v31.50: the user asked to load their actual "เตรียมระบบ"
tracking spreadsheet (the one all this started from) into the new PURCHASE
feature, not leave it empty.

- Extracted all 336 real packaging-prep rows from the original uploaded
  workbook (merge-aware: continuation rows under a merged ลำดับ/ชื่องาน
  cell inherit their group's value) into
  `app/static/packaging_prep_seed.json`, and added an idempotent
  `import_packaging_prep_seed()` (same match-by-key-and-skip pattern as
  `import_package_catalog`) run at startup — safe to redeploy repeatedly,
  never duplicates or overwrites an operator's hand edits.
- **Discovered mid-import that job_code was too strict**: 178 of the 336
  real rows have no recorded ลำดับ/ชื่องาน grouping at all (older, looser
  entries in the source sheet) — the previous schema required job_code and
  job_name as NOT NULL, which would have meant inventing job codes that
  don't exist. Made both nullable in `PackagingPrepItem`, relaxed the API/
  UI validation to just "at least one of job_code / job_name / item_name /
  spec must be filled in", and `_job_seq_map` now leaves ลำดับ blank for
  rows with no job_code instead of grouping them under a fake `""` key.
  Rows *with* a real ลำดับ from the sheet import using that number as their
  job_code (e.g. `"1"`, `"7"`) as a placeholder — PURCHASE can still
  overwrite it with a real job code once one exists.
- Added a startup schema-migration (`ensure_packaging_prep_schema`,
  Postgres `ALTER COLUMN ... DROP NOT NULL` / SQLite table-recreate) since
  v31.50 had already gone out with the stricter NOT NULL schema.
- Verified: fresh-DB import (336 inserted) then a second startup against
  the same DB (0 inserted, 336 already existed) to confirm idempotency;
  real-browser (Playwright) load of the seeded page — all 336 rows render,
  search/filter works, zero JS/console errors.

## v31.50 — new PURCHASE feature: "เตรียมระบบ" packaging prep list per job

New master-data page under PURCHASE (`app/api/packaging_prep.py`, new
`PackagingPrepItem` table), reachable from a new dashboard card next to
Package Database / FDA Database. Started life as a one-off Excel edit for
a user's own tracking spreadsheet (add "รหัสงาน" after "ลำดับ", "หน่วย"
after "จำนวน", "ราคาขาย" at the end) — the user then asked for the same
thing as a real feature in the app, in PURCHASE.

- Columns: ลำดับ, รหัสงาน (job_code), ชื่องาน (job_name), บรรจุภัณฑ์
  (item_name), สเปค, Supplier, จำนวน, หน่วย, ราคา (cost), ราคาขาย
  (sell_price — plain manual entry, not auto-computed like Package
  Database's cost+20% markup, since that's what was asked for).
- Several rows can share one job_code/job_name — mirrors the source
  spreadsheet's merged ลำดับ/ชื่องาน cells grouping a job's packaging
  lines together. "ลำดับ" is intentionally **not** a stored column: it's
  assigned at read time (`_job_seq_map` in packaging_prep.py) from each
  job_code's first-created row, so it's always gap-free and never needs
  renumbering when rows are added/edited/deleted in any order.
- Reused the existing "Package Database" page pattern verbatim (same
  self-contained render/filter/editor/save/delete shape, same
  `.fda-editor` CSS, ADMIN/PURCHASE-gated writes via `require_roles`,
  soft delete via `is_active`) rather than inventing a new one.
- Added a job_code `<datalist>` in the add/edit form (from a new
  `/api/packaging-prep/jobs` endpoint) that auto-fills ชื่องาน when you
  pick an existing job, so a job's later packaging lines don't require
  retyping its name.
- Verified live: real endpoint round-trip via curl (create/list/update/
  delete, seq numbering across two job groups, 400 on blank job_code, 401
  unauthenticated), then a full real-browser (Playwright) pass through
  the actual UI — opened PURCHASE → เตรียมระบบ card, filled and saved a
  row through the real form, confirmed it round-tripped into the table
  with zero JS/console errors.

## v31.49 — form field sizing pass (+ a real PO/PR layout bug found along the way)

Went through every exact form (F-RD-001/002/002.1/003/004, ADMIN-QP/
INVOICE/JOB) plus PO/PR in a real headless-Chromium render (Playwright,
not jsdom -- jsdom's `getBoundingClientRect()` always returns zeros, so
none of this session's earlier layout work could have caught any of the
below) to find and fix cells that were too narrow (clipped placeholder/
value text) or, per the request, too wide.

- **Found a real, severe bug in PO/PR**: their table's `.excel-input`
  cells inherit `.excel-input`'s shared `position:absolute` rule (written
  for the *other* exact forms' `.excel-sheet`, whose `<td>` has
  `position:relative` to anchor it) — but `.purchase-doc-table`'s `<td>`
  never set that, so every input in the grid anchored to `<body>` instead
  of its own cell: one giant ~viewport-sized box, with all 60 inputs
  stacked on top of each other at the same position. Fixed with
  `.purchase-doc-table .excel-input{position:static}`, which also makes
  its own `width:100%` resolve against the `<td>` again instead of the
  viewport. This is why the PO/PR forms have looked fine in every
  screenshot taken with real data in *this* session (all done via jsdom)
  but would have rendered as a single blue rectangle for an actual user —
  worth a heads-up if anyone saw that and didn't report it.
- **Raised the exact-form column-width floor** from 4 "character" units
  (~29px) to 8 (~58px): the real Excel masters have plenty of columns
  narrower than that, fine on paper (text overflows visually into blank
  neighboring cells) but clipped badly once every column becomes a boxed
  `<input>` that can't overflow its own cell. Fixed most of ADMIN-QP's and
  F-RD-004's narrow fields on its own.
- **Added `applyWideFieldSpans()`**: for specific fields the floor bump
  didn't reach (ADMIN-JOB's header value cells, F-RD-001's two long-text
  fields and its ingredient-name columns), makes that one field span a
  few of the blank columns that already sit empty beside it in the real
  master — the same mechanism a real merged cell already uses, applied
  only when every column it would consume is verified free first (not
  already merged, not another field's cell, no static text of its own) so
  it can never silently swallow a neighboring input. Verified field-by-
  field by screenshotting the rendered grid, not guessed.

## v31.48 — 12-month click-in grid; RD→ADMIN quotation auto-link; QP cost-details tab

Three changes from the same request.

**F-RD-002 "ฟอร์มของฉัน": a 12-month grid instead of every month stacked.**
Opening it now shows a 4×3 grid of Jan–Dec tiles for one year at a time
(‹ prev / next › arrows to change year), each showing how many records were
filed that month; clicking a tile opens that month's record list (with the
existing search box and a "← กลับไปเลือกเดือน" back button). Any record with
no month set still surfaces as its own "ไม่ระบุเดือน" tile so nothing goes
missing from view.

**RD → ADMIN quotation flow, auto-linked.** When RD sends a work handoff
referencing a formula (via the reference-search typeahead from the last
release), the inbox card now shows a "สร้างใบเสนอราคาจากงานนี้" button. It
opens a new ADMIN-QP quotation and pulls in the formula's customer/product/
ingredient data automatically — the same VLOOKUP the QP form's manual box
already did, just triggered from the inbox instead of typed in by hand.
The lookup (`GET /api/source-forms/formula-link/{ref}`) now matches
*either* the formula's own formula_no *or* the record's record_no (a work
handoff's reference carries the latter), so both the manual box and this
new button resolve the same way. Nothing about the pulled-in quotation is
locked — every field stays fully editable, addable, removable, same as
before.

**QP cost-details tab.** ADMIN-QP/ADMIN-INVOICE now have a second tab,
"รายละเอียดต้นทุน", holding a free-form add/remove/edit line-item table
(หมวด / รายละเอียด / จำนวนเงิน, e.g. ค่าแรง, บรรจุภัณฑ์, ค่าขนส่ง — a
`<datalist>` suggests the common ones but any text works). This isn't tied
to a real cell in the QP master — there's no fixed schema for it yet ("a
database to be sent later"), so it's built as flexible rows now, ready for
whatever structure comes later, saved as `cost_details` in the same
record's payload alongside everything else.

## v31.47 — ADMIN-JOB (Job Description / JL) exact form; multi-department + searchable-reference work handoff

Two changes from the same request:

**New exact form: ADMIN-JOB.** Added the real Job Description (JL) form to
the admin exact-form set exactly like ADMIN-QP/ADMIN-INVOICE — same
private-per-person save/list/version-history/Excel-export pipeline, same
pixel-fidelity approach (real fonts/borders/merges/column widths, not a
redesigned form). One difference from ADMIN-QP: the source `.xls` this was
ground-truthed against is a legacy file neither LibreOffice nor openpyxl
can open directly (openpyxl doesn't read `.xls` at all; LibreOffice's
import filter fails on this specific file — confirmed, both `--convert-to
xlsx` and `--convert-to ods` error at the file-load stage). So instead of
converting it, the layout was extracted straight out of the `.xls`'s BIFF
records via `xlrd(formatting_info=True)` — fonts, borders, alignment,
merges, column widths, row heights — and used to build both the
`exact_forms.json`/`exact_fields.json` entries (193 fields: header,
production summary, box-component and active/inactive-ingredient tables,
Design & FDA signoff, signatures) and a fresh `ADMIN-JOB_MASTER.xlsx`
authored with openpyxl for the export path (`load_workbook()+fill()+save()`,
same pattern as F-RD-001/002/002.1/003/004 — no real master bytes exist to
preserve here, unlike ADMIN-QP). Ingredient percentages recalculate live
client-side from each row's qty ÷ the table's total qty, mirroring the
real form's own numbers. The generated master opens and round-trips
cleanly through openpyxl and the real export path was tested end-to-end;
LibreOffice itself could not be gotten to open it in this environment
either (times out / fails at load, inconsistently) so that specific check
is the one thing left unverified against a real Excel/LO render.

**Work handoff ("ส่งงานไปแผนกอื่น"): multi-department + searchable reference.**
- Send to **several departments at once** — checkboxes instead of a single
  dropdown; the backend creates one `WorkHandoff` row per department
  (same as sending individually) in one atomic request.
- The "อ้างอิงเอกสาร" field now **type-ahead searches real record numbers**
  as you type — the caller's own F-RD-*/ADMIN-* records plus any PO/PR
  doc number — via a new `GET /api/work-handoffs/reference-search`
  endpoint, instead of a free-text guess.
- Investigated the "ADMIN doesn't show up as a destination" report: it's
  correct, not a bug — the sender's own department is always excluded from
  the destination list (sending work to yourself is meaningless), and
  whoever tested this was logged in as the ADMIN account itself. Any other
  account sees ADMIN as a normal destination.

## v31.46 — LINE notification for work handoffs

Last of the five follow-up features from the "what should we add next"
recommendation. Every "ส่งงานไปแผนกอื่น" (work handoff) now also fires a
LINE push message, best-effort and non-blocking (`BackgroundTasks` — a
send failure never affects the API response or delays it).

**Uses the LINE Messaging API, not LINE Notify.** LINE discontinued LINE
Notify on 2025-03-31 (no new tokens can be issued for it any more), so
this is built on a LINE Official Account's Messaging API instead. Setup:

1. Create a LINE Official Account (free) at https://manager.line.biz, or
   reuse an existing one.
2. In the LINE Developers Console (https://developers.line.biz), open
   that OA's provider/channel and issue a long-lived **Channel access
   token** under Messaging API settings.
3. Set it on Render (or your `.env` locally) as `LINE_CHANNEL_ACCESS_TOKEN`.
4. That's enough to go live: with no other config, every handoff
   broadcasts to everyone who has added the Official Account as a friend
   (Messaging API's `/broadcast` endpoint). Have everyone who cares about
   handoffs scan the OA's QR code / add-friend link once.
5. Optional: to target one specific LINE group/room instead of
   broadcasting to all friends, set `LINE_TARGET_ID` to that group/room's
   ID (captured from a webhook event on your OA -- this app doesn't run a
   webhook receiver, so that ID has to come from somewhere else, e.g. a
   throwaway script hitting LINE's webhook once).

Both settings are optional and unset by default — until configured, the
send is silently skipped (not an error); handoff creation itself never
depends on the notification succeeding. I don't have a Channel access
token of my own to test against a real LINE account, so this was verified
by mocking the outbound HTTP call: broadcast vs. targeted push selection,
message content, and "network/API failure never breaks handoff creation"
are all covered by an automated test, but the actual LINE-side delivery
hasn't been exercised against a live channel.

## v31.45 — version history for F-RD-* records and PO/PR

Every edit to a saved F-RD-* record or PO/PR now snapshots the state it's
about to overwrite into a new `RecordVersion` table (one table for both
record kinds via a `record_type` discriminator: `source_form` |
`purchase_doc`). Nothing is snapshotted on create — there's no prior state
yet — so the first entry appears after the first edit.

- **"ประวัติ" (history) button** on the F-RD-* record list, the PO/PR list,
  and the PO/PR edit toolbar. Opens a modal listing every past version
  (name/no. at that point, status, who saved it, when), each with "ดูข้อมูล"
  (view the full payload as formatted JSON) and "กู้คืน" (restore) actions.
- **Restoring is itself undoable** — it snapshots the current state before
  overwriting, the same as any other edit, so restoring never loses data.
- New endpoints, mirrored across both record types:
  `GET /api/{source-forms,purchase-docs}/record/{id}/versions` (list),
  `GET .../versions/{version_id}` (one version's full payload),
  `POST .../versions/{version_id}/restore`.
- F-RD-* version endpoints stay scoped to the owning person (same
  `X-Person-Key` check as the rest of that router); PO/PR versions are
  department-shared, same visibility as the documents themselves.

## v31.44 — search/filter, required-field validation, PO/PR Excel export

Three related record-management features, added together:

- **Search box** on ฟอร์มของฉัน (F-RD-* record lists) and the PO/PR list
  pages. Client-side substring filter over record no./owner (or doc
  no./creator/reference); a `.card` section whose rows are all filtered
  out hides itself too, so an empty month/person group doesn't linger.
- **Required-field validation before save**, both client- and
  server-side (the server check is the real guard -- the frontend one is
  just instant feedback for a request that doesn't go through the
  browser): PO needs a supplier (name or code) and at least one item
  line with a description; PR needs at least one item line with a
  material code or description. Saving/updating either without them now
  returns 400 instead of silently persisting an empty document. Exact
  forms (F-RD-*, ADMIN-QP, ...) now confirm before saving a completely
  blank form (`ingredient_count` is template metadata, not user data, so
  it's excluded from the emptiness check).
- **Excel export for PO/PR.** Unlike the other exact forms, PO/PR have
  no source `.xlsx` master (they were built from screenshots of paper
  documents), so this generates a fresh, readable workbook mirroring the
  on-screen layout -- header fields, item table, VAT/grand-total (with a
  Thai baht-text line, `app/core/thai_baht.py`, a Python port of the
  frontend's `thaiBahtText()`), and signature blocks. New
  `GET /api/purchase-docs/record/{id}/excel`; an "Excel" button appears
  in the form toolbar once a PO/PR has been saved.

## v31.43 — keyboard arrow-key navigation in every exact-form grid

Arrow keys now move between cells (like Excel) in F-RD-001, F-RD-002,
F-RD-002.1, F-RD-003, F-RD-004, ADMIN-QP and ADMIN-INVOICE; Enter moves
down a row. One delegated `keydown` listener (not wired per-input) picks
the nearest editable cell in the pressed direction by actual on-screen
position, so it handles merged cells, dynamically-appended ingredient
rows, and irregular column widths the same way real Excel would, without
needing every place that renders an `.excel-input` (`exactInput()`,
`manualInputForCell()`, `formulaAutoInputForCell()`, the dynamic
ingredient-row renderers, ...) to wire it in individually. Read-only/
auto-calculated cells are skipped as destinations. `<select>` elements and
`Enter` inside a `<textarea>` (e.g. the new QP notes field) are left to
their native behavior. The PO/PR forms already had their own simpler
row/col-based nav from when they were built and are unaffected.

## v31.42 — ADMIN-QP: added the missing หมายเหตุ (notes) field

Ground-truthed against a real filled quotation (QP2026080046, from an OEM
contract PDF) that had a substantial notes/remarks section (packaging
spec, discount conditions, per-unit price) with nowhere to go in the
existing form — the master template has no dedicated notes cell at all.
Every other field on that real document (customer, address, phone,
formula reference, line items, discount, VAT, grand total) was already
covered; this was the one genuine gap.

- Added a `notes` field (textarea) at cell B55 — the one row genuinely
  free between the amount-in-words line and the signature block — with
  its row height increased so the textarea has room for multiple lines.
- `fill_admin_qp()` now writes it into the real Excel export too. The
  ADMIN-QP export path only patches cell *values* (to protect the
  master's embedded logo/images), not styles, so the exported cell
  doesn't wrap text automatically — the content is still fully present,
  it just overflows visually into the empty cells beside it like any
  other long unmerged Excel text, same as everywhere else in this master
  that was never designed around long text.

## v31.41 — security/code-quality audit + dead-code cleanup + UX consistency

Requested as a general "plug every hole" pass rather than any single bug
report. **Not a ground-up rewrite** — a live app with real data doesn't
benefit from that; instead, a targeted audit found and fixed concrete
issues, verified each with a real test before merging, same as every other
change in this history.

Security:
- `SECRET_KEY` (signs every auth token) silently fell back to a known
  string, `"change-this-in-production"`, if the environment variable was
  ever unset. Render's `render.yaml` already generates a real one
  (`generateValue: true`), so production was never actually exposed, but
  the app now prints a loud `[SECURITY WARNING]` at startup if it's ever
  running on the insecure default anywhere else.
- CORS allowed a wildcard origin (`*`) together with `allow_credentials:
  True` — a combination that lets any website ride a logged-in user's
  session. This app never uses cookies for auth (Bearer token via
  `Authorization` header only), so `allow_credentials` is now `False`;
  Bearer-token requests are unaffected.
- The FDA + รหัสสาร Database's อย. spec file endpoint reflected the
  uploader's filename and content type straight back into the download
  response unsanitized. Filenames are now stripped of quotes/path
  separators/control characters, and only a small allowlist of real
  content types (PDF, common images, Office docs) is trusted — anything
  else downloads as a generic file instead.
- `POST /api/auth/register` (create employee) accepted any password,
  including an empty one, unlike every other password-setting endpoint —
  now enforces the same 8-character minimum.
- `DELETE /api/purchase-docs/record/{id}` had no role check at all — any
  authenticated employee, in any department, could delete any PO/PR. Now
  restricted to ADMIN/PURCHASE/STOCK.

Dead code (app.js went from ~3640 to ~3370 lines; app.css from 276 to 205):
- An entire early prototype "generic source form" system (`SOURCE_FORMS`,
  `openSourceForm`, `collectSourceData`, `saveSourceForm`, and an early
  `showSourceRecords`) — fully superseded by the current exact-form system
  and unreachable from any live button.
- `openExactFormLegacy` and two `recalculateFormulaBothLegacy1/2`
  functions — superseded copies from earlier iterations, never called.
- A stale duplicate `recalculateAdminQP` — the live one (assigned later)
  already replaced it.
- The matching now-orphaned CSS for all of the above, plus the CSS from
  the department/person PIN modals removed in Phase 0.
- One near-miss caught by testing rather than static analysis: an earlier
  pass in this cleanup deleted `collectExactPayload`'s base implementation,
  not realizing the live version is a *wrapper* around it
  (`collectExactPayloadOriginal = collectExactPayload`) — every jsdom test
  in this repo's history is exactly why that regression got caught before
  merging instead of after.

UX:
- All remaining blocking `alert(...)` error popups (9 call sites) replaced
  with the app's existing non-blocking `toast(...)` pattern, for
  consistency with the other ~70 places already using it.

## v31.40 — Purchase Order (ใบสั่งซื้อ) and Purchase Request (ใบขอซื้อ) forms

Two new forms, built from the real documents (not the exact_forms.json
Excel-cell-grid system every other form uses, since no source .xlsx/.xls
template exists for these two — only screenshots were provided):

- **PO** (PURCHASE → external supplier): header fields (no./date/due
  date/reference PR no./buyer/supplier + a new supplier code field with a
  Suppliers-master datalist/contact/phone), a line-item table (qty × unit
  price → amount, auto), auto subtotal / 7% VAT / grand total, and an
  automatic Thai amount-in-words line ("(...บาทถ้วน)"), plus buyer/approver
  signature fields.
- **PR** (STOCK → PURCHASE): header fields (form no./revision/PR
  no./date/time/prepared by/approved by/product-formula reference), a
  line-item table whose material-code column auto-links against the FDA +
  รหัสสาร Database (same catalog used elsewhere) to fill in the description,
  a production-order-no. column backed by a Production Order datalist, and
  5 signature blocks (ผู้ขอซื้อ / จนท.คลังสินค้า / เจ้าหน้าที่จัดซื้อ /
  ผู้ตรวจสอบ (ผจก.แผนก) / ผจก.คลังสินค้า).
- Both tables support Excel-style keyboard navigation (arrow keys move
  between cells, Enter moves down a row).
- Unlike the private F-RD-* forms, PO/PR are **department-shared**
  documents (new `/api/purchase-docs/*` endpoints, no `X-Person-Key`
  scoping) — anyone with PURCHASE/STOCK access sees every PO/PR, the same
  visibility model as Customers/Suppliers elsewhere in this app.
- Column widths were set deliberately (wide description column, narrow
  numeric columns) rather than copied from the screenshots' proportions,
  per the explicit ask to fix uneven columns rather than replicate them.
- Not included: Excel export for these two (no master workbook to export
  into) — saved records are viewable/editable in the browser; printing the
  page is the practical substitute for now.

## v31.39 — cross-department work handoff (ส่งงานหากันได้)

Any department can now send a work item to any other department:
- New `work_handoffs` table + `/api/work-handoffs/*` endpoints: create,
  inbox (received), sent, mark received, mark done, unread count.
- Every department's sidebar has **"งานที่ส่งมา"** (inbox, with an unread
  count badge) and a **"+ ส่งงานไปแผนกอื่น"** button — pick a target
  department, a subject, an optional message, and an optional free-text
  reference (e.g. a form record number or PO number).
- Deliberately generic rather than tied to one specific document type, so
  it works the same way for every department without a bespoke table per
  workflow (existing per-workflow handoffs like Planning → Production are
  untouched).

## v31.35 — real per-employee login, no more department/person PIN

Every department-code / "คนที่ 1-4" PIN table further down this file
(including the `PERSON_CODES.txt` / `DEPARTMENT_CODES.txt` references and the
`/api/department-access/*` endpoints) documents **retired** behavior:

- `app/api/department_access.py`, `DEPARTMENT_CODES.txt`, and
  `PERSON_CODES.txt` have been deleted — those were hardcoded department PINs
  (e.g. RD=1201) and hardcoded per-person PINs (e.g. RD คนที่ 1=211) checked
  into the repo as plaintext, the same class of problem as the original
  `LOGIN_ACCOUNTS.txt` issue above.
- Logging in is now with a real employee account (`ADMIN` creates one per
  person under **Users / Audit → Employees**: username, full name,
  department, role, password) — there is no second "enter department PIN"
  step and no "choose คนที่ 1-4 + personal PIN" step after that anymore.
  `User.department` on the account decides which department that person
  lands in.
- Legacy shared accounts (`rd1`..`rd4`, `admin1`..`ceo4`, etc.) still work
  side by side with real employee accounts — nothing about them was deleted
  or force-disabled. An ADMIN can deactivate one once everyone on that
  department has a real named account (Employees → แก้ไข → Inactive).
- Old private form records saved under the previous "คนที่ 1-4" workspace
  system are untouched and still viewable; they are simply not linked to
  any specific new employee account, since they never had one.

## SECURITY FIX — credentials are no longer hardcoded

Every plaintext password/account table below this line (going back through
the FINAL v6–v14 history) documents **retired** behavior and must not be
used as real credentials — the source code that generated them is gone.

What changed:
- `app/api/auth.py` no longer contains a hardcoded username→password map,
  and the app no longer resets department-account passwords back to fixed
  values on every server start.
- On a brand-new database, the app creates exactly one `admin` account on
  first boot with a random password printed once to the server log. Use it
  to log in, then call `POST /api/auth/change-password` immediately.
- To provision the full set of department accounts (rd1..ceo4), run
  `python scripts/seed.py` — it generates a fresh random password per
  account (printed once) and never overwrites an existing user.
- `POST /api/auth/admin/set-password` lets an ADMIN reset another user's
  password (lost-password recovery).
- `LOGIN_ACCOUNTS.txt` (which held the old plaintext passwords) has been
  deleted from the repo.

If any account below was ever deployed with these documented passwords,
treat those passwords as compromised (this repo was public) and rotate
them via the endpoints above — deleting the file does not undo the earlier
exposure.

## v31.22 RD MASTER FORMULA LIVE FIX
- Fixed F-RD-002 T42/Z42/AD42 and T43/Z43/AD43 to match attached Excel SUM ranges exactly.
- Removed editable overlays from calculated inactive cells.
- Added cache-busting so deployed browser loads the new calculation code.

# FINAL v31.16 — ADMIN QP PACKAGE-PRESERVED EXPORT

- ADMIN-QP export patches only worksheet XML inside the original master XLSX package.
- Embedded logos/images/media/drawings are preserved byte-for-byte.
- Added Pillow to Render dependencies for Excel image compatibility.
- Formula lookup behavior from v31.15 remains unchanged.

# FINAL v31.12 — VARIANT SELECTION REALTIME FIX

Root cause found:
Many supplement records share the same `name` but have different variant codes/prices.
The old datalist used only the ingredient name as its value.
When the user changed selection, `findSupplementByName()` often returned the first
matching record again, so the price looked frozen at the first selection.

Fix:
- ingredient-name datalist values are unique: `NAME || VARIANT_CODE`
- option label shows variant + price + supplier
- exact selected variant is authoritative
- after selection, the visible ingredient-name field returns to just the clean name
- price supports fields: price / price_kg / unit_price / pricePerKg / price_per_kg
- old linked state is cleared before applying a new material
- new price is written and recalculated immediately
- active + inactive, formula + production formula supported

Data inspection:
- supplement records: 5517
- duplicate ingredient names: 617
- examples with multiple variant/price combinations:
[
  [
    "dl alanine",
    [
      [
        "A0275.500",
        "180"
      ],
      [
        "A0275.100",
        "220"
      ],
      [
        "A0275.300",
        "200"
      ],
      [
        "A0275",
        "250"
      ]
    ]
  ],
  [
    "l-theanine",
    [
      [
        "A0229",
        "2400"
      ],
      [
        "A0112",
        "2400"
      ],
      [
        "A0274.25",
        "1850"
      ],
      [
        "A0274",
        "2250"
      ]
    ]
  ],
  [
    "l-glutathione",
    [
      [
        "A0270",
        ""
      ],
      [
        "A0267",
        ""
      ],
      [
        "A0130:10",
        "4900"
      ],
      [
        "A0098:10",
        "6000"
      ],
      [
        "A0235",
        "3500"
      ],
      [
        "A0130",
        "5200"
      ]
    ]
  ],
  [
    "sodium bicarbonate",
    [
      [
        "A0069",
        "44"
      ],
      [
        "A0266",
        ""
      ]
    ]
  ],
  [
    "l-glutathione reduced",
    [
      [
        "A0332",
        "2200"
      ],
      [
        "A0118",
        "6000"
      ],
      [
        "A0136",
        "0"
      ],
      [
        "A0029",
        "1800"
      ],
      [
        "A0265",
        ""
      ]
    ]
  ]
]

Validation:
- Python files: 35
- compile errors: 0
- AST errors: 0
- JavaScript syntax: PASS

# FINAL v31.11 — REALTIME PRICE LINK FIX

แก้ปัญหา:
เปลี่ยนสารแล้วราคา/kg ยังเป็นราคาของสารครั้งแรก

สาเหตุ:
- price_kg บางแถวคง manualOverride/สถานะเดิม
- การเปลี่ยน material ด้วย JavaScript ไม่ได้ทำให้ราคา linked refresh ทุกครั้ง
- variant ที่ชื่อสารซ้ำกันอาจ fallback ไปตัวแรก

แก้:
- ทุกครั้งที่เปลี่ยนสาร ล้าง manualOverride ของ price_kg
- เขียนราคาของ variant ใหม่ลงช่อง price_kg ทันที
- dispatch input/change หลังเขียนราคา
- recalculateFormulaBoth() อ่านค่าจาก DOM ใหม่ทุกครั้ง
- exact variant match ก่อน base-code fallback
- ทำทั้ง ingredients และ inactive_ingredients
- ทำทั้งสูตรและสูตรผลิต

ตัวอย่าง:
เลือก A0001.50 -> ราคา variant A0001.50
เปลี่ยนเป็น A0002.25 -> ช่องราคาเปลี่ยนเป็นราคาของ A0002.25 ทันที
ต้นทุนจะคำนวณใหม่ทันทีโดยไม่ใช้ราคาครั้งแรก

# FINAL v31.10 — BASE CODE DISPLAY FIX

Root cause:
v31.9 added `variant_code` as a hidden exact-field on the SAME Excel cell as
`material_code`. The Exact Form Engine only supports one field per cell, so
the hidden variant field overwrote the visible material-code field.

Fixed:
- removed all virtual/hidden variant fields from exact_fields.json
- material_code is again the only field mapped to the Excel code cell
- variant_code is stored separately in JavaScript state
- selecting A0001.50 keeps variant A0001.50 internally
- visible material_code is A0001
- FDA lookup uses A0001
- price/supplier remain from selected variant A0001.50
- saved payload still includes both `material_code` and `variant_code`
- existing saved records display base code when reopened
- active + inactive ingredients supported in formula + production formula

Expected:
A0001.50 selected
=> visible material_code: A0001
=> internal variant_code: A0001.50
=> FDA lookup key: A0001

Validation:
- all Python files compiled successfully
- all Python files passed AST parsing
- JavaScript syntax passed
- zero variant_code exact-fields remain

# FINAL v31.9 — VARIANT CODE / BASE MATERIAL CODE

แก้กรณีวัตถุดิบเดียวกันมีหลายขนาด/หลายราคา เช่น:
- A0001.50
- A0001.100
- A0001.250

หลักการใหม่:
- variant_code = ใช้แยกขนาด/ราคา เช่น A0001.50
- material_code = รหัสสารหลักที่แสดงในสูตร เช่น A0001
- FDA lookup = ใช้ material_code หลัก A0001
- price / supplier / size = ใช้ variant ที่เลือก

ดังนั้นเลือก A0001.50 แล้ว:
- dropdown/source selection ยังรู้ว่าเลือก A0001.50
- ช่องรหัสสารในสูตรแสดง A0001
- FDA lookup ใช้ A0001
- ราคายังเป็นราคาของ A0001.50
- variant_code ถูกเก็บใน payload เพื่อแก้ record เดิมได้ถูก variant

Validation:
- Python files checked: 35
- Compile errors: 0
- AST errors: 0
- JavaScript syntax: PASS
- Hidden variant fields: 38

Variant test:
A0001.50 {"base_code":"A0001","variant_code":"A0001.50","variant":"50"}
A0001.100 {"base_code":"A0001","variant_code":"A0001.100","variant":"100"}
A001.50 {"base_code":"A0001","variant_code":"A0001.50","variant":"50"}
B123.25 {"base_code":"B0123","variant_code":"B0123.25","variant":"25"}
C0012 {"base_code":"C0012","variant_code":"C0012","variant":""}


# FINAL v31.8 — MATERIAL CODE 4-DIGIT + DATABASE FIX

พบว่ารหัสในบาง source/legacy data ยังเป็น 3 หลัก เช่น A001
ขณะที่ FDA master ใช้รหัสมาตรฐาน 4 หลัก เช่น A0001

แก้ให้ canonical code ทั้งระบบ:
- A1 -> A0001
- A01 -> A0001
- A001 -> A0001
- A0001 -> A0001
- A0001.50 -> A0001
- B123 -> B0123

แก้ทั้ง:
- JavaScript auto-fill
- supplement_codes.json
- fda_seed.json
- fda_codes.json
- FDA API create/update/map
- formula save/export normalization
- existing PostgreSQL FDA records at startup

ถ้า PostgreSQL มี A001 อยู่:
- ถ้า A0001 ยังไม่มี -> rename เป็น A0001
- ถ้า A0001 มีอยู่แล้ว -> merge ข้อมูลที่ขาดแล้วลบ legacy duplicate A001

Database/source inspection:
- FDA seed before fix: {'total': 2722, '4digit': 2722, '3digit': 0, 'other': 0}
- Supplement codes before fix: {'total': 5517, '4digit': 4918, '3digit': 92}
- FDA seed rows changed: 2
- Supplement codes changed: 92

After fix:
- FDA seed 3-digit codes remaining: 0
- Supplement 3-digit codes remaining: 0

Tests:
A001=>A0001
a001=>A0001
A1=>A0001
A01=>A0001
A0001=>A0001
A0001.50=>A0001
B123=>B0123
B0123=>B0123


Validation:
- Python files: 35
- compile errors: 0
- AST errors: 0
- JavaScript syntax: PASS

# FINAL v31.7 — MATERIAL CODE NORMALIZE FIX

Fixed:
- `A0001.50` is now normalized to `A0001`
- price/percentage suffixes can no longer be appended to material_code
- active ingredient autofill normalizes code before assignment
- inactive ingredient autofill normalizes code before assignment
- manually typed material codes are normalized on input/change
- FDA lookup uses the normalized material code
- FDA API create/update normalizes material code
- Excel export defensively normalizes saved material codes

Expected:
- A0001.50 -> A0001
- a0001 -> A0001
- A0001 - 50 -> A0001
- B0123/100 -> B0123

Validation:
- Python files checked: 35
- Compile errors: 0
- AST errors: 0
- JavaScript syntax: PASS

Normalizer test:
A0001.50=>A0001
a0001=>A0001
A0001 - 50=>A0001
B0123/100=>B0123
C9999=>C9999


# FINAL v31.6 — FDA LINK LOGIC FIX

Root cause found:
When selecting an ingredient name, JavaScript filled `material_code` with `.value=...`.
Programmatic value changes do NOT emit browser input/change events.
The FDA listener therefore never ran.

Fixed:
- active ingredient autofill explicitly calls `updateFDAForMaterialCodeInput()`
- inactive ingredient autofill explicitly calls it too
- inactive rows now have real `fda_no` field mappings:
  - F-RD-002: BQ39:BQ41
  - F-RD-002.1: BL34:BL36
- FDA relinks after exact-form DOM rendering at 20ms / 200ms / 600ms
- direct material-code typing still links through input/change listeners
- saved records relink after rendering
- manual FDA override remains possible
- Excel export places inactive FDA values in the correct inactive section

Validation:
- Python files checked: 35
- Python compile errors: 0
- Python AST errors: 0
- JavaScript syntax: PASS
- F-RD-002 inactive FDA mappings: 3
- F-RD-002.1 inactive FDA mappings: 3

Browser diagnostic after deploy:
`await testFDALink("A0001")`
should return `N-0026177`.

# FINAL v31.5 — FDA SCHEMA + SEED FIX

แก้ Render warning:
`StringDataRightTruncation: value too long for type character varying(150)`

Max source lengths detected:
{
  "material_code": 8,
  "supplier_category": 3,
  "product_name": 100,
  "supplier_company": 67,
  "coa": 9,
  "fda_number": 548,
  "registered_name": 159,
  "assay": 130,
  "ratio": 28,
  "percentage": 34,
  "note": 143,
  "image_url": 139
}

Fixes:
- FDA long text fields changed to SQLAlchemy Text
- Existing PostgreSQL fda_materials columns migrated to TEXT at startup
- Migration runs before FDA seed
- FDA seed batches reduced to 100
- If a batch fails, retry row-by-row
- One bad row can no longer block the whole FDA database import
- Existing FDA live-link logic from v31.4 retained

Validation:
- Python files checked: 35
- Compile errors: 0
- AST errors: 0
- JavaScript syntax: PASS

# FINAL v31.4 — FDA LIVE LINK FIXED

แก้ปัญหา FDA Database มีข้อมูลแล้ว แต่ FDA No. ในสูตร/สูตรผลิตไม่ลิงก์ตามรหัสสาร

การทำงานใหม่:
- `/api/fda-materials/map` จาก PostgreSQL เป็น source of truth
- material_code ถูก normalize ก่อนจับคู่
- เปลี่ยน/เลือก `รหัสสาร` -> FDA ของแถวนั้นอัปเดตทันที
- รองรับทั้ง `input` และ `change`
- รองรับทั้ง:
  - F-RD-002 สูตร
  - F-RD-002.1 สูตรผลิต
  - ingredients
  - inactive_ingredients
- หลังเปิดฟอร์ม/โหลด record จะ schedule FDA link หลายจังหวะ ป้องกัน DOM ยังไม่พร้อม
- มี `refreshFormulaFDALink()` สำหรับบังคับโหลด map ใหม่
- ถ้า API DB ใช้ไม่ได้ ยัง fallback ไป static JSON

ตัวอย่างใน seed:
- A0001 -> N-0026177
- A0003 -> N-0022991

Validation:
- Python files checked: 35
- compile errors: 0
- AST errors: 0
- JavaScript syntax: PASS
- F-RD-002 FDA fields: 20
- F-RD-002.1 FDA fields: 18

# FINAL v31.3 — FDA DATABASE SEED FIXED

แก้กรณีหน้า R&D -> FDA Database ขึ้น 0 รายการ

Root causes fixed:
- FDA seed is now executed AFTER `Base.metadata.create_all()`
- seed file path uses `Path(__file__)` so Render working directory cannot break it
- duplicate source rows are merged by material_code
- existing PostgreSQL rows are skipped
- missing rows are inserted in batches of 250
- seed can run safely on every startup
- manual endpoint POST `/api/fda-materials/seed` added
- UI button `นำเข้า FDA Master` added for recovery if database is empty

Seed source:
- raw rows: 2722
- unique material codes after dedupe: 2560

Validation:
- Python files checked: 35
- compile errors: 0
- AST errors: 0
- JavaScript syntax: PASS
- create_all before seed: True

# FINAL v31.2 — R&D FDA DATABASE STABLE

Fixes included:
- Correct auth import for FDA API
- FDA seed is idempotent and safe to run every startup
- Duplicate material codes in `fda_seed.json` are de-duplicated before insert
- Existing PostgreSQL rows are skipped instead of inserted again
- Any FDA seed exception rolls back and is logged, but will NOT crash the ERP startup
- Render can start even if FDA seed has unexpected bad data

Validation performed:
- Python files checked: 35
- Python compile errors: 0
- Python AST parse errors: 0
- JavaScript syntax: PASS
- Duplicate rows detected in raw FDA seed: 162
- Required project files missing: 0

Known Render errors fixed:
1. `ImportError: cannot import name get_current_user`
2. `UniqueViolation: duplicate key value ... material_code`

# FINAL v31 — R&D FDA DATABASE

นำไฟล์ FDA_codes_4digits(2).xlsx มาเป็นฐานข้อมูลจริงในระบบ

ข้อมูลเริ่มต้น: 2722 รายการ

เมนูใหม่:
R&D -> FDA Database

คอลัมน์:
- รหัสวัตถุดิบ
- หมวด Supplier
- Product name
- บริษัท Supplier
- COA
- FDA NUMBER
- ชื่อขึ้นทะเบียน
- สารสำคัญ ASSAY
- อัตราส่วน
- เปอร์เซ็น %
- หมายเหตุ
- รูป / URL

ความสามารถ:
- ค้นหา
- เพิ่มข้อมูล
- แก้ไขข้อมูล
- ลบข้อมูล
- บันทึกลง PostgreSQL/SQLite
- seed ข้อมูลจากไฟล์ FDA อัตโนมัติเมื่อฐานยังว่าง
- ฟอร์มสูตรและสูตรผลิตลิงก์ FDA จาก database นี้โดยตรง
- เมื่อเพิ่ม/แก้ FDA record ใหม่ สูตรสามารถใช้ข้อมูลใหม่ได้ทันที

# FINAL v30.1 — FDA LINK FIXED

แก้ให้ใช้คอลัมน์จริงจาก FDA master:
- A = รหัสวัตถุดิบ
- E = FDA NUMBER
- C = Product name
- D = Supplier

ตัวอย่างที่อ่านได้:
- A0001 -> N-0026177
- A0003 -> N-0022991

ทำงานทั้งสูตรและสูตรผลิต รวมสารสำคัญและไม่สำคัญ
FDA No. เป็นคอลัมน์ท้ายสุด ลิงก์จากรหัสสาร และยังแก้เองได้

# FINAL v30 — FDA LINK

- ใช้รหัสสารจับคู่กับ FDA master
- เพิ่ม FDA No. เป็นคอลัมน์ท้ายสุดของฟอร์มสูตรและสูตรผลิต
- ลิงก์ทั้งสารสำคัญและไม่สำคัญ
- Auto fill แต่แก้เองได้
- Save และ Export Excel เก็บ FDA No.

# FINAL v29.9 — SAVE + AUTO EXCEL

ADMIN-QP:
เมื่อกดปุ่มบันทึก ระบบจะทำอัตโนมัติ:
1. บันทึก Record ลงฐานข้อมูล
2. รับ Record ID
3. สร้าง Excel จาก Record ที่เพิ่งบันทึก
4. ดาวน์โหลดไฟล์ Excel ลงเครื่องทันที

รองรับทั้ง:
- Record ใหม่
- แก้ไข Record เดิมแล้วกดบันทึก
- ใช้ข้อมูลล่าสุดก่อนสร้าง Excel
- ใช้ X-Person-Key เดิมของผู้ใช้งาน

ฟอร์มอื่นยังทำงานเหมือนเดิม ไม่ถูกบังคับให้ดาวน์โหลด Excel อัตโนมัติ

# FINAL v29.8 — ADMIN-QP SAVE FIX

แก้ปัญหา QP เปิดได้แต่บันทึกไม่ได้

- ปุ่ม Save ของ Exact Form เรียก saveExactForm(currentExactForm)
- ADMIN-QP ใช้ collectExactPayload() ตัวเดียวกับสูตร/สูตรผลิต
- เก็บรายการ items จาก data-group=items ตามค่าที่เห็นบนฟอร์มจริง
- เก็บ formula_no จาก toolbar/link control ถ้ามี
- POST /api/source-forms/ADMIN-QP
- PUT /api/source-forms/record/{id}
- ส่ง X-Person-Key ทุกครั้งผ่าน api()
- Record ใหม่เก็บ owner_person_key
- ถ้า backend fail จะแสดง error detail
- หลัง save สำเร็จเก็บ editingSourceRecordId เพื่อแก้ Record เดิมต่อ
- คง Exact Form ต้นฉบับและ QP formula link เดิม

# FINAL v29.7 — QP CLICK FIX

พบสาเหตุจริงที่ทำให้กด QP ไม่ได้:

ใน ADMIN config action ถูกเขียนเป็น:
`openExactForm(\'ADMIN-QP\')`

แต่ action string ถูกนำไปใส่ตรง ๆ ใน:
`onclick="${x[2]}"`

จึงกลายเป็น JavaScript ที่ไม่ถูกต้องใน browser

แก้เป็น:
`openExactForm('ADMIN-QP')`

เพิ่มเติม:
- ADMIN-QP เปิดผ่าน openExactFormAccount() โดยตรง
- ไม่ผ่าน popup จำนวนสารของสูตร
- เพิ่ม window.openAdminQP() เป็น fallback
- คง Exact Form / รายละเอียดต้นฉบับ QP / Formula Link เดิมทั้งหมด

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

# FINAL v31.13 — ADMIN QP REAL MASTER EXACT FORM

- เปลี่ยน ADMIN-QP จากไฟล์จำลอง `ADMIN-QP.xlsx` ไปใช้ `ADMIN-QP_MASTER.xlsx` ที่แปลงจาก `ADMIN-QP-SOURCE.xls` ต้นฉบับจริง
- คง layout / merged cells / fonts / borders / formulas / images / fixed terms ของต้นฉบับ
- ล้างเฉพาะข้อมูลตัวอย่างเดิมออกจาก master ก่อนนำมาใช้สร้างเอกสารใหม่
- Exact Form หน้าเว็บใช้โครงสร้าง cell/merge/width/height จาก master จริง
- Formula link เข้า QP จำกัดข้อมูลเฉพาะ: ชื่อสาร, ปริมาณ (mg), ประเทศที่มา
- ไม่ลิงก์ Material Code / Supplier / Price / Halal / FDA เข้า QP
- ประเทศที่มาแสดงในช่องรายการสารเดียวกับชื่อสาร เพื่อไม่เพิ่มคอลัมน์และไม่เปลี่ยน layout master
- Active Ingredient ใช้ 9 ช่องเดิมของ master และ Inactive Ingredient ใช้ 7 ช่องเดิม
- ตาราง Quotation/Purchase Order ใช้แถว 33-45 เดิมของต้นฉบับ และยอดรวม/VAT/Grand Total/งวด 50% อ้างอิงสูตรใน master
- เพิ่ม `/api/source-forms/formula-link/{formula_no}` เพื่อดึงข้อมูลสูตรของคนที่กำลังใช้งานเท่านั้น

## v31.14 ADMIN-QP Formula VLOOKUP + Media Preservation
- ADMIN-QP สามารถคีย์รหัสสูตรแล้วค้นหา F-RD-002 ที่ R&D บันทึกไว้แบบ VLOOKUP-like lookup
- ดึง Active Ingredient และ Inactive Ingredient แยกเข้าช่องเดิมของ QP อย่างถูกต้อง
- ดึงชื่อสาร ปริมาณ และประเทศต้นทาง
- ใน Excel ใบเสนอราคา ประเทศจะต่อท้ายชื่อสาร เช่น `สาร A ประเทศ Japan`
- Export ADMIN-QP ตรวจสอบไฟล์รูป/โลโก้ใน `xl/media` เทียบกับ master ก่อนส่งไฟล์ดาวน์โหลด หากรูปหายหรือถูกเปลี่ยนจะไม่ส่งไฟล์ที่เสียออกไป


## v31.15 ADMIN-QP media export fix
- Fixed false `master media integrity failed` errors caused by openpyxl renaming embedded image files during save.
- Media validation now checks embedded-media count and non-empty content instead of exact internal ZIP filenames.
- ADMIN-QP master logos/images remain embedded in exported XLSX files.

## v31.19 Realtime + Package Catalog + Signature Date
- ADMIN-QP: customer/human approval date at D60 is editable by typing DD/MM/YYYY; no other signature labels/names/images are removed.
- Package Database imported from `data/package_catalog_source.xlsx` and normalized to `app/static/package_catalog.json` (104 primary entries across 9 categories).
- Package fields support type-to-search + dropdown. ADMIN-QP line descriptions can select a package and refresh package price/details from the selected item.
- Package Database is available from R&D, ADMIN and GRAPHIC workspaces.
- F-RD-002 and F-RD-002.1 now use a final realtime recalculation engine that reads current DOM values on every edit and overwrites stale derived values.
- ADMIN-QP derived totals also recalculate from current values on every edit.


## v31.23 PURCHASE unified FDA/material-code database
- FDA + รหัสสาร รวมเป็น PostgreSQL fda_materials ฐานเดียว
- เพิ่ม/แก้ไข ชื่อขึ้นทะเบียนของสาร, ประเทศที่มา, ราคา/กก., Halal
- หน้าแก้ไขฐานย้ายไป PURCHASE; R&D อ่านฐานเดียวกันสำหรับ dropdown
