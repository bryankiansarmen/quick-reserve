import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageGallery } from '../components/ImageGallery'

describe('ImageGallery Component', () => {
  const mockImages = [
    'image1.jpg',
    'image2.jpg',
    'image3.jpg',
    'image4.jpg',
  ]

  it('renders hero image with first image as default', () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const heroImage = screen.getByRole('img', {
      name: /Test Studio - image 1 of 4/i,
    })

    expect(heroImage).toBeInTheDocument()
  })

  it('displays image counter badge', () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const counter = screen.getByText('1 / 4')
    expect(counter).toBeInTheDocument()
  })

  it('renders thumbnail strip for multiple images', () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const thumbnails = screen.getAllByRole('button', {
      name: /View image \d+/i,
    })

    expect(thumbnails.length).toBe(4)
  })

  it('hides thumbnails and counter for single image', () => {
    render(<ImageGallery images={['image1.jpg']} title="Test Studio" />)

    const counter = screen.queryByText(/\d+ \/ \d+/)
    const thumbnails = screen.queryAllByRole('button', {
      name: /View image/i,
    })

    expect(counter).not.toBeInTheDocument()
    expect(thumbnails.length).toBe(0)
  })

  it('clicking thumbnail switches main image', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    // Click second thumbnail
    const secondThumbnail = screen.getByRole('button', {
      name: 'View image 2',
    })
    await user.click(secondThumbnail)

    const counter = screen.getByText('2 / 4')
    expect(counter).toBeInTheDocument()
  })

  it('highlights active thumbnail with border', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const secondThumbnail = screen.getByRole('button', {
      name: 'View image 2',
    })
    await user.click(secondThumbnail)

    expect(secondThumbnail).toHaveAttribute('aria-current', 'page')
  })

  it('navigates with arrow key left', async () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    // Click second thumbnail first
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', {
        name: 'View image 2',
      }),
    )

    expect(screen.getByText('2 / 4')).toBeInTheDocument()

    // Press left arrow
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    await waitFor(() => {
      expect(screen.getByText('1 / 4')).toBeInTheDocument()
    })
  })

  it('navigates with arrow key right', async () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    expect(screen.getByText('1 / 4')).toBeInTheDocument()

    // Press right arrow
    fireEvent.keyDown(window, { key: 'ArrowRight' })

    await waitFor(() => {
      expect(screen.getByText('2 / 4')).toBeInTheDocument()
    })
  })

  it('jumps to first image with Home key', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    // Click last thumbnail
    await user.click(
      screen.getByRole('button', {
        name: 'View image 4',
      }),
    )

    expect(screen.getByText('4 / 4')).toBeInTheDocument()

    // Press Home key
    fireEvent.keyDown(window, { key: 'Home' })

    await waitFor(() => {
      expect(screen.getByText('1 / 4')).toBeInTheDocument()
    })
  })

  it('jumps to last image with End key', async () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    expect(screen.getByText('1 / 4')).toBeInTheDocument()

    // Press End key
    fireEvent.keyDown(window, { key: 'End' })

    await waitFor(() => {
      expect(screen.getByText('4 / 4')).toBeInTheDocument()
    })
  })

  it('disables previous button on first image', async () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const prevButton = screen.getByRole('button', {
      name: 'Previous image',
    })

    expect(prevButton).toBeDisabled()
  })

  it('disables next button on last image', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    // Click last thumbnail
    await user.click(
      screen.getByRole('button', {
        name: 'View image 4',
      }),
    )

    const nextButton = screen.getByRole('button', {
      name: 'Next image',
    })

    expect(nextButton).toBeDisabled()
  })

  it('shows placeholder image if no images provided', () => {
    render(<ImageGallery images={[]} title="Test Studio" />)

    const heroImage = screen.getByRole('img', {
      name: /Test Studio - image 1 of 1/i,
    })

    expect(heroImage).toBeInTheDocument()
  })

  it('provides keyboard navigation hint text', () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const hint = screen.getByText(/Use arrow keys or click thumbnails/i)
    expect(hint).toBeInTheDocument()
  })

  it('does not show hint for single image', () => {
    render(<ImageGallery images={['image1.jpg']} title="Test Studio" />)

    const hint = screen.queryByText(/Use arrow keys or click thumbnails/i)
    expect(hint).not.toBeInTheDocument()
  })

  it('next/previous buttons update image on click', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const nextButton = screen.getByRole('button', {
      name: 'Next image',
    })

    await user.click(nextButton)

    expect(screen.getByText('2 / 4')).toBeInTheDocument()

    const prevButton = screen.getByRole('button', {
      name: 'Previous image',
    })

    await user.click(prevButton)

    expect(screen.getByText('1 / 4')).toBeInTheDocument()
  })
})


describe('ImageGallery Component', () => {
  const mockImages = [
    'image1.jpg',
    'image2.jpg',
    'image3.jpg',
    'image4.jpg',
  ]

  it('renders hero image with first image as default', () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const heroImage = screen.getByRole('img', {
      name: /Test Studio - image 1 of 4/i,
    })

    expect(heroImage).toBeInTheDocument()
  })

  it('displays image counter badge', () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const counter = screen.getByText('1 / 4')
    expect(counter).toBeInTheDocument()
  })

  it('renders thumbnail strip for multiple images', () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const thumbnails = screen.getAllByRole('button', {
      name: /View image \d+/i,
    })

    expect(thumbnails.length).toBe(4)
  })

  it('hides thumbnails and counter for single image', () => {
    render(<ImageGallery images={['image1.jpg']} title="Test Studio" />)

    const counter = screen.queryByText(/\d+ \/ \d+/)
    const thumbnails = screen.queryAllByRole('button', {
      name: /View image/i,
    })

    expect(counter).not.toBeInTheDocument()
    expect(thumbnails.length).toBe(0)
  })

  it('clicking thumbnail switches main image', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    // Click second thumbnail
    const secondThumbnail = screen.getByRole('button', {
      name: 'View image 2',
    })
    await user.click(secondThumbnail)

    const counter = screen.getByText('2 / 4')
    expect(counter).toBeInTheDocument()
  })

  it('highlights active thumbnail with border', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const secondThumbnail = screen.getByRole('button', {
      name: 'View image 2',
    })
    await user.click(secondThumbnail)

    expect(secondThumbnail).toHaveAttribute('aria-current', 'page')
  })

  it('navigates with arrow key left', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    // Click second thumbnail first
    await user.click(
      screen.getByRole('button', {
        name: 'View image 2',
      }),
    )

    expect(screen.getByText('2 / 4')).toBeInTheDocument()

    // Press left arrow
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    await waitFor(() => {
      expect(screen.getByText('1 / 4')).toBeInTheDocument()
    })
  })

  it('navigates with arrow key right', async () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    expect(screen.getByText('1 / 4')).toBeInTheDocument()

    // Press right arrow
    fireEvent.keyDown(window, { key: 'ArrowRight' })

    await waitFor(() => {
      expect(screen.getByText('2 / 4')).toBeInTheDocument()
    })
  })

  it('jumps to first image with Home key', async () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    // Click last thumbnail
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', {
        name: 'View image 4',
      }),
    )

    expect(screen.getByText('4 / 4')).toBeInTheDocument()

    // Press Home key
    fireEvent.keyDown(window, { key: 'Home' })

    await waitFor(() => {
      expect(screen.getByText('1 / 4')).toBeInTheDocument()
    })
  })

  it('jumps to last image with End key', async () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    expect(screen.getByText('1 / 4')).toBeInTheDocument()

    // Press End key
    fireEvent.keyDown(window, { key: 'End' })

    await waitFor(() => {
      expect(screen.getByText('4 / 4')).toBeInTheDocument()
    })
  })

  it('disables previous button on first image', async () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const prevButton = screen.getByRole('button', {
      name: 'Previous image',
    })

    expect(prevButton).toBeDisabled()
  })

  it('disables next button on last image', async () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    // Click last thumbnail
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', {
        name: 'View image 4',
      }),
    )

    const nextButton = screen.getByRole('button', {
      name: 'Next image',
    })

    expect(nextButton).toBeDisabled()
  })

  it('shows placeholder image if no images provided', () => {
    render(<ImageGallery images={[]} title="Test Studio" />)

    const heroImage = screen.getByRole('img', {
      name: /Test Studio - image 1 of 1/i,
    })

    expect(heroImage).toBeInTheDocument()
  })

  it('provides keyboard navigation hint text', () => {
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const hint = screen.getByText(/Use arrow keys or click thumbnails/i)
    expect(hint).toBeInTheDocument()
  })

  it('does not show hint for single image', () => {
    render(<ImageGallery images={['image1.jpg']} title="Test Studio" />)

    const hint = screen.queryByText(/Use arrow keys or click thumbnails/i)
    expect(hint).not.toBeInTheDocument()
  })

  it('next/previous buttons update image on click', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} title="Test Studio" />)

    const nextButton = screen.getByRole('button', {
      name: 'Next image',
    })

    await user.click(nextButton)

    expect(screen.getByText('2 / 4')).toBeInTheDocument()

    const prevButton = screen.getByRole('button', {
      name: 'Previous image',
    })

    await user.click(prevButton)

    expect(screen.getByText('1 / 4')).toBeInTheDocument()
  })
})
