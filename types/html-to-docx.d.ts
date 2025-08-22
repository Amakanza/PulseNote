declare module "html-to-docx" {
  export default function htmlToDocx(
    html: string,
    headerHtml?: string | null,
    options?: any
  ): Promise<ArrayBuffer | Uint8Array | Buffer>;
}
