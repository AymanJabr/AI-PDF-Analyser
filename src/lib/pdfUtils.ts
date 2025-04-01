import { pdfjs } from 'react-pdf';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export async function processPDF(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument(new Uint8Array(arrayBuffer)).promise;
  
  const pageContents: string[] = [];
  let totalText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => 'str' in item ? item.str : '')
      .join(' ');
    pageContents.push(pageText);
    totalText += pageText + '\n';
  }
  
  return {
    text: totalText,
    pageContents,
    pageCount: pdf.numPages
  };
} 