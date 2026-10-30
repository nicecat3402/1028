import re
import unicodedata


def phone_key(value: str) -> str:
    """Normalize Taiwan mobile/landline spelling, preserve international + prefix."""
    value = unicodedata.normalize('NFKC', value).strip()
    digits = re.sub(r'\D', '', value)
    if value.startswith('+'):
        return '+' + digits
    if digits.startswith('00886'):
        return '+' + digits[2:]
    if digits.startswith('886'):
        return '+' + digits
    if digits.startswith('0') and 9 <= len(digits) <= 10:
        return '+886' + digits[1:]
    return digits


def tax_checksum(value: str) -> bool:
    if not re.fullmatch(r'\d{8}', value, flags=re.ASCII) or value == '00000000':
        return False
    total = sum(sum(map(int, str(int(d) * w))) for d, w in zip(value, [1, 2, 1, 2, 1, 2, 4, 1]))
    return total % 5 == 0 or (value[6] == '7' and (total + 1) % 5 == 0)
