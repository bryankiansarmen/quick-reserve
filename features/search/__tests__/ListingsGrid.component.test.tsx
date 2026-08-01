import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ListingsGrid } from '../components/ListingsGrid'
import type { PaginatedListingsResponse } from '@/features/listings/types'

const mockResults: PaginatedListingsResponse = {
  data: [
    {
      id: '1',
      title: 'Studio 1',
      price_cents: 5000,
      location: 'LA',
      images: ['img1.jpg'],
      avg_rating: 4.5,
      review_count: 10,
    },
    {
      id: '2',
      title: 'Studio 2',
      price_cents: 7500,
      location: 'NY',
      images: ['img2.jpg'],
      avg_rating: 4.8,
      review_count: 15,
    },
  ],
  pagination: { page: 1, pageSize: 20, total: 45 },
}

describe('ListingsGrid', () => {
  const mockOnPageChange = vi.fn()

  it('renders all listings', () => {
    render(
      <ListingsGrid results={mockResults} onPageChange={mockOnPageChange} />
    )

    expect(screen.getByText('Studio 1')).toBeInTheDocument()
    expect(screen.getByText('Studio 2')).toBeInTheDocument()
  })

  it('shows result count', () => {
    render(
      <ListingsGrid results={mockResults} onPageChange={mockOnPageChange} />
    )

    expect(screen.getByText(/Showing 1–20 of 45 listings/)).toBeInTheDocument()
  })

  it('shows empty state when no results', () => {
    const emptyResults: PaginatedListingsResponse = {
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    }

    render(
      <ListingsGrid results={emptyResults} onPageChange={mockOnPageChange} />
    )

    expect(
      screen.getByText('No listings match your filters')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Try adjusting your search criteria/)
    ).toBeInTheDocument()
  })

  it('renders pagination controls when total > pageSize', () => {
    render(
      <ListingsGrid results={mockResults} onPageChange={mockOnPageChange} />
    )

    expect(screen.getByLabelText('Previous page')).toBeInTheDocument()
    expect(screen.getByLabelText('Next page')).toBeInTheDocument()
  })

  it('renders page numbers', () => {
    const multiPageResults: PaginatedListingsResponse = {
      ...mockResults,
      pagination: { page: 1, pageSize: 10, total: 100 },
    }

    render(
      <ListingsGrid results={multiPageResults} onPageChange={mockOnPageChange} />
    )

    expect(screen.getByLabelText('Page 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Page 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Page 10')).toBeInTheDocument()
  })

  it('calls onPageChange when pagination button clicked', async () => {
    const user = userEvent.setup()

    render(
      <ListingsGrid results={mockResults} onPageChange={mockOnPageChange} />
    )

    const nextButton = screen.getByLabelText('Next page')
    await user.click(nextButton)

    expect(mockOnPageChange).toHaveBeenCalledWith(2)
  })

  it('disables previous button on first page', () => {
    render(
      <ListingsGrid results={mockResults} onPageChange={mockOnPageChange} />
    )

    expect(screen.getByLabelText('Previous page')).toBeDisabled()
  })

  it('disables next button on last page', () => {
    const lastPageResults: PaginatedListingsResponse = {
      ...mockResults,
      pagination: { page: 3, pageSize: 20, total: 45 },
    }

    render(
      <ListingsGrid results={lastPageResults} onPageChange={mockOnPageChange} />
    )

    expect(screen.getByLabelText('Next page')).toBeDisabled()
  })

  it('shows loading skeletons when isLoading is true', () => {
    const { container } = render(
      <ListingsGrid
        results={mockResults}
        isLoading={true}
        onPageChange={mockOnPageChange}
      />
    )

    const skeletons = container.querySelectorAll('[data-testid="skeleton-card"]')
    expect(skeletons.length).toBe(mockResults.pagination.pageSize)
  })

  it('hides pagination when isLoading', () => {
    render(
      <ListingsGrid
        results={mockResults}
        isLoading={true}
        onPageChange={mockOnPageChange}
      />
    )

    expect(
      screen.queryByLabelText('Pagination navigation')
    ).not.toBeInTheDocument()
  })

  it('handles pagination on different pages', () => {
    const page2Results: PaginatedListingsResponse = {
      ...mockResults,
      pagination: { page: 2, pageSize: 20, total: 45 },
    }

    render(
      <ListingsGrid results={page2Results} onPageChange={mockOnPageChange} />
    )

    expect(screen.getByText(/Showing 21–40 of 45 listings/)).toBeInTheDocument()
  })

  it('marks current page as disabled', () => {
    render(
      <ListingsGrid results={mockResults} onPageChange={mockOnPageChange} />
    )

    const currentPageButton = screen.getByLabelText('Page 1') as HTMLButtonElement
    expect(currentPageButton).toBeDisabled()
    expect(currentPageButton).toHaveAttribute('aria-current', 'page')
  })

  it('does not render pagination when only one page', () => {
    const singlePageResults: PaginatedListingsResponse = {
      ...mockResults,
      pagination: { page: 1, pageSize: 20, total: 10 },
    }

    render(
      <ListingsGrid results={singlePageResults} onPageChange={mockOnPageChange} />
    )

    expect(
      screen.queryByLabelText('Pagination navigation')
    ).not.toBeInTheDocument()
  })

  it('shows empty state during loading when no data', () => {
    const emptyResults: PaginatedListingsResponse = {
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    }

    render(
      <ListingsGrid
        results={emptyResults}
        isLoading={true}
        onPageChange={mockOnPageChange}
      />
    )

    const { container } = render(
      <ListingsGrid
        results={emptyResults}
        isLoading={true}
        onPageChange={mockOnPageChange}
      />
    )
    const skeletons = container.querySelectorAll('[data-testid="skeleton-card"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('displays correct result count on last page with partial results', () => {
    const lastPagePartial: PaginatedListingsResponse = {
      data: [{ id: '1', title: 'Last', price_cents: 5000, location: 'LA', images: [], avg_rating: 0, review_count: 0 }],
      pagination: { page: 5, pageSize: 10, total: 41 },
    }

    render(
      <ListingsGrid results={lastPagePartial} onPageChange={mockOnPageChange} />
    )

    expect(screen.getByText(/Showing 41–41 of 41 listings/)).toBeInTheDocument()
  })
})
