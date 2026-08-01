import Link from 'next/link'

export interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbProps {
  homeLabel?: string
  homeHref?: string
  items: BreadcrumbItem[]
  currentPage: string
}

/**
 * Breadcrumb: Accessible breadcrumb navigation component.
 *
 * Features:
 * - Semantic nav with aria-label="Breadcrumb"
 * - Ordered list structure
 * - Last item (current page) is not a link, has aria-current="page"
 * - Collapses to Home + ... + last ancestor when ancestors > 3 for mobile
 *
 * Props:
 * - homeLabel: label for home (default: 'Home')
 * - homeHref: home link (default: '/')
 * - items: array of ancestor pages
 * - currentPage: label for the current page (not a link)
 */
export function Breadcrumb({
  homeLabel = 'Home',
  homeHref = '/',
  items,
  currentPage,
}: BreadcrumbProps) {
  // Collapse middle ancestors if more than 3 for mobile
  const displayItems =
    items.length > 3
      ? [items[0], { label: '…', href: '#' }, items[items.length - 1]]
      : items

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm">
        {/* Home */}
        <li>
          <Link
            href={homeHref}
            className="text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
          >
            {homeLabel}
          </Link>
        </li>

        {/* Ancestors */}
        {displayItems.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="text-slate-400 dark:text-slate-600"
            >
              /
            </span>
            {item.href === '#' ? (
              <span className="text-slate-600 dark:text-slate-400">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}

        {/* Current page */}
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="text-slate-400 dark:text-slate-600"
          >
            /
          </span>
          <span
            className="text-slate-900 dark:text-slate-50 font-medium"
            aria-current="page"
          >
            {currentPage}
          </span>
        </li>
      </ol>
    </nav>
  )
}
