import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SearchFilters } from '../components/SearchFilters'
import type { ListingSearchParams } from '../types'

describe('SearchFilters', () => {
  const mockOnFilterChange = vi.fn()
  const initialFilters: ListingSearchParams = { sort: 'newest', page: 1 }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders all filter inputs', () => {
    render(
      <SearchFilters initialFilters={initialFilters} onFilterChange={mockOnFilterChange} />
    )

    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Location')).toBeInTheDocument()
    expect(screen.getByLabelText(/Price Range/)).toBeInTheDocument()
    expect(screen.getByLabelText('Available Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Sort By')).toBeInTheDocument()
  })

  it('renders all category options', () => {
    render(
      <SearchFilters initialFilters={initialFilters} onFilterChange={mockOnFilterChange} />
    )

    const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement
    expect(categorySelect.options).toHaveLength(5) // All Categories + 4 options

    expect(categorySelect.options[0]).toHaveTextContent('All Categories')
    expect(categorySelect.options[1]).toHaveTextContent('Photography Studio')
    expect(categorySelect.options[2]).toHaveTextContent('Event Venue')
    expect(categorySelect.options[3]).toHaveTextContent('Meeting Room')
    expect(categorySelect.options[4]).toHaveTextContent('Activity Space')
  })

  it('calls onFilterChange with debounced location input', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <SearchFilters initialFilters={initialFilters} onFilterChange={mockOnFilterChange} />
    )

    const locationInput = screen.getByLabelText('Location')
    await user.type(locationInput, 'Los Angeles')

    // Should not call immediately
    expect(mockOnFilterChange).not.toHaveBeenCalled()

    // Fast-forward 300ms (debounce time)
    vi.advanceTimersByTime(300)

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'Los Angeles',
          page: 1,
        })
      )
    })
  })

  it('converts dollars to cents for price filters', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <SearchFilters initialFilters={initialFilters} onFilterChange={mockOnFilterChange} />
    )

    const minPriceInput = screen.getByLabelText('Minimum price')
    await user.type(minPriceInput, '50')

    vi.advanceTimersByTime(300)

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          minPrice: 5000, // 50 * 100
          page: 1,
        })
      )
    })
  })

  it('validates price range (minPrice must be <= maxPrice)', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <SearchFilters initialFilters={initialFilters} onFilterChange={mockOnFilterChange} />
    )

    const minPriceInput = screen.getByLabelText('Minimum price')
    const maxPriceInput = screen.getByLabelText('Maximum price')

    await user.type(minPriceInput, '100')
    await user.type(maxPriceInput, '50')

    vi.advanceTimersByTime(300)

    // Should not call onFilterChange because price range is invalid
    await waitFor(() => {
      expect(mockOnFilterChange).not.toHaveBeenCalled()
    })
  })

  it('resets all filters when reset button clicked', async () => {
    const user = userEvent.setup({ delay: null })

    const initialWithFilters: ListingSearchParams = {
      category: 'photography-studio',
      location: 'LA',
      minPrice: 5000,
      maxPrice: 10000,
      sort: 'price_asc',
      page: 1,
    }

    render(
      <SearchFilters
        initialFilters={initialWithFilters}
        onFilterChange={mockOnFilterChange}
      />
    )

    const resetButton = screen.getByText('Reset')
    await user.click(resetButton)

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      sort: 'newest',
      page: 1,
    })
  })

  it('disables all inputs when loading', () => {
    render(
      <SearchFilters
        initialFilters={initialFilters}
        onFilterChange={mockOnFilterChange}
        isLoading={true}
      />
    )

    expect(screen.getByLabelText('Category')).toBeDisabled()
    expect(screen.getByLabelText('Location')).toBeDisabled()
    expect(screen.getByLabelText('Minimum price')).toBeDisabled()
    expect(screen.getByLabelText('Maximum price')).toBeDisabled()
    expect(screen.getByLabelText('Available Date')).toBeDisabled()
    expect(screen.getByLabelText('Sort By')).toBeDisabled()
    expect(screen.getByText('Reset')).toBeDisabled()
  })

  it('initializes with provided filter values', () => {
    const filtersWithValues: ListingSearchParams = {
      category: 'event-venue',
      location: 'New York',
      minPrice: 3000,
      maxPrice: 8000,
      date: '2026-07-30',
      sort: 'price_asc',
      page: 1,
    }

    render(
      <SearchFilters
        initialFilters={filtersWithValues}
        onFilterChange={mockOnFilterChange}
      />
    )

    expect(screen.getByLabelText('Category')).toHaveValue('event-venue')
    expect(screen.getByLabelText('Location')).toHaveValue('New York')
    expect(screen.getByLabelText('Minimum price')).toHaveValue(30) // 3000 / 100
    expect(screen.getByLabelText('Maximum price')).toHaveValue(80) // 8000 / 100
    expect(screen.getByLabelText('Available Date')).toHaveValue('2026-07-30')
    expect(screen.getByLabelText('Sort By')).toHaveValue('price_asc')
  })

  it('resets page to 1 when filters change', async () => {
    const user = userEvent.setup({ delay: null })

    const filtersOnPage2: ListingSearchParams = {
      sort: 'newest',
      page: 5, // User was on page 5
    }

    render(
      <SearchFilters
        initialFilters={filtersOnPage2}
        onFilterChange={mockOnFilterChange}
      />
    )

    const categorySelect = screen.getByLabelText('Category')
    await user.selectOption(categorySelect, 'photography-studio')

    vi.advanceTimersByTime(300)

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1, // Should reset to 1
        })
      )
    })
  })

  it('sets minimum date to today', () => {
    render(
      <SearchFilters initialFilters={initialFilters} onFilterChange={mockOnFilterChange} />
    )

    const dateInput = screen.getByLabelText('Available Date') as HTMLInputElement
    const today = new Date().toISOString().split('T')[0]

    expect(dateInput.min).toBe(today)
  })

  it('handles category selection', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <SearchFilters initialFilters={initialFilters} onFilterChange={mockOnFilterChange} />
    )

    const categorySelect = screen.getByLabelText('Category')
    await user.selectOption(categorySelect, 'meeting-room')

    vi.advanceTimersByTime(300)

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'meeting-room',
        })
      )
    })
  })

  it('handles sort changes', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <SearchFilters initialFilters={initialFilters} onFilterChange={mockOnFilterChange} />
    )

    const sortSelect = screen.getByLabelText('Sort By')
    await user.selectOption(sortSelect, 'price_desc')

    vi.advanceTimersByTime(300)

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'price_desc',
        })
      )
    })
  })
})
