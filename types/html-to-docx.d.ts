declare module "html-to-docx" {
  // Minimal signature to satisfy TS; widen as needed.
  const htmlToDocx: (
    html: string,
    styles?: any | null,
    options?: any
  ) => Promise<ArrayBuffer | Uint8Array | Buffer>;
  export default htmlToDocx;
}
