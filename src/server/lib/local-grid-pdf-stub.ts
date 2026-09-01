/**
 * The PDF renderer is used only from a browser click handler. Keeping its
 * large canvas and PDF dependencies out of the Cloudflare SSR build avoids
 * spending Worker bundle capacity on code that cannot run there.
 */
export async function downloadLocalGridPdf(): Promise<never> {
  throw new Error("Local grid PDF export is only available in the browser");
}
