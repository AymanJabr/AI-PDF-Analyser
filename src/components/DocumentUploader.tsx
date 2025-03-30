'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentUploaderProps {
  onDocumentProcessed: (documentId: string) => void
}

export default function DocumentUploader({
  onDocumentProcessed,
}: DocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Only process PDF files
      const pdfFile = acceptedFiles.find(
        (file) => file.type === 'application/pdf'
      )

      if (!pdfFile) {
        setError('Please upload a PDF file')
        return
      }

      try {
        setIsUploading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', pdfFile)

        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Error processing document')
        }

        const data = await response.json()
        onDocumentProcessed(data.documentId)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred while processing the document'
        )
      } finally {
        setIsUploading(false)
      }
    },
    [onDocumentProcessed]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isUploading,
  })

  return (
    <div className='w-full max-w-2xl mx-auto'>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          isUploading && 'pointer-events-none opacity-80'
        )}
      >
        <input {...getInputProps()} />

        <div className='flex flex-col items-center justify-center space-y-3'>
          {isUploading ? (
            <>
              <Loader2 className='h-10 w-10 text-blue-500 animate-spin' />
              <p className='text-sm text-gray-700'>
                Processing your document...
              </p>
            </>
          ) : (
            <>
              <FileUp className='h-10 w-10 text-gray-600' />
              <div>
                <p className='text-base font-medium text-gray-800'>
                  {isDragActive
                    ? 'Drop your PDF here'
                    : 'Drag & drop your PDF here'}
                </p>
                <p className='text-sm text-gray-700 mt-1'>
                  or click to browse files
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && <div className='mt-3 text-red-500 text-sm'>{error}</div>}
    </div>
  )
}
