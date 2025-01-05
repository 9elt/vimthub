import { Vim } from "./vim";

const SELECTOR = "textarea[name$='comment[body]']" as "textarea";

const style = document.createElement("style");

style.textContent = `${SELECTOR} {
    font-family: monospace !important;
    min-height: 256px !important;
}`;

document.head.appendChild(style);

let current = document.querySelectorAll(SELECTOR);

function update() {
    const update = document.querySelectorAll(SELECTOR);

    for (const textarea of update) {
        let _skip = false;

        for (const prev of current) {
            if (textarea === prev) {
                _skip = true;
                break;
            }
        }

        if (!_skip) {
            console.log("found new textarea", textarea);
            new Vim(textarea);
        }
    }

    current = update;
}

new MutationObserver(update).observe(document.body, {
    childList: true,
    subtree: true,
});
