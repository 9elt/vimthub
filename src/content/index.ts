import { Vim } from "./vim";

const style = document.createElement("style");

style.textContent = `textarea {
    font-family: monospace !important;
    min-height: 256px !important;
}`;

document.head.appendChild(style);

const SELECTOR = "textarea[name$='comment[body]']" as "textarea";

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
