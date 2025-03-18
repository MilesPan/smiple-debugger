"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ws = require("ws");
var express_1 = require("express");
var debugSession_1 = require("./debugSession");
var app = (0, express_1.default)();
var port = 3001;
var server = app.listen(port, function () {
    console.log("Server is running on port ".concat(port));
});
var dapWs = new ws.WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
});
server.on("upgrade", function (request, socket, head) {
    dapWs.handleUpgrade(request, socket, head, function (webSocket) {
        var socket = {
            send: function (content) {
                return webSocket.send(content, function (error) {
                    if (error) {
                        throw error;
                    }
                });
            },
            onMessage: function (cb) { return webSocket.on("message", cb); },
            onError: function (cb) { return webSocket.on("error", cb); },
            onClose: function (cb) { return webSocket.on("close", cb); },
            dispose: function () { return webSocket.close(); },
        };
        // launch the debugSession when the web socket is opened
        if (webSocket.readyState === webSocket.OPEN) {
            new debugSession_1.DebugSession(socket);
        }
        else {
            webSocket.on("open", function () {
                new debugSession_1.DebugSession(socket);
            });
        }
    });
});
