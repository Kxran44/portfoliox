# 3D Motion Scroll Animation Website

Ultra-smooth 60/120FPS scroll-driven 3D animation experience built using 192 high-resolution frames extracted from `video_frames_24fps_png.zip`.

## 🚀 How to Run

### Method 1: One-Click Launch (Recommended)
Double-click **`start.bat`** in this folder. It will start the local HTTP server and automatically open the website in your default browser at `http://localhost:3000`.

### Method 2: Manual Terminal Run
Open PowerShell or Command Prompt in this folder and run:
```bash
node server.js
```
Then open `http://localhost:3000` in your browser.

### Method 3: Direct Browser Open
You can also double-click **`index.html`** to open it directly in Google Chrome, Microsoft Edge, or any modern browser.

---

## ✨ Features & Polish

- **Linear Interpolation (LERP) Damping**: Smooth frame transitions eliminating stutter and wheel clickiness.
- **Preloading Engine**: Loads all 192 frames progressively with a sleek preloader and percentage indicator.
- **Hardware-Accelerated HTML5 Canvas**: High-DPI (Retina) scaling with smart aspect-ratio cover.
- **Clean View Crop**: Automatically trims the bottom letterbox bar and Veo watermark for an immersive look.
- **Interactive 3D Mouse Parallax**: Subtle 3D perspective tilt that follows cursor movement.
- **Floating Glassmorphic HUD**:
  - Interactive timeline scrubber bar with draggable thumb and hover preview tooltip.
  - Autoplay toggle (24 FPS continuous playback).
  - Reset, 3D Tilt toggle, and Fullscreen toggle.
  - HUD toggle (`M` key or Eye icon) for 100% distraction-free full-screen visual immersion.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `↑` / `↓` or `←` / `→` | Step through frames smoothly |
| `Space` | Play / Pause auto playback |
| `F` | Toggle Fullscreen |
| `R` | Reset to Frame 1 |
| `T` | Toggle 3D Mouse Parallax Tilt |
| `M` | Toggle Floating Dock / HUD visibility |
