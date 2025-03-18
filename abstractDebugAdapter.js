"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractDebugAdapter = void 0;
var AbstractDebugAdapter = /** @class */ (function () {
    function AbstractDebugAdapter() {
        this.sequence = 1;
        this.pendingRequests = new Map();
    }
    AbstractDebugAdapter.prototype.onMessage = function (callback) {
        if (this.eventCallback) {
            console.error(new Error("attempt to set more than one 'Message' callback"));
        }
        this.messageCallback = callback;
    };
    AbstractDebugAdapter.prototype.onEvent = function (callback) {
        if (this.eventCallback) {
            console.error(new Error("attempt to set more than one 'Event' callback"));
        }
        this.eventCallback = callback;
    };
    AbstractDebugAdapter.prototype.onRequest = function (callback) {
        if (this.requestCallback) {
            console.error(new Error("attempt to set more than one 'Request' callback"));
        }
        this.requestCallback = callback;
    };
    AbstractDebugAdapter.prototype.sendResponse = function (response) {
        if (response.seq > 0) {
            console.error(new Error("attempt to send more than one response for command ".concat(response.command)));
        }
        else {
            this.internalSend("response", response);
        }
    };
    AbstractDebugAdapter.prototype.sendRequest = function (command, args, clb, timeout) {
        var _this = this;
        var request = {
            command: command,
        };
        if (args && Object.keys(args).length > 0) {
            request.arguments = args;
        }
        this.internalSend("request", request);
        if (typeof timeout === "number") {
            var timer_1 = setTimeout(function () {
                clearTimeout(timer_1);
                var clb = _this.pendingRequests.get(request.seq);
                if (clb) {
                    _this.pendingRequests.delete(request.seq);
                    var err = {
                        type: "response",
                        seq: 0,
                        request_seq: request.seq,
                        success: false,
                        command: command,
                        message: "timeout after ".concat(timeout, " ms"),
                    };
                    clb(err);
                }
            }, timeout);
        }
        if (clb) {
            // store callback for this request
            this.pendingRequests.set(request.seq, clb);
        }
    };
    AbstractDebugAdapter.prototype.acceptMessage = function (message) {
        if (this.messageCallback) {
            this.messageCallback(message);
        }
        else {
            switch (message.type) {
                case "event":
                    if (this.eventCallback) {
                        this.eventCallback(message);
                    }
                    break;
                case "request":
                    if (this.requestCallback) {
                        this.requestCallback(message);
                    }
                    break;
                case "response": {
                    var response = message;
                    var clb = this.pendingRequests.get(response.request_seq);
                    if (clb) {
                        this.pendingRequests.delete(response.request_seq);
                        clb(response);
                    }
                    break;
                }
            }
        }
    };
    AbstractDebugAdapter.prototype.internalSend = function (typ, message) {
        message.type = typ;
        message.seq = this.sequence++;
        this.sendMessage(message);
    };
    AbstractDebugAdapter.prototype.cancelPending = function () {
        var pending = this.pendingRequests;
        this.pendingRequests = new Map();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setTimeout(function (_) {
            pending.forEach(function (callback, request_seq) {
                var err = {
                    type: "response",
                    seq: 0,
                    request_seq: request_seq,
                    success: false,
                    command: "canceled",
                    message: "canceled",
                };
                callback(err);
            });
        }, 1000);
    };
    AbstractDebugAdapter.prototype.dispose = function () {
        this.cancelPending();
    };
    return AbstractDebugAdapter;
}());
exports.AbstractDebugAdapter = AbstractDebugAdapter;
