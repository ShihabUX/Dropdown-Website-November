"""Encode the generated 3D plate as a finite camera-drift GIF. Requires ffmpeg.
Usage: python scripts/render-atmosphere.py /path/to/generated-plate.png
This is an optional asset-maintenance command, not a Vercel build step.
"""
from pathlib import Path
import subprocess
import sys

source = Path(sys.argv[1]).resolve()
assets = Path(sys.argv[2]) if len(sys.argv)>2 else Path(__file__).resolve().parent.parent / 'public' / 'assets'
assets.mkdir(parents=True, exist_ok=True)
for name, width, height in [('desktop', 768, 512), ('mobile', 384, 256)]:
    # A gentle closed camera path: no fabricated independent motion in the flat plate.
    drift = ("zoompan=z='1.04+0.018*sin(2*PI*on/57)':"
             "x='iw/2-iw/zoom/2+6*sin(2*PI*on/57)':"
             "y='ih/2-ih/zoom/2+4*sin(2*PI*on/57)':"
             f"d=58:s={width}x{height}:fps=12")
    graph = (f"gblur=sigma=1.2,{drift},split[a][b];[a]palettegen=max_colors=32:stats_mode=full[p];"
             "[b][p]paletteuse=dither=none")
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
                    '-filter_complex', graph, '-loop', '-1',
                    str(assets / f'atmosphere-{name}.gif')], check=True)
# Match the last camera position so switching to the still does not jump.
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                '-i', str(assets / 'atmosphere-desktop.gif'), '-vf', "select='eq(n,57)'",
                '-frames:v', '1', '-quality', '85', str(assets / 'atmosphere-still.webp')], check=True)
for path in assets.glob('atmosphere-*'):
    print(path.name, path.stat().st_size, 'bytes')
