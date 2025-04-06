'use client'

import { useState, useEffect } from 'react'
import { FileText, Clock, Trash2 } from 'lucide-react'
import { ProcessedDocument } from '@/types'

interface DocumentListProps {
    onSelectDocument: (documentId: string) => void
}

export default function DocumentList({ onSelectDocument }: DocumentListProps) {
    const [documents, setDocuments] = useState<ProcessedDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({})

    const fetchDocuments = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/analyze')

            if (!response.ok) {
                throw new Error('Failed to fetch documents')
            }

            const data = await response.json()
            setDocuments(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
            console.error('Error fetching documents:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
    }, [])

    const handleDeleteDocument = async (documentId: string, event: React.MouseEvent) => {
        event.stopPropagation()

        try {
            setIsDeleting(prev => ({ ...prev, [documentId]: true }))

            const response = await fetch(`/api/analyze?documentId=${documentId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('Failed to delete document')
            }

            // Refresh the document list
            await fetchDocuments()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while deleting')
            console.error('Error deleting document:', err)
        } finally {
            setIsDeleting(prev => ({ ...prev, [documentId]: false }))
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-6">
                <p className="text-red-500 mb-2">Failed to load documents</p>
                <p className="text-sm text-gray-600">{error}</p>
            </div>
        )
    }

    if (documents.length === 0) {
        return (
            <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No documents uploaded yet</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500">Previous documents</h3>
            <ul className="divide-y divide-gray-200 border rounded-lg">
                {documents.map((doc) => (
                    <li key={doc.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-center">
                            <div className="flex items-start space-x-3">
                                <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                                    <div className="flex items-center mt-1">
                                        <Clock className="h-3.5 w-3.5 text-gray-400 mr-1" />
                                        <p className="text-xs text-gray-500">{doc.dateUploaded}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}</p>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                                    disabled={isDeleting[doc.id]}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md disabled:opacity-50 transition-colors"
                                    title="Delete document"
                                >
                                    {isDeleting[doc.id] ? (
                                        <div className="h-4 w-4 border-2 border-t-transparent border-red-400 rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </button>
                                <button
                                    onClick={() => onSelectDocument(doc.id)}
                                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                                >
                                    Select
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
} 