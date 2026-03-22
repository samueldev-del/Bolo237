declare module 'jspdf/dist/jspdf.umd.min.js' {
  export class jsPDF {
    constructor(options?: { unit?: string; format?: string });
    internal: { pageSize: { getWidth: () => number } };
    setFont(family: string, style: string): void;
    setFontSize(size: number): void;
    text(text: string | string[], x: number, y: number): void;
    splitTextToSize(text: string, size: number): string[];
    save(filename: string): void;
  }
}
