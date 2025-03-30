'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { ProcessedDocument } from '@/types'

interface DocumentPreviewProps {
  document: ProcessedDocument
}

export default function DocumentPreview({ document }: DocumentPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0)

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(document.pageCount - 1, prev + 1))
  }

  const handlePageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pageIndex = parseInt(e.target.value, 10)
    setCurrentPage(pageIndex)
  }

  // Create an array of page numbers for the pagination display
  const pageNumbers = Array.from({ length: document.pageCount }, (_, i) => i)

  return (
    <div className='flex flex-col h-full border rounded-lg overflow-hidden bg-white'>
      <div className='flex items-center justify-between p-2 sm:p-3 border-b bg-gray-50'>
        <div className='flex items-center max-w-[70%]'>
          <FileText className='h-4 w-4 sm:h-5 sm:w-5 text-gray-700 mr-1 sm:mr-2 flex-shrink-0' />
          <h3 className='font-medium text-gray-900 truncate text-sm sm:text-base'>
            {document.name}
          </h3>
        </div>
        <div className='flex items-center text-xs sm:text-sm text-gray-700'>
          Page {currentPage + 1} of {document.pageCount}
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-2 sm:p-4'>
        <div className='whitespace-pre-wrap bg-gray-50 p-2 sm:p-4 rounded border font-mono text-xs sm:text-sm text-gray-800'>
          {document.pageContents[currentPage]}
        </div>
      </div>

      <div className='p-2 sm:p-3 border-t flex flex-col sm:flex-row items-center justify-between'>
        <div className='flex items-center'>
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 0}
            className='flex items-center p-1 rounded hover:bg-gray-100 disabled:opacity-70 disabled:hover:bg-transparent transition-colors text-xs sm:text-sm'
          >
            <ChevronLeft className='h-4 w-4 sm:h-5 sm:w-5' />
            <span className='ml-1'>Previous</span>
          </button>

          <button
            onClick={handleNextPage}
            disabled={currentPage === document.pageCount - 1}
            className='flex items-center p-1 rounded hover:bg-gray-100 disabled:opacity-70 disabled:hover:bg-transparent transition-colors text-xs sm:text-sm ml-2'
          >
            <span className='mr-1'>Next</span>
            <ChevronRight className='h-4 w-4 sm:h-5 sm:w-5' />
          </button>
        </div>

        <div className='mt-2 sm:mt-0 flex items-center'>
          <label
            htmlFor='page-select'
            className='text-xs sm:text-sm text-gray-900 mr-2'
          >
            Go to page:
          </label>
          <select
            id='page-select'
            value={currentPage}
            onChange={handlePageSelect}
            className='text-xs sm:text-sm border rounded p-1 text-gray-900'
          >
            {pageNumbers.map((pageIndex) => (
              <option key={pageIndex} value={pageIndex}>
                {pageIndex + 1}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
