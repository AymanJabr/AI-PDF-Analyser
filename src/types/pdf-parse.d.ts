declare module 'pdf-parse/lib/pdf-parse.js' {
  /**
   * PDF document information dictionary
   */
  interface PDFDocumentInfo {
    PDFFormatVersion?: string
    IsAcroFormPresent?: boolean
    IsXFAPresent?: boolean
    IsCollectionPresent?: boolean
    Title?: string
    Author?: string
    Subject?: string
    Keywords?: string
    Creator?: string
    Producer?: string
    CreationDate?: string | Date
    ModDate?: string | Date
    Trapped?: string
    [key: string]: unknown // For any additional custom properties
  }

  /**
   * PDF document metadata (typically XMP format)
   */
  interface PDFMetadata {
    'dc:title'?: string
    'dc:creator'?: string | string[]
    'dc:description'?: string
    'dc:subject'?: string | string[]
    'pdf:Keywords'?: string
    'pdf:Producer'?: string
    'pdf:CreationDate'?: string
    'pdf:ModDate'?: string
    'xmp:CreatorTool'?: string
    'xmp:CreateDate'?: string
    'xmp:ModifyDate'?: string
    [key: string]: unknown // For any additional properties
  }

  /**
   * Data returned by pdf-parse
   */
  interface PDFData {
    text: string
    numpages: number
    info: PDFDocumentInfo
    metadata: PDFMetadata
    version?: string
    numrender?: number
  }

  function pdfParse(buffer: Buffer): Promise<PDFData>

  export default pdfParse
}
