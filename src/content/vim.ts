const TAB_WIDTH = 4;

const PAGE_SIZE = 16;

const REPEAT_LIMIT = 128;

const UNDO_LIMIT = 1024;

/*
 
trees
 
*/

enum Mode {
    COMMAND,
    INSERT,
    VISUAL,
};

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type Key = Digit | "ArrowLeft" | "ArrowDown" | "ArrowUp" | "ArrowRight"
    | "Enter" | "Backspace" | "Tab" | "Escape" | "PageUp" | "PageDown"
    | "End" | "Home" | "Insert" | "Delete"
    | "a" | "A" | "b" | "B" | "c" | "C" | "d" | "D" | "e" | "E" | "f" | "g"
    | "G" | "h" | "i" | "j" | "J" | "k" | "l" | "o" | "O" | "p" | "P" | "r"
    | "s" | "t" | "u" | "v" | "w" | "W" | "x" | "y" | "$" | "_" | "." | "'"
    | '"' | "`" | "(" | ")" | "[" | "]" | "{" | "}" | "<" | ">"
    | "C-b" | "C-c" | "C-d" | "C-f" | "C-r" | "C-s" | "C-u";

type TextRange = [number, number];

type Select = (text: string, pos: number, vim: Vim) => TextRange;

type Move = (text: string, pos: number, vim: Vim) => number;

type Action = (vim: Vim, data: VimNodeData) => void;

type VimNodeData = Partial<{
    mode: Mode;
    select: Select;
    move: Move;
    action: Action;
    digit: Digit;
    dontSaveUndoState: boolean;
    readNextChar: boolean;
    nextChar: string;
    offsetSelectionEnd: number;
}>;

type VimNodes = {
    [K in Key]?: VimNode;
};

class VimNode {
    constructor(
        public data: VimNodeData = {},
        public nodes: VimNodes = {}
    ) { };
};

function isLeaf(vnode: VimNode): boolean {
    for (const _ in vnode.nodes) {
        return false;
    }
    return true;
}

const digits = {
    "0": new VimNode({ action: actionDigit, digit: "0" }),
    "1": new VimNode({ action: actionDigit, digit: "1" }),
    "2": new VimNode({ action: actionDigit, digit: "2" }),
    "3": new VimNode({ action: actionDigit, digit: "3" }),
    "4": new VimNode({ action: actionDigit, digit: "4" }),
    "5": new VimNode({ action: actionDigit, digit: "5" }),
    "6": new VimNode({ action: actionDigit, digit: "6" }),
    "7": new VimNode({ action: actionDigit, digit: "7" }),
    "8": new VimNode({ action: actionDigit, digit: "8" }),
    "9": new VimNode({ action: actionDigit, digit: "9" }),
};

const navigation = (data?: VimNodeData) => ({
    "0": new VimNode({ ...data, move: lineStart }),
    "_": new VimNode({ ...data, move: moveToFirstWordStart }),
    "$": new VimNode({ ...data, move: lineEnd }),
    "ArrowLeft": new VimNode({ ...data, move: moveLeft }),
    "ArrowDown": new VimNode({ ...data, move: moveDown }),
    "ArrowUp": new VimNode({ ...data, move: moveUp }),
    "ArrowRight": new VimNode({ ...data, move: moveRight }),
    "h": new VimNode({ ...data, move: moveLeft }),
    "j": new VimNode({ ...data, move: moveDown }),
    "k": new VimNode({ ...data, move: moveUp }),
    "l": new VimNode({ ...data, move: moveRight }),
    "Enter": new VimNode({ ...data, move: moveToWordNextLine }),
    "Backspace": new VimNode({ ...data, move: moveLeft }),
    "w": new VimNode({ ...data, move: moveToNextWord }),
    "W": new VimNode({ ...data, move: moveToNextWordPlus }),
    "e": new VimNode({ ...data, move: moveToEndWord }),
    "E": new VimNode({ ...data, move: moveToEndWordPlus }),
    "b": new VimNode({ ...data, move: moveToPreviousWord }),
    "B": new VimNode({ ...data, move: moveToPreviousWordPlus }),
    "g": new VimNode({}, {
        "g": new VimNode({ ...data, move: moveToVeryBeginning }),
    }),
    "G": new VimNode({ ...data, move: moveToVeryEnd }),
    "C-b": new VimNode({ ...data, move: movePageUp }),
    "C-f": new VimNode({ ...data, move: movePageDown }),
    "C-u": new VimNode({ ...data, move: moveHalfPageUp }),
    "C-d": new VimNode({ ...data, move: moveHalfPageDown }),
    "f": new VimNode({ ...data, move: moveToChar, readNextChar: true, offsetSelectionEnd: 1 }),
    "t": new VimNode({ ...data, move: moveBeforeChar, readNextChar: true, offsetSelectionEnd: 1 }),
});

const selectors = (data?: VimNodeData) => ({
    "a": new VimNode(data, {
        "p": new VimNode({ select: selectParagraphWithSpacesAfter }),
        "w": new VimNode({ select: selectWordWithSpacesAfter }),
        "W": new VimNode({ select: selectWordPlusWithSpacesAfter }),
        "'": new VimNode({ select: selectSingleQuotes }),
        '"': new VimNode({ select: selectDoubleQuotes }),
        '`': new VimNode({ select: selectBacktick }),
        "(": new VimNode({ select: selectBrackets }),
        ")": new VimNode({ select: selectBrackets }),
        "[": new VimNode({ select: selectSquares }),
        "]": new VimNode({ select: selectSquares }),
        "{": new VimNode({ select: selectBraces }),
        "}": new VimNode({ select: selectBraces }),
        "<": new VimNode({ select: selectAngles }),
        ">": new VimNode({ select: selectAngles }),
    }),
    "i": new VimNode(data, {
        "p": new VimNode({ select: selectParagraph }),
        "w": new VimNode({ select: selectWord }),
        "W": new VimNode({ select: selectWordPlus }),
        "'": new VimNode({ select: inside(selectSingleQuotes) }),
        '"': new VimNode({ select: inside(selectDoubleQuotes) }),
        '`': new VimNode({ select: inside(selectBacktick) }),
        "(": new VimNode({ select: inside(selectBrackets) }),
        ")": new VimNode({ select: inside(selectBrackets) }),
        "[": new VimNode({ select: inside(selectSquares) }),
        "]": new VimNode({ select: inside(selectSquares) }),
        "{": new VimNode({ select: inside(selectBraces) }),
        "}": new VimNode({ select: inside(selectBraces) }),
        "<": new VimNode({ select: inside(selectAngles) }),
        ">": new VimNode({ select: inside(selectAngles) }),
    }),
});

const baseSelectors = selectors();
const visualSelectors = selectors({ action: actionSetVisualSelection });

const baseNavigation = navigation();
const moveNavigation = navigation({ action: actionMove });

const commandTree = new VimNode({}, {
    ...moveNavigation,
    ...digits,
    "a": new VimNode({ action: actionAppend, mode: Mode.INSERT }),
    "A": new VimNode({ action: actionAppendToEnd, mode: Mode.INSERT }),
    "c": new VimNode({ action: actionDeleteRange, mode: Mode.INSERT }, {
        ...baseNavigation,
        ...baseSelectors,
        "c": new VimNode({ select: selectLine }),
        "w": new VimNode({ select: selectToWordBound }),
        "W": new VimNode({ select: selectToWordBoundPlus }),
    }),
    "C": new VimNode({ action: actionDeleteRange, move: lineEnd, mode: Mode.INSERT }),
    "d": new VimNode({ action: actionDeleteRange, mode: Mode.COMMAND }, {
        ...baseNavigation,
        ...baseSelectors,
        "d": new VimNode({ select: selectLineNL }),
        "w": new VimNode({ select: selectToNextWord }),
        "W": new VimNode({ select: selectToNextWordPlus }),
    }),
    "D": new VimNode({ action: actionDeleteRange, move: lineEnd, mode: Mode.COMMAND }),
    "i": new VimNode({ action: actionSetMode, mode: Mode.INSERT }),
    "J": new VimNode({ action: actionMergeLines }),
    "o": new VimNode({ action: actionInsertLineAfter, mode: Mode.INSERT }),
    "O": new VimNode({ action: actionInsertLineBefore, mode: Mode.INSERT }),
    "p": new VimNode({ action: actionPasteAfter }),
    "P": new VimNode({ action: actionPasteBefore }),
    "s": new VimNode({ action: actionDeleteChar, mode: Mode.INSERT }),
    "u": new VimNode({ action: actionUndo, dontSaveUndoState: true }),
    "C-r": new VimNode({ action: actionRedo, dontSaveUndoState: true }),
    "v": new VimNode({ action: actionSetMode, mode: Mode.VISUAL }),
    "x": new VimNode({ action: actionDeleteChar }),
    "r": new VimNode({ action: actionReplaceChar, readNextChar: true }),
    "y": new VimNode({ action: actionYankRange }, {
        ...baseNavigation,
        ...baseSelectors,
        "y": new VimNode({ select: selectLineNL }),
        "w": new VimNode({ select: selectToNextWord }),
        "W": new VimNode({ select: selectToNextWordPlus }),
    }),
    ">": new VimNode({ action: actionIncreaseIndent }, {
        ...baseNavigation,
        ...baseSelectors,
        ">": new VimNode({ select: selectLine }),
    }),
    "<": new VimNode({ action: actionDecreaseIndent }, {
        ...baseNavigation,
        ...baseSelectors,
        "<": new VimNode({ select: selectLine }),
    }),
    ".": new VimNode({ action: actionRepeatLastAction }),
});

const visualTree = new VimNode({ action: actionMove }, {
    ...moveNavigation,
    ...visualSelectors,
    ...digits,
    "d": new VimNode({ action: actionDeleteVisualSelection, mode: Mode.COMMAND }),
    "c": new VimNode({ action: actionDeleteVisualSelection, mode: Mode.INSERT }),
    "y": new VimNode({ action: actionYankVisualSelection, mode: Mode.COMMAND }),
    "p": new VimNode({ action: actionPasteIntoVisualSelection, mode: Mode.COMMAND }),
    // TODO: ">"
    // TODO: "<"
});

/*
 
vim
 
*/

const RESERVED_KEYS = ["Shift", "CapsLock", "Control", "Meta", "Alt", "AltGraph"];

type History = {
    text: string;
    caret: number;
};

export class Vim {
    mode: Mode = Mode.COMMAND;
    node: VimNode = commandTree;
    data: VimNodeData = {};
    // NOTE: command sequence
    cmdseq: string = "";
    // NOTE: keyseq is used to store the last key sequence,
    // including INSERT and Esc keys
    keyseq: string[] = [];
    // NOTE: modseq is the last keyseq that modified the text
    modseq: string[] = [];
    digits: string = "";
    clipboard: string = "";
    redo: History[] = [];
    undo: History[] = [];
    allowClipboardReset: boolean = false;
    selectionStart: number | null = null;
    historyBeforeInsert: History | null = null;
    constructor(
        public textarea: HTMLTextAreaElement,
        public options: {
            onModeChange?: (mode: "NORMAL" | "INSERT" | "VISUAL") => void;
            onCmdSeq?: (cmdseq: string) => void;
        } = {}
    ) {
        textarea.addEventListener("keydown", (event) => {
            if (!RESERVED_KEYS.includes(event.key)) {
                const key = event.ctrlKey
                    ? "C-" + event.key
                    : event.key;

                if (onKey(this, key)) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        });
    };
};

function onKey(vim: Vim, key: Key | string): boolean {
    vim.keyseq.push(key);

    if (key === "Escape" || key === "C-c" || key === "C-s") {
        if (vim.mode === Mode.INSERT) {
            saveUndoState(vim, vim.historyBeforeInsert!);

            if (vim.keyseq.length > 1) {
                vim.modseq = vim.keyseq;
            }
        }

        vim.keyseq = [];

        setMode(vim, Mode.COMMAND);
        resetCommand(vim);

        return true;
    }

    if (vim.mode === Mode.INSERT) {
        if (key === "Enter") {
            actionEnterIndend(vim);
            return true;
        }

        if (key === "Tab") {
            actionTab(vim);
            return true;
        }

        return false;
    }

    if (vim.options.onCmdSeq) {
        vim.options.onCmdSeq(vim.cmdseq + key);
    }

    if (vim.data.readNextChar) {
        vim.data.nextChar = key;

        exec(vim);

        return true;
    }

    const node = vim.node.nodes[key];

    if (!node) {
        resetCommand(vim);
        return false;
    }

    vim.cmdseq += key;
    vim.node = node;
    vim.data = { ...vim.data, ...node.data };

    if (!vim.data.readNextChar && isLeaf(node)) {
        exec(vim);
    }

    return true;
}

function exec(vim: Vim): void {
    const repeat: number = vim.data.digit ? 1 :
        Math.max(0, Math.min(
            parseInt(vim.digits || "1"),
            REPEAT_LIMIT
        ));

    if (!vim.data.digit && vim.digits) {
        vim.digits = "";
    }

    vim.allowClipboardReset = true;

    const prevHistoryState = {
        text: getText(vim),
        caret: getCaret(vim),
    };

    for (var i = 0; i < repeat; i++) {
        vim.data.action!(vim, vim.data);
    }

    if (vim.data.mode !== undefined) {
        if (vim.data.mode === Mode.INSERT) {
            vim.historyBeforeInsert = prevHistoryState;
        }
        setMode(vim, vim.data.mode);
    }

    if (!vim.data.dontSaveUndoState) {
        saveUndoState(vim, prevHistoryState);
    }

    resetCommand(vim);
}

function getText(vim: Vim): string {
    return vim.textarea.value;
}

function setText(vim: Vim, text: string): void {
    vim.textarea.value = text;
}

function getCaret(vim: Vim): number {
    if (vim.mode === Mode.VISUAL) {
        return vim.textarea.selectionEnd === vim.selectionStart
            ? vim.textarea.selectionStart
            : vim.textarea.selectionEnd;
    }
    else {
        return vim.textarea.selectionEnd;
    }
}

function setCaret(vim: Vim, caret: number): void {
    if (vim.mode === Mode.VISUAL) {
        vim.textarea.setSelectionRange(
            Math.min(caret, vim.selectionStart!),
            Math.max(caret, vim.selectionStart!)
        );
    }
    else {
        vim.textarea.setSelectionRange(caret, caret);
    }
}

function setMode(vim: Vim, mode: Mode): void {
    if (vim.mode === mode) {
        return;
    }

    if (mode === Mode.VISUAL) {
        vim.selectionStart = getCaret(vim);
    }
    else if (vim.mode === Mode.VISUAL) {
        const caret = getCaret(vim);
        vim.selectionStart = null;
        vim.textarea.setSelectionRange(caret, caret);
    }

    vim.mode = mode;

    if (vim.options.onModeChange) {
        vim.options.onModeChange(
            vim.mode === Mode.COMMAND ? "NORMAL" :
                vim.mode === Mode.INSERT ? "INSERT" :
                    "VISUAL"
        );
    }
}

function resetCommand(vim: Vim): void {
    if (
        // NOTE: do NOT reset keyseq if the current action
        // was setting the mode to INSERT or VISUAL
        // e.g. capture "i", "a", "v"
        vim.data.mode !== Mode.INSERT
        && vim.data.mode !== Mode.VISUAL
    ) {
        vim.keyseq = [];
    }
    vim.node = vim.mode === Mode.VISUAL
        ? visualTree
        : commandTree;
    vim.data = {};
    vim.cmdseq = "";
}

function saveUndoState(vim: Vim, prevHistory: History): void {
    const currText = getText(vim);

    if (prevHistory.text !== currText) {
        if (vim.keyseq.length) {
            vim.modseq = vim.keyseq;
        }

        vim.redo.length = 0;

        vim.undo.push(prevHistory);

        if (vim.undo.length > UNDO_LIMIT) {
            vim.undo.shift();
        }
    }
}

function clipboard(vim: Vim, text: string): void {
    if (text) {
        if (vim.allowClipboardReset) {
            vim.allowClipboardReset = false;
            vim.clipboard = "";
        }

        vim.clipboard += text;

        if (typeof navigator !== "undefined") {
            navigator
                .clipboard
                .writeText(vim.clipboard)
                .catch(console.error);
        }
    }
}

function getSelection(vim: Vim, data: VimNodeData): TextRange {
    const text = getText(vim);
    const caret = getCaret(vim);

    if (data.select) {
        return data.select(text, caret, vim);
    }

    if (data.move) {
        const mov = data.move(text, caret, vim) + (data.offsetSelectionEnd || 0);
        return mov > caret ? [caret, mov] : [mov, caret];
    }

    return [0, 0];
}

function getVisualSelection(vim: Vim): TextRange {
    return [
        Math.min(vim.selectionStart || 0, getCaret(vim)),
        Math.max(vim.selectionStart || 0, getCaret(vim)),
    ];
}

function yank(vim: Vim, start: number, end: number, cut: boolean): string {
    const text = getText(vim);

    clipboard(vim, text.slice(start, end));

    const result = text.slice(0, start) + text.slice(end);

    if (cut) {
        setText(vim, result);
    }

    setCaret(vim, start);

    return result;
}

/*

util

*/

function insertAt(text: string, pos: number, data: string): string {
    return text.slice(0, pos) + data + text.slice(pos);
}

function countSpaces(text: string, pos: number, allow = " "): number {
    let i = 0;
    let c: string;
    while ((c = text.charAt(pos + i)) && allow.includes(c)) {
        i++;
    }
    return i;
}

function lineStart(text: string, pos: number): number {
    const i = text.lastIndexOf(
        "\n",
        text.charAt(pos) === "\n" ? pos - 1 : pos
    );
    return i === -1 ? 0 : i + 1;
}

function lineEnd(text: string, pos: number): number {
    const i = text.indexOf("\n", pos);
    return i === -1 ? text.length : i;
}

function isLineEnd(text: string, pos: number): boolean {
    return text.charAt(pos) === "\n" || pos === text.length;
}

function increaseIndent(str: string): string {
    return str = " ".repeat(TAB_WIDTH) + str;
}

function decreaseIndent(str: string): string {
    for (let i = 0; i < TAB_WIDTH; i++) {
        if (str.startsWith(" ")) {
            str = str.slice(1);
        }
    }
    return str;
}

function findRegexBreak(text: string, pos: number, regex: RegExp): TextRange {
    let l: number = 0;
    let r: number | undefined;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(text))) {
        let i = match.index + 1;

        if (i <= pos) {
            l = i;
        }
        else if (r === undefined) {
            r = i;
        }
    }

    return [l, r === undefined ? text.length : r];
}

/*

select

*/

const START = 0;

const END = 1;

function inside(f: Select): Select {
    return (text, pos, vim) => {
        const range = f(text, pos, vim);

        return range[END] === range[START]
            ? range
            : [range[START] + 1, range[END] - 1];
    };
}

function selectLine(text: string, pos: number): TextRange {
    return [lineStart(text, pos), lineEnd(text, pos)];
}

function selectLineNL(text: string, pos: number): TextRange {
    return [lineStart(text, pos), lineEnd(text, pos) + 1];
}

const FIND_WORD = /(\\s(?=\\S))|([^\u0000-/:-@[-`{-¿](?=[\u0000-/:-@[-`{-¿]))|(\\S(?=\\s))|([\u0000-/:-@[-`{-¿](?=[^\u0000-/:-@[-`{-¿]))/g;

function selectWord(text: string, pos: number): TextRange {
    return findRegexBreak(text, pos, FIND_WORD);
}

const FIND_WORD_PLUS = /(\s(?=\S))|(\S(?=\s))/g;

function selectWordPlus(text: string, pos: number): TextRange {
    return findRegexBreak(text, pos, FIND_WORD_PLUS);
}

const FIND_PARAGRAPH = /\n\s*\n/g;

function selectParagraph(text: string, pos: number): TextRange {
    return findRegexBreak(text, pos, FIND_PARAGRAPH);
}

function selectToNextWord(text: string, pos: number): TextRange {
    return [pos, moveToNextWord(text, pos)];
}

function selectToNextWordPlus(text: string, pos: number): TextRange {
    return [pos, moveToNextWordPlus(text, pos)];
}

function selectToWordBound(text: string, pos: number): TextRange {
    return [pos, selectWord(text, pos)[END]];
}

function selectToWordBoundPlus(text: string, pos: number): TextRange {
    return [pos, selectWordPlus(text, pos)[END]];
}

function selectWordWithSpacesAfter(text: string, pos: number): TextRange {
    const [start, end] = selectWord(text, pos);
    return [start, end + countSpaces(text, end)];
}

function selectWordPlusWithSpacesAfter(text: string, pos: number): TextRange {
    const [start, end] = selectWordPlus(text, pos);
    return [start, end + countSpaces(text, end)];
}

function selectParagraphWithSpacesAfter(text: string, pos: number): TextRange {
    const [start, end] = selectParagraph(text, pos);
    return [start, end + countSpaces(text, end)];
}

function selectSingleQuotes(text: string, pos: number): TextRange {
    return selectQuotes(text, pos, "'");
}

function selectDoubleQuotes(text: string, pos: number): TextRange {
    return selectQuotes(text, pos, '"');
}

function selectBacktick(text: string, pos: number): TextRange {
    return selectQuotes(text, pos, "`");
}

// TODO: Improve
function selectQuotes(text: string, pos: number, quote: "'" | '"' | "`"): TextRange {
    let l: number | undefined;
    let r: number | undefined;

    for (let i = pos; i >= 0; i--) {
        if (text.charAt(i) === quote) {
            l = i;
            break;
        }
    }

    for (let i = pos + 1; i < text.length; i++) {
        if (text.charAt(i) === quote) {
            r = i;
            break;
        }
    }

    return [l || 0, (r || text.length) + 1];
}

function selectBrackets(text: string, pos: number): TextRange {
    return selectBounds(text, pos, "()");
}

function selectBraces(text: string, pos: number): TextRange {
    return selectBounds(text, pos, "{}");
}

function selectSquares(text: string, pos: number): TextRange {
    return selectBounds(text, pos, "[]");
}

function selectAngles(text: string, pos: number): TextRange {
    return selectBounds(text, pos, "<>");
}

// TODO: Improve
function selectBounds(text: string, pos: number, bounds: "()" | "[]" | "{}" | "<>"): TextRange {
    const start = bounds.charAt(START);
    const end = bounds.charAt(END);

    let l: number | undefined;
    let r: number | undefined;

    if (text.charAt(pos) === start) {
        l = pos;
    }
    else {
        let k = 1;

        for (let i = pos - 1; i >= 0; i--) {
            const char = text.charAt(i);

            k += (char === start ? -1 : 0) + (char === end ? 1 : 0);

            if (k === 0) {
                l = i;
                break;
            }
        }
    }

    if (text.charAt(pos) === end) {
        r = pos;
    }
    else {
        let k = 1;

        for (let i = pos + 1; i < text.length; i++) {
            const char = text.charAt(i);

            k += (char === start ? 1 : 0) + (char === end ? -1 : 0);

            if (k === 0) {
                r = i;
                break;
            }
        }
    }

    return (r === undefined || l === undefined) ? [pos, 0] : [l, r + 1]
}

/*

move

*/

function moveLeft(_: string, pos: number): number {
    return Math.max(0, pos - 1);
}

function moveRight(text: string, pos: number): number {
    return Math.min(text.length, pos + 1);
}

function moveDown(text: string, pos: number): number {
    const ls = lineStart(text, pos);
    const le = lineEnd(text, pos);

    if (le === text.length) {
        return pos;
    }

    const nls = le + 1;
    const nle = lineEnd(text, nls);

    return nls + Math.min(pos - ls, nle - nls);
}

function moveUp(text: string, pos: number): number {
    const ls = lineStart(text, pos);

    if (ls === 0) {
        return pos;
    }

    const ple = ls - 1;
    const pls = lineStart(text, ple);

    return pls + Math.min(pos - ls, ple - pls);
}

function moveHalfPageUp(text: string, pos: number): number {
    for (let i = 0; i < PAGE_SIZE; i++) {
        pos = moveUp(text, pos);
    }
    return pos;
}

function moveHalfPageDown(text: string, pos: number): number {
    for (let i = 0; i < PAGE_SIZE; i++) {
        pos = moveDown(text, pos);
    }
    return pos;
}

function movePageDown(text: string, pos: number): number {
    pos = moveHalfPageDown(text, pos);
    pos = moveHalfPageDown(text, pos);
    return pos;
}

function movePageUp(text: string, pos: number): number {
    pos = moveHalfPageUp(text, pos);
    pos = moveHalfPageUp(text, pos);
    return pos;
}

function moveToWordNextLine(text: string, pos: number): number {
    const ls = lineEnd(text, pos) + 1;

    if (ls >= text.length) {
        return pos;
    }

    return ls + countSpaces(text, ls);
}

function moveToVeryBeginning(): number {
    return 0;
}

function moveToVeryEnd(text: string): number {
    return text.length;
}

function moveToFirstWordStart(text: string, pos: number): number {
    let ls = lineStart(text, pos);
    while (text.charAt(ls++) === " ") {
        ;
    }
    return ls - 1;
}

function moveToNextWord(text: string, pos: number): number {
    const end = selectWord(text, pos)[END];
    return end + countSpaces(text, end);
}

function moveToNextWordPlus(text: string, pos: number): number {
    const end = selectWordPlus(text, pos)[END];
    return end + countSpaces(text, end);
}

function moveToEndWord(text: string, pos: number): number {
    return selectWord(
        text,
        pos + countSpaces(text, pos),
    )[END];
}

function moveToEndWordPlus(text: string, pos: number): number {
    return selectWordPlus(
        text,
        pos + countSpaces(text, pos),
    )[END];
}

function moveToPreviousWord(text: string, pos: number): number {
    return selectWord(
        text,
        pos - countSpaces(text, pos) - 1,
    )[START];
}

function moveToPreviousWordPlus(text: string, pos: number): number {
    return selectWordPlus(
        text,
        pos - countSpaces(text, pos) - 1,
    )[START];
}

function moveToChar(text: string, pos: number, vim: Vim): number {
    const end = text.indexOf(vim.data.nextChar!, pos + 1);
    return end === -1 ? pos : end;
}

function moveBeforeChar(text: string, pos: number, vim: Vim): number {
    const end = text.indexOf(vim.data.nextChar!, pos + 1);
    return end === -1 ? pos : end - 1;
}

/*
 
actions
 
*/

function actionEnterIndend(vim: Vim): void {
    const text = getText(vim);
    const caret = getCaret(vim);

    const ls = lineStart(text, caret);

    const spacing = "\n" + " ".repeat(
        Math.min(caret - ls, countSpaces(text, ls))
    );

    setText(vim, insertAt(text, caret, spacing));
    setCaret(vim, caret + spacing.length);
}

function actionTab(vim: Vim): void {
    const text = getText(vim);
    const caret = getCaret(vim);

    const ls = lineStart(text, caret);

    const spacing = " ".repeat(
        TAB_WIDTH - ((caret - ls) % TAB_WIDTH)
    );

    setText(vim, insertAt(text, caret, spacing));
    setCaret(vim, caret + spacing.length);
}

function actionDigit(vim: Vim, data: VimNodeData): void {
    if (!vim.digits && data.digit === "0") {
        setCaret(
            vim,
            lineStart(getText(vim), getCaret(vim))
        );
    }
    else {
        vim.digits += data.digit;
    }
}

function actionMove(vim: Vim, data: VimNodeData): void {
    setCaret(vim, data.move!(getText(vim), getCaret(vim), vim));
}

function actionAppend(vim: Vim): void {
    const caret = getCaret(vim);
    setCaret(vim, Math.min(caret + 1, lineEnd(getText(vim), caret)));
}

function actionAppendToEnd(vim: Vim): void {
    setCaret(vim, lineEnd(getText(vim), getCaret(vim)));
}

function actionSetMode(): void { }

function actionUndo(vim: Vim): void {
    const undo = vim.undo.pop();

    if (undo) {
        vim.redo.push({
            text: getText(vim),
            caret: undo.caret,
        });

        setText(vim, undo.text);
        setCaret(vim, undo.caret);
    }
}

function actionRedo(vim: Vim): void {
    const redo = vim.redo.pop();

    if (redo) {
        vim.undo.push({
            text: getText(vim),
            caret: redo.caret,
        });

        setText(vim, redo.text);
        setCaret(vim, redo.caret);
    }
}

function actionDeleteRange(vim: Vim, data: VimNodeData): void {
    const [start, end] = getSelection(vim, data);
    yank(vim, start, end, true);
}

function actionDeleteChar(vim: Vim): void {
    const text = getText(vim);

    const _caret = getCaret(vim);
    const caret = isLineEnd(text, _caret) ? _caret - 1 : _caret;

    if (!isLineEnd(text, caret)) {
        yank(vim, caret, caret + 1, true);
    }
}

function actionReplaceChar(vim: Vim, data: VimNodeData): void {
    const text = getText(vim);

    const _caret = getCaret(vim);
    const caret = isLineEnd(text, _caret) ? _caret - 1 : _caret;

    if (!isLineEnd(text, caret)) {
        setText(vim, text.slice(0, caret) + data.nextChar + text.slice(caret + 1));
        setCaret(vim, caret);
    }

    setMode(vim, data.mode || Mode.COMMAND);
}

function actionSetVisualSelection(vim: Vim): void {
    const [start, end] = getSelection(vim, vim.data);
    vim.selectionStart = start;
    setCaret(vim, end);
}

function actionDeleteVisualSelection(vim: Vim): void {
    yank(vim, ...getVisualSelection(vim), true);
}

function actionYankVisualSelection(vim: Vim): void {
    yank(vim, ...getVisualSelection(vim), false);
}

function actionPasteIntoVisualSelection(vim: Vim): void {
    const [start, end] = getVisualSelection(vim);
    const text = getText(vim);

    setText(vim, text.slice(0, start) + vim.clipboard + text.slice(end));
    setCaret(vim, start + vim.clipboard.length);
}

function actionYankRange(vim: Vim, data: VimNodeData): void {
    const [start, end] = getSelection(vim, data);
    yank(vim, start, end, false);
}

function actionPasteAfter(vim: Vim): void {
    const caret = getCaret(vim);
    setText(vim, insertAt(getText(vim), caret + 1, vim.clipboard));
    setCaret(vim, caret + vim.clipboard.length);
}

function actionPasteBefore(vim: Vim): void {
    const caret = getCaret(vim);
    setText(vim, insertAt(getText(vim), caret, vim.clipboard));
    setCaret(vim, caret);
}

function actionMergeLines(vim: Vim): void {
    const text = getText(vim);
    const le = lineEnd(text, getCaret(vim));

    setText(vim, text.slice(0, le) + text.slice(le + 1));
    setCaret(vim, le);
}

function actionInsertLineAfter(vim: Vim): void {
    const text = getText(vim);
    const caret = getCaret(vim);

    const spacing = "\n" + " ".repeat(
        countSpaces(text, lineStart(text, caret))
    );

    const le = lineEnd(text, caret);

    setText(vim, insertAt(text, le, spacing));
    setCaret(vim, le + spacing.length);
}

function actionInsertLineBefore(vim: Vim): void {
    const text = getText(vim);
    const ls = lineStart(text, getCaret(vim));

    const spacing = " ".repeat(
        countSpaces(text, ls)
    ) + "\n";

    setText(vim, insertAt(text, ls, spacing));
    setCaret(vim, ls + spacing.length - 1);
}

function actionIncreaseIndent(vim: Vim, data: VimNodeData): void {
    actionAlterLineStart(vim, data, increaseIndent);
}

function actionDecreaseIndent(vim: Vim, data: VimNodeData): void {
    actionAlterLineStart(vim, data, decreaseIndent);
}

function actionAlterLineStart(vim: Vim, data: VimNodeData, f: (str: string) => string): void {
    const text = getText(vim);
    const caret = getCaret(vim);

    const [start, end] = getSelection(vim, data);
    const ls = lineStart(text, start);

    setText(
        vim,
        text.slice(0, ls) + f(text.slice(ls, end)) + text.slice(end)
    );

    setCaret(vim, caret);
}

function actionRepeatLastAction(vim: Vim): void {
    resetCommand(vim);

    for (const key of vim.modseq) {
        const accepted = onKey(vim, key);

        // NOTE: synthetic insert event
        if (!accepted && vim.mode === Mode.INSERT && key.length === 1) {
            const text = getText(vim);
            const caret = getCaret(vim);
            setText(vim, insertAt(text, caret, key));
            setCaret(vim, caret + 1);
        }
    }
}
