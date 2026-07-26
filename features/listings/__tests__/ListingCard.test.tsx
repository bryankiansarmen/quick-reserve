import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ListingCard } from '../components/ListingCard'
import type { ListingSearchResult } from '../types'

const mockListing: ListingSearchResult = {
  id: '123-abc',
  title: 'Modern Photography Studio',
  price_cents: 8500,
  location: 'Downtown Los Angeles',
  images: ['https://example.com/image1.jpg'],
  avg_rating: 4.8,
  review_count: 12,
}

describe('ListingCard', () => {
  it('renders listing information correctly', () => {
    render(<ListingCard listing={mockListing} />)

    expect(screen.getByText('Modern Photography Studio')).toBeInTheDocument()
    expect(screen.getByText('Downtown Los Angeles')).toBeInTheDocument()
    expect(screen.getByText('$85')).toBeInTheDocument()
  })

  it('displays price correctly formatted', () => {
    render(<ListingCard listing={mockListing} />)

    expect(screen.getByText('$85')).toBeInTheDocument()
    expect(screen.getByText('/hour')).toBeInTheDocument()
  })

  it('shows rating when reviews exist', () => {
    render(<ListingCard listing={mockListing} />)

    expect(screen.getByText('4.8')).toBeInTheDocument()
    expect(screen.getByText('(12)')).toBeInTheDocument()
    expect(screen.getByText('★')).toBeInTheDocument()
  })

  it('hides rating when no reviews exist', () => {
    const noReviewsListing: ListingSearchResult = {
      ...mockListing,
      review_count: 0,
      avg_rating: 0,
    }

    render(<ListingCard listing={noReviewsListing} />)

    expect(screen.queryByText('★')).not.toBeInTheDocument()
    expect(screen.queryByText('(0)')).not.toBeInTheDocument()
  })

  it('links to listing detail page', () => {
    render(<ListingCard listing={mockListing} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/listings/123-abc')
  })

  it('uses placeholder image when no images provided', () => {
    const noImageListing: ListingSearchResult = {
      ...mockListing,
      images: [],
    }

    render(<ListingCard listing={noImageListing} />)

    const img = screen.getByAltText('Modern Photography Studio')
    expect(img).toHaveAttribute('src', expect.stringContaining('placeholder'))
  })

  it('uses first image when multiple images provided', () => {
    const multiImageListing: ListingSearchResult = {
      ...mockListing,
      images: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ],
    }

    render(<ListingCard listing={multiImageListing} />)

    const img = screen.getByAltText('Modern Photography Studio')
    expect(img).toHaveAttribute('src', expect.stringContaining('image1.jpg'))
  })

  it('has accessible aria label', () => {
    render(<ListingCard listing={mockListing} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'aria-label',
      'View details for Modern Photography Studio'
    )
  })

  it('displays price as short format (no decimals for whole dollars)', () => {
    const wholePrice: ListingSearchResult = {
      ...mockListing,
      price_cents: 10000, // $100.00
    }

    render(<ListingCard listing={wholePrice} />)

    expect(screen.getByText('$100')).toBeInTheDocument()
    expect(screen.queryByText('$100.00')).not.toBeInTheDocument()
  })

  it('displays price with decimals when not a whole dollar', () => {
    const partialPrice: ListingSearchResult = {
      ...mockListing,
      price_cents: 8550, // $85.50
    }

    render(<ListingCard listing={partialPrice} />)

    expect(screen.getByText('$85.50')).toBeInTheDocument()
  })

  it('truncates long titles with line-clamp', () => {
    const longTitleListing: ListingSearchResult = {
      ...mockListing,
      title: 'This is an extremely long title that should be truncated with line clamp to prevent layout shift and overflow issues',
    }

    const { container } = render(<ListingCard listing={longTitleListing} />)

    const titleElement = container.querySelector('h3')
    expect(titleElement).toHaveClass('line-clamp-1')
  })

  it('renders with proper data-testid for testing', () => {
    const { container } = render(<ListingCard listing={mockListing} />)

    expect(container.querySelector('[data-testid="listing-card"]')).toBeInTheDocument()
  })
})
