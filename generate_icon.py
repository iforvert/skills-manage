#!/usr/bin/env python3
"""Generate skills-manage app icon as 1024x1024 PNG.

Design: A rounded square background with a skills-themed design:
- Dark base (Catppuccin Mocha base #1e1e2e) as background
- Green accent (Catppuccin Green #a6e3a1) for the icon symbol
- A stylised magic wand with 4-pointed sparkle star at tip
- Clean geometric shapes that render well at all sizes
"""

from PIL import Image, ImageDraw
import math

SIZE = 1024
CORNER_RADIUS = 220
PADDING = 0

# Catppuccin Mocha colors
BASE = (30, 30, 46)        # #1e1e2e
MANTLE = (24, 24, 37)      # #181825
GREEN = (166, 227, 161)    # #a6e3a1
GREEN_DARK = (76, 135, 96) # darker green for subtle accents
SURFACE1 = (69, 71, 90)    # #45475a
TEXT = (205, 214, 244)     # #cdd6f4


def draw_4_pointed_star(draw, cx, cy, outer_r, inner_r, fill):
    """Draw a 4-pointed star."""
    points = []
    for i in range(8):
        angle = math.pi / 4 * i - math.pi / 2
        r = outer_r if i % 2 == 0 else inner_r
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        points.append((x, y))
    draw.polygon(points, fill=fill)


def draw_mini_star(draw, cx, cy, size, fill):
    """Draw a tiny 4-pointed star sparkle."""
    draw_4_pointed_star(draw, cx, cy, size, size // 3, fill)


def main():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── Rounded square background ────────────────────────────────────────────
    bbox = (0, 0, SIZE, SIZE)
    draw.rounded_rectangle(bbox, radius=CORNER_RADIUS, fill=BASE)

    # Subtle inner shadow / depth ring
    draw.rounded_rectangle(
        (4, 4, SIZE - 4, SIZE - 4),
        radius=CORNER_RADIUS - 2,
        fill=MANTLE,
    )
    draw.rounded_rectangle(
        (8, 8, SIZE - 8, SIZE - 8),
        radius=CORNER_RADIUS - 4,
        fill=BASE,
    )

    # ── Main icon: wand + sparkle ────────────────────────────────────────────
    center_x = SIZE // 2
    center_y = SIZE // 2

    # Sparkle star (main focal point) — upper-center
    star_cx = center_x
    star_cy = center_y - SIZE // 10
    star_outer = SIZE // 5
    star_inner = star_outer // 3

    # Glow behind the star
    for r in range(star_outer + 60, star_outer, -4):
        alpha = int(40 * (1 - (r - star_outer) / 60))
        glow_color = (*GREEN, alpha)
        draw.ellipse(
            [star_cx - r, star_cy - r, star_cx + r, star_cy + r],
            fill=glow_color,
        )

    # Main 4-pointed star
    draw_4_pointed_star(draw, star_cx, star_cy, star_outer, star_inner, GREEN)

    # Small center dot
    dot_r = star_inner // 2
    draw.ellipse(
        [star_cx - dot_r, star_cy - dot_r, star_cx + dot_r, star_cy + dot_r],
        fill=BASE,
    )

    # ── Wand (diagonal stroke from bottom-left toward star) ──────────────────
    wand_start_x = center_x - SIZE // 3
    wand_start_y = center_y + SIZE // 3
    wand_end_x = star_cx - star_outer // 2
    wand_end_y = star_cy + star_outer // 2

    # Draw wand as a thick tapered line using a polygon
    wand_thick = SIZE // 28
    dx = wand_end_x - wand_start_x
    dy = wand_end_y - wand_start_y
    length = math.sqrt(dx * dx + dy * dy)
    # Perpendicular direction
    nx = -dy / length
    ny = dx / length

    # Tapered: thick at start, thin at end
    p1 = (wand_start_x + nx * wand_thick, wand_start_y + ny * wand_thick)
    p2 = (wand_start_x - nx * wand_thick, wand_start_y - ny * wand_thick)
    p3 = (wand_end_x - nx * wand_thick // 3, wand_end_y - ny * wand_thick // 3)
    p4 = (wand_end_x + nx * wand_thick // 3, wand_end_y + ny * wand_thick // 3)
    draw.polygon([p1, p4, p3, p2], fill=GREEN)

    # ── Small sparkle accents around the star ─────────────────────────────────
    small_star_size = SIZE // 24
    accent_positions = [
        (star_cx - SIZE // 4, star_cy - SIZE // 6),
        (star_cx + SIZE // 4, star_cy - SIZE // 7),
        (star_cx - SIZE // 5, star_cy + SIZE // 5),
        (star_cx + SIZE // 6, star_cy + SIZE // 4),
    ]
    for sx, sy in accent_positions:
        draw_mini_star(draw, sx, sy, small_star_size, GREEN)

    # ── Subtle bottom accent line (Catppuccin green bar) ─────────────────────
    bar_y = SIZE - SIZE // 8
    bar_h = 6
    bar_x0 = SIZE // 4
    bar_x1 = SIZE * 3 // 4
    draw.rounded_rectangle(
        [bar_x0, bar_y, bar_x1, bar_y + bar_h],
        radius=3,
        fill=(*GREEN, 80),  # semi-transparent
    )

    output_path = "src-tauri/icons/icon-source.png"
    img.convert("RGB").save(output_path, "PNG")
    print(f"Icon saved to {output_path} ({SIZE}x{SIZE})")


if __name__ == "__main__":
    main()
