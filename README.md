# SVG Cylinder Relief Preview

This is a lightweight web app that wraps an SVG texture around a 3D cylinder, previews
position/scale, simulates relief thickness with a second transparent cylinder, and exports
an STL containing the base + relief geometry.

## Run locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Notes

- STL export uses closed cylinders so the meshes are watertight for printing.
- Relief thickness is previewed as an offset cylinder; it does not yet compute a true
  heightmap extrusion from SVG vector paths.
