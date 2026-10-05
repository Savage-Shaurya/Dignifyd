# Dignifyd Group website

Marketing homepage for Dignifyd Group: one relationship, five specialised capabilities.

Built with Next.js 16 (App Router), React 19, GSAP (ScrollTrigger, SplitText, MorphSVG), Lenis smooth scroll, Motion, and three.js.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Where things live

- `src/content/site.ts`: all page copy (sourced from dignifyd.io)
- `src/app/globals.css`: design tokens (black · white · crimson) and type scale
- `src/components/`: sections: `hero/`, `globe/`, `method/`, `enquiry/`, `footer/`, `chrome/` (preloader, navbar, cookie banner, scroll indicator)
- `public/images/`: generated artwork for the navbar panels; prompts in `image-prompts.json`
- `public/data/land-mask.bin`: 2048×1024 land mask used by the globe

## Notes

- The globe uses WebGL2 and falls back to a canvas-2D renderer when hardware acceleration is unavailable.
- The enquiry flow has no backend; its last step opens a pre-filled email to hello@dignifyd.io.
- The visitor's city in the hero badge comes from ipapi.co (falls back to the nearest centre by timezone).
