import * as ws from "ws";
import express from "express";
import { DebugSession } from "./debugSession";

const app = express();
const port = 3001;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
const dapWs = new ws.WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
});

server.on("upgrade", (request, socket, head) => {
  dapWs.handleUpgrade(request, socket, head, (webSocket) => {
    const socket = {
      send: (content) =>
        webSocket.send(content, (error) => {
          if (error) {
            throw error;  
          }
        }),
      onMessage: (cb) => webSocket.on("message", cb),
      onError: (cb) => webSocket.on("error", cb),
      onClose: (cb) => webSocket.on("close", cb),
      dispose: () => webSocket.close(),
    };
    // launch the debugSession when the web socket is opened
    if (webSocket.readyState === webSocket.OPEN) {
      new DebugSession(socket);
    } else {
      webSocket.on("open", () => {
        new DebugSession(socket);
      });
    }
  });
});
