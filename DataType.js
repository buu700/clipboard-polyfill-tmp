"use strict";
exports.__esModule = true;
exports.DataType = {
    TEXT_PLAIN: "text/plain",
    TEXT_HTML: "text/html"
};
exports.DataTypeLookup = new Set();
for (var key in exports.DataType) {
    exports.DataTypeLookup.add(exports.DataType[key]);
}
