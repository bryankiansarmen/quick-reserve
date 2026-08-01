interface Step {
  title: string
  description: string
}

const RENTER_STEPS: Step[] = [
  {
    title: 'Browse & compare',
    description: 'Search by location, category, price, and date to find the perfect space.',
  },
  {
    title: 'Book instantly',
    description: 'Select a real-time available slot and pay securely with Stripe.',
  },
  {
    title: 'Get confirmed',
    description: 'Receive instant confirmation by email — no waiting on replies.',
  },
]

const SELLER_STEPS: Step[] = [
  {
    title: 'List your space',
    description: 'Add photos, set your price, and define your availability calendar.',
  },
  {
    title: 'Accept bookings',
    description: 'Enable instant booking or review and accept requests on your terms.',
  },
  {
    title: 'Get paid',
    description: 'Payments are processed securely and your slot is never double-booked.',
  },
]

function StepItem({ step, index }: { step: Step; index: number }) {
  return (
    <li className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary dark:bg-primary/20">
        {index + 1}
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {step.title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {step.description}
        </p>
      </div>
    </li>
  )
}

/**
 * HowItWorks: Two-column "How it works" section (Renters | Space Owners).
 *
 * Server component — static content addressing the trust/speed pain points
 * from the PRD.
 */
export function HowItWorks() {
  return (
    <section className="bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          How It Works
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Built for both sides of the marketplace
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              For Renters
            </h3>
            <ul className="mt-6 space-y-6">
              {RENTER_STEPS.map((step, index) => (
                <StepItem key={step.title} step={step} index={index} />
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              For Space Owners
            </h3>
            <ul className="mt-6 space-y-6">
              {SELLER_STEPS.map((step, index) => (
                <StepItem key={step.title} step={step} index={index} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
