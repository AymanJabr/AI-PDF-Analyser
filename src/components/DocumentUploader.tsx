'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

// Create a client-side only wrapper component
const ClientDocumentUploader = dynamic(() => import('./ClientDocumentUploader'), {
  ssr: false
})

interface DocumentUploaderProps {
  onDocumentProcessed: (documentId: string) => void
}

export default function DocumentUploader(props: DocumentUploaderProps) {
  return <ClientDocumentUploader {...props} />
}
