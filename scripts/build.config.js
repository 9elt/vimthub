export const CONTENT_ENTRY = findf("src/content/index", ".tsx", ".jsx", ".ts", ".js");
export const CONTENT_FILE = CONTENT_ENTRY && "./content.js";

export const POPUP_ENTRY = findf("src/popup/index", ".tsx", ".jsx", ".ts", ".js");
export const POPUP_FILE = POPUP_ENTRY && "popup.html";

export const WORKER_ENTRY = findf("src/worker/index", ".ts", ".js");
export const WORKER_FILE = WORKER_ENTRY && "./worker.js";

export const ICON_16 = findf("media/logo-16", ".png");
export const ICON_32 = findf("media/logo-32", ".png");
export const ICON_48 = findf("media/logo-48", ".png");
export const ICON_128 = findf("media/logo-128", ".png");
export const ICON = ICON_16 || ICON_32 || ICON_48 || ICON_128;

/**
 * @param {string} path
 * @param {string[]} exts
 */
function findf(path, ...exts) {
    for (const ext of exts) {
        if (Bun.file(path + ext).size > 1) {
            return path + ext;
        }
    }
}
