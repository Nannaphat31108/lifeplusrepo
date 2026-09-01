"""Thai Baht number-to-words conversion.

Python port of thaiBahtText() in app/static/app.js -- kept in sync with that
implementation (same digit/position tables, same "ยี่สิบ"/"เอ็ด" special
cases). Used server-side for generated Excel exports (e.g. PO) where the
grand-total-in-words line has to be baked into the file, not just shown in
the browser.
"""

_DIGIT_THAI = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]
_POSITION_THAI = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"]


def _convert(num_str: str) -> str:
    num_str = num_str.lstrip("0") or "0"
    if num_str == "0":
        return "ศูนย์"
    result = ""
    length = len(num_str)
    for i, ch in enumerate(num_str):
        digit = int(ch)
        pos = length - i - 1  # 0 = rightmost (units) digit of the whole number
        pos_in_group = pos % 6
        if digit == 0:
            continue
        if pos_in_group == 1 and digit == 2:
            result += "ยี่"
        elif pos_in_group == 1 and digit == 1:
            pass  # "สิบ" alone
        elif pos_in_group == 0 and digit == 1 and pos == 0 and length > 1:
            result += "เอ็ด"
        else:
            result += _DIGIT_THAI[digit]
        result += _POSITION_THAI[pos_in_group]
        if pos > 0 and pos % 6 == 0:
            result += "ล้าน"
    return result


def thai_baht_text(amount) -> str:
    amount = round((float(amount) if amount else 0.0) * 100) / 100
    is_neg = amount < 0
    amount = abs(amount)
    baht = int(amount)
    satang = round((amount - baht) * 100)
    text = _convert(str(baht)) + "บาท"
    text += "ถ้วน" if satang == 0 else _convert(str(satang).zfill(2)) + "สตางค์"
    return ("ลบ" if is_neg else "") + text
