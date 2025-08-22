declare module 'html-to-docx' {
  interface HtmlToDocxOptions {
    table?: {
      row?: {
        cantSplit?: boolean;
      };
    };
    footer?: boolean;
    pageNumber?: boolean;
    [key: string]: any;
  }

  function htmlToDocx(
    htmlString: string,
    headerHTMLString?: string | null,
    options?: HtmlToDocxOptions
  ): Promise<Buffer>;

  export default htmlToDocx;
}
