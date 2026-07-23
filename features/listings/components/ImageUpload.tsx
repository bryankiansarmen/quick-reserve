'use client'

import { useState, ChangeEvent, DragEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { validateImageFile, MAX_IMAGE_SIZE_BYTES } from '../validation'

interface ImageUploadProps {
  initialImages?: string[]
}

export function ImageUpload({ initialImages = [] }: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(initialImages)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  async function handleFiles(files: FileList | File[]) {
    setError(null)
    const fileList = Array.from(files)

    if (fileList.length === 0) return

    if (images.length + fileList.length > 10) {
      setError('You can upload a maximum of 10 images per listing.')
      return
    }

    // Validate client side before uploading
    for (const file of fileList) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        setError(validation.error || 'Invalid image file.')
        return
      }
    }

    setUploading(true)
    const supabase = createClient()

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('You must be signed in to upload images.')
        setUploading(false)
        return
      }

      const uploadedUrls: string[] = []

      for (const file of fileList) {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          setError(`Upload failed: ${uploadError.message}`)
          setUploading(false)
          return
        }

        const { data: publicUrlData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName)

        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl)
        }
      }

      setImages((prev) => [...prev, ...uploadedUrls])
    } catch (err) {
      setError('An unexpected error occurred during file upload.')
    } finally {
      setUploading(false)
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  function removeImage(indexToRemove: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  return (
    <div className="space-y-4">
      {/* Hidden input fields for FormData submission */}
      {images.map((url, idx) => (
        <input key={`${url}-${idx}`} type="hidden" name="images" value={url} />
      ))}

      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Listing photos <span className="text-slate-400 font-normal">(optional, up to 10 photos, max 5MB each)</span>
        </label>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {images.length}/10 uploaded
        </span>
      </div>

      {/* Error message */}
      {error && (
        <p id="image-upload-error" className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Drag & Drop Upload Zone */}
      {images.length < 10 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/20'
              : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600'
          }`}
        >
          <input
            id="image-upload-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            onChange={handleFileInputChange}
            disabled={uploading}
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
            aria-label="Upload listing images"
          />

          <svg
            className="mb-2 h-8 w-8 text-slate-400 dark:text-slate-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>

          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {uploading ? (
              <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading image...
              </span>
            ) : (
              <span>
                Drag and drop photos here, or <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            JPG, PNG, WebP, GIF, or AVIF up to 5MB
          </p>
        </div>
      )}

      {/* Thumbnails grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {images.map((url, idx) => (
            <div key={`${url}-${idx}`} className="group relative aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
              {/* Image thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Listing image ${idx + 1}`}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                aria-label={`Remove image ${idx + 1}`}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-md transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
