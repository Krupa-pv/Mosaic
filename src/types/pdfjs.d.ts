// pdfjs-dist ships types for the package root but not for the explicit
// build entry. We import "pdfjs-dist/build/pdf.mjs" on purpose: the bare
// specifier can resolve to a CJS build that then fails to find its
// worker. The runtime shape is identical, so borrow the root's types.
declare module "pdfjs-dist/build/pdf.mjs" {
  export * from "pdfjs-dist";
}
