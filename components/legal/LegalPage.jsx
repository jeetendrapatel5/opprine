// components/legal/LegalPage.jsx
//
// Shared layout for the legal pages. Server component.
//
// A page passes `title`, `updated` and its content as a list of
// <section><h2>Heading</h2>…</section> blocks. This component:
//   1. reads each section's <h2> to build the "On this page" list,
//   2. gives each section an anchor id and a clause number (01, 02, …),
//   3. wraps everything in the site header, document switcher and footer.
// The pages themselves stay plain content and need no extra props.

import { Children, cloneElement, isValidElement } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { getBusinessDetails } from '@/lib/legal/business'
import { LEGAL_DOCUMENTS, textOf, toIsoDate, uniqueSlugs } from '@/lib/legal/sections'
import LegalToc from './LegalToc'

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17130F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFAFA]'

const CONTAINER = 'mx-auto w-full max-w-[960px] px-5 sm:px-6'

// Hanging clause number: sits in the left margin on desktop, inline on mobile.
const NUMBER_CLASS =
  'mr-3 text-[13px] font-medium tabular-nums text-[#6F675C] lg:-ml-10 lg:mr-4 lg:w-6'
const H2_CLASS = 'mb-3 flex items-baseline font-display text-xl font-semibold leading-7 text-[#17130F]'
const SECTION_CLASS = 'scroll-mt-8 border-t border-[#E7E0D3] py-8 first:border-t-0 first:pt-0'

// Finds the <h2> inside each <section>, numbers it and adds an anchor id.
// Anything that is not a <section> with an <h2> is passed through untouched.
function prepareSections(children) {
  const blocks = Children.toArray(children)

  const found = blocks.map((block) => {
    if (!isValidElement(block) || block.type !== 'section') return null
    const parts = Children.toArray(block.props.children)
    const headingIndex = parts.findIndex((part) => isValidElement(part) && part.type === 'h2')
    if (headingIndex === -1) return null
    return { parts, headingIndex, title: textOf(parts[headingIndex].props.children).trim() }
  })

  const ids = uniqueSlugs(found.filter(Boolean).map((section) => section.title))
  const toc = []
  let count = 0

  const content = blocks.map((block, i) => {
    const section = found[i]
    if (!section) return block

    const id = ids[count]
    const number = String(count + 1).padStart(2, '0')
    count += 1
    toc.push({ id, title: section.title, number })

    const heading = section.parts[section.headingIndex]
    const numbered = cloneElement(
      heading,
      { className: H2_CLASS },
      <span key="number" aria-hidden="true" className={NUMBER_CLASS}>
        {number}
      </span>,
      heading.props.children,
    )
    const parts = section.parts.map((part, index) => (index === section.headingIndex ? numbered : part))
    return cloneElement(block, { id, className: SECTION_CLASS }, ...parts)
  })

  return { toc, content }
}

export default function LegalPage({ title, updated, children }) {
  const business = getBusinessDetails()
  const { toc, content } = prepareSections(children)
  const isoDate = toIsoDate(updated)

  return (
    <div className="min-h-screen bg-[#FFFAFA] font-body text-[#17130F] antialiased selection:bg-[#17130F] selection:text-white">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#17130F] focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <header className="border-b border-[#E7E0D3] print:hidden">
        <div className={`${CONTAINER} flex items-center justify-between py-4`}>
          <Link href="/" aria-label="Opprine home" className={`rounded-full ${FOCUS}`}>
            <Image src="/logo/opprine-main-logo.png" alt="" width={70} height={28} priority className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/signin"
              className={`hidden rounded-full px-4 py-2 text-[13px] font-semibold text-[#6F675C] transition-colors duration-150 hover:text-[#17130F] md:block ${FOCUS}`}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={`inline-flex min-h-9 items-center rounded-full bg-[#1E6F45] px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#2C8557] ${FOCUS}`}
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main id="content" className={`${CONTAINER} pt-12 sm:pt-16`}>
        <p className="text-[13px] font-medium text-[#6F675C]">Legal</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.1] tracking-[-0.015em] sm:text-4xl lg:text-[2.5rem]">
          {title}
        </h1>
        <p className="mt-4 text-[14px] text-[#6F675C]">
          Last updated <time dateTime={isoDate ?? undefined}>{updated}</time>
        </p>

        <nav aria-label="Legal documents" className="mt-8 flex flex-wrap gap-x-6 border-b border-[#E7E0D3] print:hidden">
          {LEGAL_DOCUMENTS.map((doc) => {
            const current = doc.title === title
            return (
              <Link
                key={doc.href}
                href={doc.href}
                aria-current={current ? 'page' : undefined}
                className={`-mb-px border-b-2 py-3 text-[14px] font-semibold transition-colors duration-150 ${FOCUS} ${
                  current
                    ? 'border-[#17130F] text-[#17130F]'
                    : 'border-transparent text-[#6F675C] hover:text-[#17130F]'
                }`}
              >
                {doc.title}
              </Link>
            )
          })}
        </nav>

        <div className="mt-10 grid gap-10 lg:grid-cols-[200px_minmax(0,38rem)] lg:gap-x-16">
          <aside>
            {toc.length > 0 && (
              <>
                <details className="group rounded-lg border border-[#E7E0D3] bg-white lg:hidden print:hidden">
                  <summary
                    className={`flex cursor-pointer list-none items-center justify-between rounded-lg px-4 py-3 text-[14px] font-semibold [&::-webkit-details-marker]:hidden ${FOCUS}`}
                  >
                    On this page
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 text-[#6F675C] transition-transform duration-150 group-open:rotate-180"
                    />
                  </summary>
                  <ol className="border-t border-[#E7E0D3] px-4 py-2">
                    {toc.map(({ id, title: sectionTitle, number }) => (
                      <li key={id}>
                        <a
                          href={`#${id}`}
                          className={`flex gap-3 py-2 text-[14px] leading-5 text-[#3A342B] ${FOCUS}`}
                        >
                          <span aria-hidden="true" className="w-5 shrink-0 font-mono text-[12px] tabular-nums text-[#6F675C]">
                            {number}
                          </span>
                          <span>{sectionTitle}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </details>
                <LegalToc sections={toc} />
              </>
            )}
          </aside>

          <article className="min-w-0 text-[16px] leading-7 text-[#3A342B] [&_a]:font-semibold [&_a]:text-[#1E6F45] [&_a]:underline [&_a]:decoration-[#1E6F45]/30 [&_a]:underline-offset-4 [&_a:hover]:decoration-[#1E6F45] [&_li]:pl-1 [&_li]:marker:text-[#948C7E] [&_p+p]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
            {content}
          </article>
        </div>
      </main>

      <footer className="mt-20 border-t border-[#E7E0D3] print:hidden">
        <div
          className={`${CONTAINER} flex flex-col gap-4 py-8 text-[13px] text-[#6F675C] sm:flex-row sm:items-center sm:justify-between`}
        >
          <p>
            &copy; {new Date().getFullYear()} {business.name}
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_DOCUMENTS.map((doc) => (
              <Link
                key={doc.href}
                href={doc.href}
                className={`rounded transition-colors duration-150 hover:text-[#17130F] ${FOCUS}`}
              >
                {doc.title}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}