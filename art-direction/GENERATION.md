# Requested asset workflow

Target image model: `gpt-image-2.5-sunburst` (explicit user request).

The current Three.js sculptures are authored parametric geometry. They are useful for reviewing interactions and the anatomy vocabulary, but are **not** a substitute for the requested GPT Image 2.5 art-generation step. No claim of generated concept art or AI mesh provenance should be made until that work runs successfully.

The current environment has no `OPENAI_API_KEY`. The built-in image tool previously returned a usage-limit response and does not expose an explicit model selector. Spline's 3D bridge is also not connected to an editor. These are separate limitations from the working Vite/Three.js runtime.

## Generate the first concept once API access is configured

Use the installed imagegen skill CLI, which supports explicit GPT Image model selection. Keep the API key in the local environment; do not prefix it with `VITE_`, write it into frontend code, or commit it.

Example in PowerShell, from the repository root (adjust skill and screenshot roots on another machine):

```powershell
python C:/Users/akbar/.codex/skills/.system/imagegen/scripts/image_gen.py edit `
  --model gpt-image-2.5-sunburst `
  --image "C:/Users/akbar/OneDrive/Gambar/Screenshots/Screenshot 2026-09-07 235253.png" `
  --image "C:/Users/akbar/OneDrive/Gambar/Screenshots/Screenshot 2026-09-07 235313.png" `
  --prompt-file art-direction/ram-character.txt `
  --size 1024x1536 --quality high `
  --out output/imagegen/ram-character.png
```

Review the generated image against the supplied art direction. Use it as the modelling reference for real geometry, or pass it to an available image-to-mesh service with export access. Image generation produces a bitmap; Three.js renders meshes and does not reconstruct a complete 3D character from a bitmap by itself.

Export the final textured mesh as GLB. `BeastViewer.loadGLB(url)` accepts that mesh, checks that it contains geometry, normalizes its height and ground position, and places it in the interactive scene. It should then be integrated into seed selection with a committed asset manifest and verified from the front, side and back. Do not implement the final character as a texture on a plane.
