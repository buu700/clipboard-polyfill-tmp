"use strict";
exports.__esModule = true;
var es6_promise_1 = require("es6-promise");
var DataType_1 = require("./DataType");
var DT_1 = require("./DT");
// Debug log strings shorts, since they are copmiled into the production build.
// TODO: Compile debug logging code out of production builds?
var debugLog = function (s) { };
var missingPlainTextWarning = true;
var warn = (console.warn || console.log).bind(console, "[clipboard-polyfill]");
var ClipboardPolyfill = /** @class */ (function () {
    function ClipboardPolyfill() {
    }
    ClipboardPolyfill.setDebugLog = function (f) {
        debugLog = f;
    };
    ClipboardPolyfill.suppressMissingPlainTextWarning = function () {
        missingPlainTextWarning = false;
    };
    ClipboardPolyfill.write = function (data) {
        if (missingPlainTextWarning && !data.getData(DataType_1.DataType.TEXT_PLAIN)) {
            warn("clipboard.write() was called without a " +
                "`text/plain` data type. On some platforms, this may result in an " +
                "empty clipboard. Call clipboard.suppressMissingPlainTextWarning() " +
                "to suppress this warning.");
        }
        return new es6_promise_1.Promise(function (resolve, reject) {
            // Internet Explorer
            if (seemToBeInIE()) {
                if (writeIE(data)) {
                    resolve();
                }
                else {
                    reject(new Error("Copying failed, possibly because the user rejected it."));
                }
                return;
            }
            var tracker = execCopy(data);
            if (tracker.success) {
                debugLog("regular execCopy worked");
                resolve();
                return;
            }
            // Success detection on Edge is not possible, due to bugs in all 4
            // detection mechanisms we could try to use. Assume success.
            if (navigator.userAgent.indexOf("Edge") > -1) {
                debugLog("UA \"Edge\" => assuming success");
                resolve();
                return;
            }
            // Fallback 1 for desktop Safari.
            tracker = copyUsingTempSelection(document.body, data);
            if (tracker.success) {
                debugLog("copyUsingTempSelection worked");
                resolve();
                return;
            }
            // Fallback 2 for desktop Safari. 
            tracker = copyUsingTempElem(data);
            if (tracker.success) {
                debugLog("copyUsingTempElem worked");
                resolve();
                return;
            }
            // Fallback for iOS Safari.
            var text = data.getData(DataType_1.DataType.TEXT_PLAIN);
            if (text !== undefined && copyTextUsingDOM(text)) {
                debugLog("copyTextUsingDOM worked");
                resolve();
                return;
            }
            reject(new Error("Copy command failed."));
        });
    };
    ClipboardPolyfill.writeText = function (s) {
        var dt = new DT_1["default"]();
        dt.setData(DataType_1.DataType.TEXT_PLAIN, s);
        return this.write(dt);
    };
    ClipboardPolyfill.read = function () {
        return new es6_promise_1.Promise(function (resolve, reject) {
            if (seemToBeInIE()) {
                readIE().then(function (s) { return resolve(DT_1["default"].fromText(s)); }, reject);
                return;
            }
            // TODO: Attempt to read using async clipboard API.
            reject("Read is not supported in your browser.");
        });
    };
    ClipboardPolyfill.readText = function () {
        if (seemToBeInIE()) {
            return readIE();
        }
        return new es6_promise_1.Promise(function (resolve, reject) {
            // TODO: Attempt to read using async clipboard API.
            reject("Read is not supported in your browser.");
        });
    };
    // Legacy v1 API.
    ClipboardPolyfill.copy = function (obj) {
        var _this = this;
        warn("The clipboard.copy() API is deprecated and may be removed in a future version. Please switch to clipboard.write() or clipboard.writeText().");
        return new es6_promise_1.Promise(function (resolve, reject) {
            var data;
            if (typeof obj === "string") {
                data = DT_1["default"].fromText(obj);
            }
            else if (obj instanceof HTMLElement) {
                data = DT_1["default"].fromElement(obj);
            }
            else if (obj instanceof Object) {
                data = DT_1["default"].fromObject(obj);
            }
            else {
                reject("Invalid data type. Must be string, DOM node, or an object mapping MIME types to strings.");
                return;
            }
            _this.write(data);
        });
    };
    // Legacy v1 API.
    ClipboardPolyfill.paste = function () {
        warn("The clipboard.paste() API is deprecated and may be removed in a future version. Please switch to clipboard.read() or clipboard.readText().");
        return this.readText();
    };
    ClipboardPolyfill.DT = DT_1["default"];
    return ClipboardPolyfill;
}());
exports["default"] = ClipboardPolyfill;
/******** Implementations ********/
var FallbackTracker = /** @class */ (function () {
    function FallbackTracker() {
        this.success = false;
    }
    return FallbackTracker;
}());
function copyListener(tracker, data, e) {
    debugLog("listener called");
    tracker.success = true;
    data.forEach(function (value, key) {
        e.clipboardData.setData(key, value);
        if (key === DataType_1.DataType.TEXT_PLAIN && e.clipboardData.getData(key) != value) {
            debugLog("setting text/plain failed");
            tracker.success = false;
        }
    });
    e.preventDefault();
}
function execCopy(data) {
    var tracker = new FallbackTracker();
    var listener = copyListener.bind(this, tracker, data);
    document.addEventListener("copy", listener);
    try {
        // We ignore the return value, since FallbackTracker tells us whether the
        // listener was called. It seems that checking the return value here gives
        // us no extra information in any browser.
        document.execCommand("copy");
    }
    finally {
        document.removeEventListener("copy", listener);
    }
    return tracker;
}
// Create a temporary DOM element to select, so that `execCommand()` is not
// rejected.
function copyUsingTempSelection(e, data) {
    selectionSet(e);
    var tracker = execCopy(data);
    selectionClear();
    return tracker;
}
// Create a temporary DOM element to select, so that `execCommand()` is not
// rejected.
function copyUsingTempElem(data) {
    var tempElem = document.createElement("div");
    // Place some text in the elem so that Safari has something to select.
    tempElem.textContent = "temporary element";
    document.body.appendChild(tempElem);
    var tracker = copyUsingTempSelection(tempElem, data);
    document.body.removeChild(tempElem);
    return tracker;
}
// Uses shadow DOM.
function copyTextUsingDOM(str) {
    debugLog("copyTextUsingDOM");
    var tempElem = document.createElement("div");
    var shadowRoot = tempElem.attachShadow({ mode: "open" });
    document.body.appendChild(tempElem);
    var span = document.createElement("span");
    span.innerText = str;
    // span.style.whiteSpace = "pre-wrap"; // TODO: Use `innerText` above instead?
    shadowRoot.appendChild(span);
    selectionSet(span);
    var result = document.execCommand("copy");
    selectionClear();
    document.body.removeChild(tempElem);
    return result;
}
/******** Selection ********/
function selectionSet(elem) {
    var sel = document.getSelection();
    var range = document.createRange();
    range.selectNodeContents(elem);
    sel.removeAllRanges();
    sel.addRange(range);
}
function selectionClear() {
    var sel = document.getSelection();
    sel.removeAllRanges();
}
function seemToBeInIE() {
    return typeof ClipboardEvent === "undefined" &&
        typeof window.clipboardData !== "undefined" &&
        typeof window.clipboardData.setData !== "undefined";
}
function writeIE(data) {
    // IE supports text or URL, but not HTML: https://msdn.microsoft.com/en-us/library/ms536744(v=vs.85).aspx
    // TODO: Write URLs to `text/uri-list`? https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Recommended_drag_types
    var text = data.getData("text/plain");
    if (text !== undefined) {
        return window.clipboardData.setData("Text", text);
    }
    throw ("No `text/plain` value was specified.");
}
// Returns "" if the read failed, e.g. because rejected the permission.
function readIE() {
    return new es6_promise_1.Promise(function (resolve, reject) {
        var text = window.clipboardData.getData("Text");
        if (text === "") {
            reject(new Error("Empty clipboard or could not read plain text from clipboard"));
        }
        else {
            resolve(text);
        }
    });
}
module.exports = ClipboardPolyfill;
