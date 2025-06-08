import { ProcessedDocument } from './index'

declare global {
    // eslint-disable-next-line no-var
    var __pdfDocuments: Record<string, ProcessedDocument> | undefined
}

export { } 