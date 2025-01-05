import { readdir } from "node:fs/promises";
import { CONTENT_ENTRY, POPUP_ENTRY, WORKER_ENTRY } from "./build.config";
import { MANIFEST, NAME } from "../manifest";

if (!NAME) {
    console.error("please provide a NAME in manifest.js");
    process.exit(1);
}

const entrypoints = [
    CONTENT_ENTRY,
    POPUP_ENTRY,
    WORKER_ENTRY,
].filter(Boolean);

if (entrypoints.length === 0) {
    console.error("there is nothing to build");
    process.exit(1);
}

for (const browser of ["chrome", "firefox"]) {
    const build = await Bun.build({
        entrypoints,
        naming: entrypoints.length === 1 ? name(entrypoints) + ".[ext]" :
            "[dir].[ext]",
        outdir: "./dist/" + browser,
        minify: false,
    });

    if (!build.success) {
        console.error(browser, build);
        process.exit(1);
    }

    if (POPUP_ENTRY) {
        await Bun.write(
            "./dist/" + browser + "/popup.html",
            popupHTML(NAME)
        );
    }

    await Bun.write(
        "./dist/" + browser + "/manifest.json",
        JSON.stringify(MANIFEST(browser), null, 4)
    );

    for (const media of await readdir("./media")) {
        if (media.includes(".")) {
            await Bun.write(
                "./dist/" + browser + "/media/" + media,
                Bun.file("./media/" + media)
            );
        }
    }
}

/**
 * @param {string} title
 */
function popupHTML(title) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body>
   <script src="./popup.js"></script>
</body>
</html>
`;
}

/**
 * @param {string[]} entrypoints
 */
function name(entrypoints) {
    const [entrypoint] = entrypoints;
    const [src, name] = entrypoint.split("/");
    return name;
}
