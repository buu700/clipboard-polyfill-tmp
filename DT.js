"use strict";
exports.__esModule = true;
var DataType_1 = require("./DataType");
// TODO: Dedup with main file?
var warn = (console.warn || console.log).bind(console, "[clipboard-polyfill]");
var DT = /** @class */ (function () {
    function DT() {
        this.m = new Map();
    }
    DT.prototype.setData = function (type, value) {
        if (!(DataType_1.DataTypeLookup.has(type))) {
            warn("Unknown data type: " + type);
        }
        this.m.set(type, value);
    };
    DT.prototype.getData = function (type) {
        return this.m.get(type);
    };
    // TODO: Provide an iterator consistent with DataTransfer.
    DT.prototype.forEach = function (f) {
        return this.m.forEach(f);
    };
    DT.fromText = function (s) {
        var dt = new DT();
        dt.setData(DataType_1.DataType.TEXT_PLAIN, s);
        return dt;
    };
    DT.fromObject = function (obj) {
        var dt = new DT();
        for (var key in obj) {
            dt.setData(key, obj[key]);
        }
        return dt;
    };
    DT.fromElement = function (e) {
        var dt = new DT();
        dt.setData(DataType_1.DataType.TEXT_PLAIN, e.innerText);
        dt.setData(DataType_1.DataType.TEXT_HTML, new XMLSerializer().serializeToString(e));
        return dt;
    };
    return DT;
}());
exports["default"] = DT;
