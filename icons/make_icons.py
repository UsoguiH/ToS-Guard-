"""Generate ToS Guard icon PNGs at 16, 32, 48, 128 px.

Renders a shield with a gradient + checkmark on transparent background.
Uses Pillow only (no SVG renderer needed).
"""
from PIL import Image, ImageDraw
import os, math

OUT = os.path.dirname(os.path.abspath(__file__))

GRAD_TOP = (122, 240, 255, 255)   # cyan
GRAD_BOT = (160, 123, 255, 255)   # violet
CHECK = (12, 13, 26, 255)         # dark navy


def shield_polygon(size):
    s = size
    pad = s * 0.08
    # Approximate shield (top wide, bottom rounded point).
    pts = [
        (s * 0.5,  pad),
        (s - pad,  s * 0.22),
        (s - pad,  s * 0.55),
        (s * 0.5,  s - pad),
        (pad,      s * 0.55),
        (pad,      s * 0.22),
    ]
    return pts


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))


def make(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Render a higher-res mask, then downsample for smooth edges.
    scale = 4
    big = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    bd = ImageDraw.Draw(big)
    poly = shield_polygon(size * scale)
    bd.polygon(poly, fill=(255, 255, 255, 255))

    # Build gradient layer.
    grad = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(size * scale):
        t = y / (size * scale - 1)
        gd.line([(0, y), (size * scale, y)], fill=lerp(GRAD_TOP, GRAD_BOT, t))

    # Apply shield as mask.
    shielded = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    shielded.paste(grad, (0, 0), big)

    # Inner darker shield (for the badge look).
    inner_poly = []
    cx, cy = size * scale / 2, size * scale / 2
    for x, y in poly:
        # Shrink toward center.
        nx = cx + (x - cx) * 0.78
        ny = cy + (y - cy) * 0.78
        inner_poly.append((nx, ny))
    inner = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    ind = ImageDraw.Draw(inner)
    # Slightly translucent inner overlay.
    ind.polygon(inner_poly, fill=(20, 22, 56, 70))
    shielded.alpha_composite(inner)

    # Checkmark.
    cm = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    cmd = ImageDraw.Draw(cm)
    w = max(2, int(size * scale * 0.10))
    # Three points roughly centered.
    p1 = (size * scale * 0.32, size * scale * 0.52)
    p2 = (size * scale * 0.46, size * scale * 0.66)
    p3 = (size * scale * 0.72, size * scale * 0.38)
    cmd.line([p1, p2], fill=CHECK, width=w)
    cmd.line([p2, p3], fill=CHECK, width=w)
    # Round caps.
    r = w // 2
    for px, py in (p1, p2, p3):
        cmd.ellipse([px - r, py - r, px + r, py + r], fill=CHECK)
    shielded.alpha_composite(cm)

    final = shielded.resize((size, size), Image.LANCZOS)
    final.save(os.path.join(OUT, f"icon-{size}.png"), "PNG")
    print("wrote", f"icon-{size}.png")


if __name__ == "__main__":
    for s in (16, 32, 48, 128):
        make(s)
