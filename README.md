# AI PDF Analyzer

A Next.js application that allows users to upload PDF documents, extract text using OCR, and ask natural language questions about the content using AI. The AI provides answers with references to the specific locations in the document where the information was found.

## Features

- **PDF Upload**: Upload any PDF document for analysis
- **Text Extraction**: Extract text from PDFs, including OCR capabilities for scanned documents
- **AI Chat Interface**: Ask questions about the document and get accurate answers
- **Source Citations**: AI responses include references to the specific parts of the document
- **Multiple AI Provider Support**: Configure either OpenAI or Anthropic API keys

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **PDF Processing**: PDF.js, Tesseract.js for OCR
- **AI Integration**: LangChain with OpenAI and Anthropic support
- **Document Analysis**: Text chunking and retrieval for accurate references

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Configure your API key (OpenAI or Anthropic) in the "API Settings" tab
2. Upload a PDF document in the "Upload Document" tab
3. Switch to the "Chat with Document" tab
4. Ask questions about the document content

## Important Notes

- This application does not store or send your API keys to any server; they are stored in your browser's localStorage
- Document processing happens on the server, but the AI interactions use your API key
- For better OCR results with scanned documents, ensure the documents are clear and well-scanned

## License

MIT

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Uses [LangChain](https://js.langchain.com/) for AI interactions
- Uses [Tesseract.js](https://github.com/naptha/tesseract.js) for OCR capabilities
