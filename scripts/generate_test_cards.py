"""Generate standards-compliant, printable vector QR test cards."""
from pathlib import Path
import qrcode
import qrcode.image.svg

destination = Path(__file__).resolve().parents[1] / 'core/static/core/cards'
destination.mkdir(parents=True, exist_ok=True)
for kind in ('tree', 'house', 'person'):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(f'XYSP1:{kind}:01')
    qr.make(fit=True)
    qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(destination / f'{kind}.svg')
print('Generated tree, house and person QR test cards (one ID per type).')
