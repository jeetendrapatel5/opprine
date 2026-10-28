/* eslint-disable @next/next/no-img-element --
   Images are user-supplied URLs (Cloudinary), so next/image's fixed
   remote-host allow-list does not fit here. */

// components/showcase/ShowcaseGallery.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The "Final deliverables" gallery. Server component, no JavaScript shipped.
//
// Layout: one wide image, then two side by side, then wide again… (see
// isWideTile). Every tile has a fixed aspect ratio, so the page never jumps
// while images load. Each tile opens the full-size image in a new tab, exactly
// as the old page did.
// ─────────────────────────────────────────────────────────────────────────────

import { isWideTile } from './showcase-utils'

export default function ShowcaseGallery({ assets }) {
  if (assets.length === 0) return null

  return (
    <section id="work" className="scroll-mt-12 bg-fp-portal-surface px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">

        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <h2 className="font-display text-3xl font-medium tracking-tight text-fp-portal-text-primary md:text-5xl">
            Final deliverables
          </h2>
          <p className="mt-3 text-fp-portal-text-secondary">Select an image to view it full size.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {assets.map((asset, index) => {
            const wide = isWideTile(index, assets.length)

            return (
              <a
                key={asset.id}
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative block overflow-hidden rounded-xl bg-fp-portal-raised ring-1 ring-fp-portal-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-portal-text-primary ${
                  wide ? 'aspect-[4/3] md:col-span-2 md:aspect-video' : 'aspect-[4/3]'
                }`}
              >
                <img
                  src={asset.url}
                  alt={asset.name}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
                />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}