import { Vim } from "./vim";

const SELECTOR = "textarea[name$='comment[body]']" as "textarea";

const style = document.createElement("style");

style.textContent = `\
${SELECTOR} {
    font-family: monospace !important;
    min-height: 256px !important;
}

.vimthub-status {
    padding: 6px 12px;
    display: flex;
    justify-content: space-between;
    border-top: var(--borderWidth-thin) solid var(--borderColor-default, var(--color-border-default));
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
            console.log("Starting vim on", textarea);

            const _mode = document.createElement("span");
            _mode.textContent = "NORMAL";

            const _cmdseq = document.createElement("span");
            _cmdseq.textContent = "";

            if (textarea.parentElement) {
                const _status = document.createElement("div");
                _status.className = "vimthub-status";
                _status.appendChild(_mode);
                _status.appendChild(_cmdseq);
                textarea.parentElement.appendChild(_status);
            }

            new Vim(textarea, {
                onModeChange: (mode) => {
                    _mode.textContent = mode;
                },
                onCmdSeq: (seq) => {
                    _cmdseq.textContent = seq;
                }
            });
        }
    }

    current = update;
}

new MutationObserver(update).observe(document.body, {
    childList: true,
    subtree: true,
});
