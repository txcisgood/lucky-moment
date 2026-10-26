"""Regenerate checked-in app icons with Pillow. No network assets are used."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'build'
root.mkdir(exist_ok=True)
size = 1024
icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(icon)
draw.rounded_rectangle((12, 12, 1012, 1012), radius=225, fill='#151518', outline='#35353d', width=5)
mark = Image.new('RGBA', (600, 600), (0, 0, 0, 0))
for column, row, rotation in [(0, 0, 0), (1, 0, -90), (0, 1, 90), (1, 1, 180)]:
    petal = Image.new('RGBA', (270, 270), (0, 0, 0, 0))
    pd = ImageDraw.Draw(petal)
    pd.rounded_rectangle((0, 0, 269, 269), radius=94, fill='#f23650')
    pd.rectangle((172, 172, 269, 269), fill='#f23650')
    petal = petal.rotate(rotation)
    mark.alpha_composite(petal, (column * 299 + 15, row * 299 + 15))
mark = mark.rotate(12, resample=Image.Resampling.BICUBIC, expand=True)
icon.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
icon.save(root / 'icon.png')
icon.save(root / 'icon.icns', format='ICNS')
icon.save(root / 'icon.ico', format='ICO', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
print('Created macOS, Windows and PNG app icons.')
