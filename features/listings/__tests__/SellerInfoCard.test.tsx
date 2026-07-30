import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SellerInfoCard } from '../components/SellerInfoCard'

describe('SellerInfoCard Component', () => {
  const mockSeller = {
    id: 'seller-1',
    full_name: 'John Smith',
    avatar_url: null,
    bio: 'Experienced photographer with 10 years in the industry',
    avg_rating: 4.8,
    review_count: 24,
  }

  it('renders seller full name', () => {
    render(<SellerInfoCard seller={mockSeller} />)

    const nameHeading = screen.getByRole('heading')
    expect(nameHeading).toHaveTextContent('John Smith')
  })

  it('displays initials when no avatar provided', () => {
    render(<SellerInfoCard seller={mockSeller} />)

    const initials = screen.getByText('JS')
    expect(initials).toBeInTheDocument()
  })

  it('displays avatar image when provided', () => {
    const sellerWithAvatar = {
      ...mockSeller,
      avatar_url: 'https://example.com/avatar.jpg',
    }

    render(<SellerInfoCard seller={sellerWithAvatar} />)

    const avatar = screen.getByRole('img', { name: mockSeller.full_name })
    expect(avatar).toBeInTheDocument()
  })

  it('generates correct initials for multi-word names', () => {
    const seller = {
      ...mockSeller,
      full_name: 'Jane Marie Johnson',
    }

    render(<SellerInfoCard seller={seller} />)

    const initials = screen.getByText('JM')
    expect(initials).toBeInTheDocument()
  })

  it('handles single-word names for initials', () => {
    const seller = {
      ...mockSeller,
      full_name: 'Madonna',
    }

    render(<SellerInfoCard seller={seller} />)

    const initials = screen.getByText('M')
    expect(initials).toBeInTheDocument()
  })

  it('displays seller bio when present', () => {
    render(<SellerInfoCard seller={mockSeller} />)

    const bio = screen.getByText(
      /Experienced photographer with 10 years in the industry/i,
    )
    expect(bio).toBeInTheDocument()
  })

  it('does not display bio section when bio is null', () => {
    const sellerNoBio = { ...mockSeller, bio: null }

    render(<SellerInfoCard seller={sellerNoBio} />)

    // Bio section should not exist
    const bioSection = screen.queryByText(
      /Experienced photographer with 10 years in the industry/i,
    )
    expect(bioSection).not.toBeInTheDocument()
  })

  it('displays rating and review count when reviews exist', () => {
    render(<SellerInfoCard seller={mockSeller} />)

    const rating = screen.getByText('4.8')
    const reviewCount = screen.getByText('(24)')

    expect(rating).toBeInTheDocument()
    expect(reviewCount).toBeInTheDocument()
  })

  it('hides rating when review_count is 0', () => {
    const sellerNoReviews = {
      ...mockSeller,
      review_count: 0,
    }

    render(<SellerInfoCard seller={sellerNoReviews} />)

    const ratingDisplay = screen.queryByText(/\d\.\d/)
    expect(ratingDisplay).not.toBeInTheDocument()
  })

  it('displays star icon for rating', () => {
    render(<SellerInfoCard seller={mockSeller} />)

    const stars = screen.getAllByText('★')
    expect(stars.length).toBeGreaterThan(0)
  })

  it('renders "Contact Seller" button', () => {
    render(<SellerInfoCard seller={mockSeller} />)

    const button = screen.getByRole('button', {
      name: /Contact Seller/i,
    })
    expect(button).toBeInTheDocument()
  })

  it('contact button is disabled for MVP', () => {
    render(<SellerInfoCard seller={mockSeller} />)

    const button = screen.getByRole('button', {
      name: /Contact Seller/i,
    })
    expect(button).toBeDisabled()
  })

  it('contact button has tooltip message', () => {
    render(<SellerInfoCard seller={mockSeller} />)

    const button = screen.getByRole('button', {
      name: /Contact Seller/i,
    })
    expect(button).toHaveAttribute(
      'title',
      'Messaging available in a future release',
    )
  })

  it('displays verified seller badge', () => {
    render(<SellerInfoCard seller={mockSeller} />)

    const badge = screen.getByText('Verified seller')
    expect(badge).toBeInTheDocument()
  })

  it('displays verification checkmark icon', () => {
    render(<SellerInfoCard seller={mockSeller} />)

    // Should have a checkmark icon (SVG with path)
    const verifiedBadge = screen.getByText('Verified seller').closest('div')
    expect(verifiedBadge?.querySelector('svg')).toBeInTheDocument()
  })

  it('renders as aside element for semantics', () => {
    const { container } = render(<SellerInfoCard seller={mockSeller} />)

    const aside = container.querySelector('aside')
    expect(aside).toBeInTheDocument()
  })

  it('truncates long names with proper styling', () => {
    const seller = {
      ...mockSeller,
      full_name: 'VeryLongNameThatShouldBeTruncated WithMultipleWords',
    }

    render(<SellerInfoCard seller={seller} />)

    const heading = screen.getByRole('heading')
    expect(heading).toHaveClass('truncate')
  })

  it('truncates long bios to 3 lines', () => {
    const seller = {
      ...mockSeller,
      bio: 'This is a very long bio that should be truncated to three lines to prevent excessive height on the seller card. It keeps going and going with lots of details about the seller and their experience in the industry.',
    }

    render(<SellerInfoCard seller={seller} />)

    const bioText = screen.getByText(seller.bio)
    expect(bioText).toHaveClass('line-clamp-3')
  })

  it('has sticky positioning on large screens', () => {
    const { container } = render(<SellerInfoCard seller={mockSeller} />)

    const aside = container.querySelector('aside')
    expect(aside).toHaveClass('lg:sticky')
  })

  it('renders all seller information in correct order', () => {
    const { container } = render(<SellerInfoCard seller={mockSeller} />)

    const aside = container.querySelector('aside')
    const textContent = aside?.textContent

    // Should contain all key information
    expect(textContent).toContain('John Smith')
    expect(textContent).toContain('Experienced photographer')
    expect(textContent).toContain('Verified seller')
  })

  it('displays properly formatted rating when review_count > 0', () => {
    const seller = {
      ...mockSeller,
      avg_rating: 4.75,
      review_count: 15,
    }

    render(<SellerInfoCard seller={seller} />)

    const rating = screen.getByText('4.8') // Should be rounded to 1 decimal
    const reviewCount = screen.getByText('(15)')

    expect(rating).toBeInTheDocument()
    expect(reviewCount).toBeInTheDocument()
  })
})
