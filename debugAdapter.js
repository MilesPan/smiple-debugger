"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugAdapter = void 0;
var cp = require("child_process");
var path = require("path");
var abstractDebugAdapter_1 = require("./abstractDebugAdapter");
var DebugAdapter = /** @class */ (function (_super) {
    __extends(DebugAdapter, _super);
    function DebugAdapter(socket) {
        var _this = _super.call(this) || this;
        _this.wssocket = socket;
        return _this;
    }
    DebugAdapter.prototype.connect = function (readable, writable) {
        var _this = this;
        this.outputStream = writable;
        this.rawData = Buffer.allocUnsafe(0);
        this.contentLength = -1;
        readable.on('data', function (data) { return _this.handleData(data); });
    };
    DebugAdapter.prototype.sendMessage = function (message) {
        if (this.outputStream) {
            var json = JSON.stringify(message);
            this.outputStream.write("Content-Length: ".concat(Buffer.byteLength(json, 'utf8')).concat(DebugAdapter.TWO_CRLF).concat(json), 'utf8');
        }
    };
    DebugAdapter.prototype.stopSession = function () {
        // Cancel all sent promises on disconnect so debug trees are not left in a broken state #3666.
        this.cancelPending();
        if (this.wssocket) {
            this.wssocket.close();
        }
        return Promise.resolve(undefined);
    };
    DebugAdapter.prototype.handleData = function (data) {
        this.rawData = Buffer.concat([this.rawData, data]);
        while (true) {
            if (this.contentLength >= 0) {
                if (this.rawData.length >= this.contentLength) {
                    var message = this.rawData.toString('utf8', 0, this.contentLength);
                    this.rawData = this.rawData.slice(this.contentLength);
                    this.contentLength = -1;
                    if (message.length > 0) {
                        try {
                            var temp = JSON.parse(message);
                            if (temp.command === 'initialize') {
                                temp.body.cwd = path.join(__dirname, '../../');
                            }
                            this.wssocket.send(JSON.stringify(temp));
                        }
                        catch (e) {
                            console.error(new Error((e.message || e) + '\n' + message));
                        }
                    }
                    continue; // there may be more complete messages to process
                }
            }
            else {
                var idx = this.rawData.indexOf(DebugAdapter.TWO_CRLF);
                if (idx !== -1) {
                    var header = this.rawData.toString('utf8', 0, idx);
                    var lines = header.split(DebugAdapter.HEADER_LINESEPARATOR);
                    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                        var h = lines_1[_i];
                        var kvPair = h.split(DebugAdapter.HEADER_FIELDSEPARATOR);
                        if (kvPair[0] === 'Content-Length') {
                            this.contentLength = Number(kvPair[1]);
                        }
                    }
                    this.rawData = this.rawData.slice(idx + DebugAdapter.TWO_CRLF.length);
                    continue;
                }
            }
            break;
        }
    };
    DebugAdapter.prototype.startSession = function () {
        return __awaiter(this, void 0, void 0, function () {
            var nodeDebug2, forkOptions, child;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                // eslint-disable-next-line no-debugger
                debugger;
                nodeDebug2 = path.join(__dirname, "./downloads/vscode-node-debug2/out/src/nodeDebug.js");
                forkOptions = {
                    env: process.env,
                    execArgv: [],
                    silent: true
                };
                child = cp.fork(nodeDebug2, [], forkOptions);
                if (!child.pid) {
                    throw new Error("Unable to launch debug adapter from ".concat(nodeDebug2));
                }
                this.serverProcess = child;
                this.serverProcess.on('error', function (err) {
                    console.error(err);
                });
                this.serverProcess.on('exit', function (code) {
                    console.log(code);
                });
                (_a = this.serverProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('close', function (error) {
                    console.error(error);
                });
                (_b = this.serverProcess.stdout) === null || _b === void 0 ? void 0 : _b.on('error', function (error) {
                    console.error(error);
                });
                (_c = this.serverProcess.stdin) === null || _c === void 0 ? void 0 : _c.on('error', function (error) {
                    console.error(error);
                });
                this.connect(this.serverProcess.stdout, this.serverProcess.stdin);
                return [2 /*return*/];
            });
        });
    };
    DebugAdapter.TWO_CRLF = '\r\n\r\n';
    DebugAdapter.HEADER_LINESEPARATOR = /\r?\n/; // allow for non-RFC 2822 conforming line separators
    DebugAdapter.HEADER_FIELDSEPARATOR = /: */;
    return DebugAdapter;
}(abstractDebugAdapter_1.AbstractDebugAdapter));
exports.DebugAdapter = DebugAdapter;
