/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from "react";
import path from "path-browserify";
import ReconnectingWebSocket from "reconnecting-websocket";
import { DebugProtocol } from ".././debugAdapter";
let seq = 0;
let root: any = null;
let file: any = null;
let defaultThreadId: any = null;
let isDebugging = false;
let defaultFrameId: any = null;
let location: any = null;
const breakpoints = [1, 2, 3];
let variables = [];

function App() {
  const dapWebsocket = useRef<ReconnectingWebSocket | null>(null);
  useEffect(() => {
    dapWebsocket.current = new ReconnectingWebSocket(
      "ws://localhost:3001/debug",
      undefined,
      {
        maxReconnectionDelay: 10000,
        minReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1.3,
        connectionTimeout: 10000,
        maxRetries: Infinity,
        debug: false,
      }
    );
    dapWebsocket.current?.addEventListener("open", () => {
      let outputSeq = 0;
      dapWebsocket.current?.addEventListener("message", (message: any) => {
        message = JSON.parse(message.data);
        console.log("client recive:", message);
        if (message.type === "event") {
          if (message.event === "output") {
            if (message.body.locationReference) {
              console.log("locationReferencexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", message.body.locationReference);
              location = message.body.locationReference;
            }
            console.log('output', outputSeq++, message.body);
          } else if (message.event === "initialized") {
            console.log("initialized");
            isDebugging = true;
          } else if (message.event === "terminated") {
            console.log("terminated");
            isDebugging = false;
          } else if (message.event === "stopped") {
            console.log("stopped at:", message);
            defaultThreadId = message.body.threadId;
            const stackTraceMessage: any = {
              seq: seq++,
              command: "stackTrace",
              type: "request",
              arguments: {
                threadId: defaultThreadId,
                startFrame: 0,
                levels: 1,
              },
            };
            dapWebsocket.current?.send(JSON.stringify(stackTraceMessage));
          }
        } else if (message.type === "response") {
          // 1. initialize后，发送launch命令
          if (message.command === "initialize") {
            console.log("initialize response", message);
            root = message.body.cwd;
            file = path.join(root, "test.js");
            const args = {
              type: "node2",
              request: "launch",
              name: "Launch Program",
              program: `${file}`,
              cwd: root,
            };
            const launchMessage: DebugProtocol.LaunchRequest = {
              seq: seq++,
              command: "launch",
              type: "request",
              arguments: args as DebugProtocol.LaunchRequestArguments,
            };
            dapWebsocket.current?.send(JSON.stringify(launchMessage));
          } else if (message.command === "launch") {
            // 2. launch后，发送loadedSources命令
            console.log("launch response", message);
            const loadMessage: any = {
              seq: seq++,
              command: "loadedSources",
              type: "request",
            };
            dapWebsocket.current?.send(JSON.stringify(loadMessage));
          } else if (message.command === "loadedSources") {
            console.log("loadedSources response", message);
            // 3. 加载源码后，设置断点
            const breakpointMessage: any = {
              seq: seq++,
              command: "setBreakpoints",
              type: "request",
              arguments: {
                source: {
                  name: "test.js",
                  path: file,
                },
                lines: breakpoints,
                breakpoints: breakpoints.map((bp) => {
                  return { line: bp };
                }),
                sourceModified: false,
              },
            };
            dapWebsocket.current?.send(JSON.stringify(breakpointMessage));
          } else if (
            message.command === "setExceptionBreakpoints" ||
            message.command === "setBreakpoints"
          ) {
            // 4.设置完断点后， 发送configDone 命令
            const configDoneMessage: any = {
              seq: seq++,
              command: "configurationDone",
              type: "request",
            };
            dapWebsocket.current?.send(JSON.stringify(configDoneMessage));
          } else if (message.command === "evaluate") {
            console.log("evaluate response", message);
          } else if (
            message.command === "configurationDone" ||
            message.command === "next" ||
            message.command === "stepIn" ||
            message.command === "stepOut" ||
            message.command === "continue"
          ) {
            console.log(message.command, message);
            // 5. 发送配置完成命令后，发送threads命令
            const threadsMessage: any = {
              seq: seq++,
              command: "threads",
              type: "request",
            };
            dapWebsocket.current?.send(JSON.stringify(threadsMessage));
            const locationMessage: any = {
              seq: seq++,
              command: "locations",
              type: "request",
              arguments: {
                locationReference: location,
              }
            };
            dapWebsocket.current?.send(JSON.stringify(locationMessage));
          } else if (message.command === "threads") {
            console.log("threads response", message);
            // 6. 获取到threads后，获取栈帧
            if (message.body.threads.length === 0) return;
            defaultThreadId = message.body.threads[0].id;
            const stackTraceMessage: any = {
              seq: seq++,
              command: "stackTrace",
              type: "request",
              arguments: {
                threadId: defaultThreadId,
                startFrame: 0,
                levels: 1,
              },
            };
            dapWebsocket.current?.send(JSON.stringify(stackTraceMessage));
          } else if (message.command === "stackTrace") {
            if (isDebugging) {
              if (!message.success) {
                const stackTraceMessage: any = {
                  seq: seq++,
                  command: "stackTrace",
                  type: "request",
                  arguments: {
                    threadId: defaultThreadId,
                    startFrame: 0,
                    levels: 1,
                  },
                };
                dapWebsocket.current?.send(JSON.stringify(stackTraceMessage));
                return;
              }
              const currentFrame = message.body.stackFrames[0];
              console.log("Current execution line:", currentFrame.line);
              defaultFrameId = currentFrame.id;

              const variablesMessage: any = {
                seq: seq++,
                command: "variables",
                type: "request",
                arguments: {
                  frameId: defaultFrameId,
                },
              };
              dapWebsocket.current?.send(JSON.stringify(variablesMessage));
              const scopeMessage: any = {
                seq: seq++,
                command: "scopes",
                type: "request",
                arguments: {
                  frameId: defaultFrameId,
                },
              };
              dapWebsocket.current?.send(JSON.stringify(scopeMessage));
            }
          } else if (message.command === "locations") {
            console.log("locations response", message);
          } else if (message.command === "scopes") {
            console.log("scopes response", message.body.scopes[0]);
            const variablesMessage: any = {
              seq: seq++,
              command: "variables",
              type: "request",
              arguments: {
                variablesReference: message.body.scopes[0].variablesReference,
              },
            };
            dapWebsocket.current?.send(JSON.stringify(variablesMessage));
          } else if (message.command === "variables") {
            console.log("variables response", message);
            // 保存变量信息以供显示
            variables = message.body.variables;
            // 在控制台打印变量，方便调试
            console.log("Current variables:", variables);
          } else if (message.command === "terminate") {
            console.log("terminate response", message);
          }
        }
      });
    });
  });
  const startDebug = () => {
    const InitializeEvent = {
      seq: seq++,
      type: "request",
      command: "initialize",
      arguments: {
        clientID: "vscode",
        clientName: "Code - OSS Dev",
        adapterID: "node2",
        pathFormat: "path",
        linesStartAt1: true,
        columnsStartAt1: true,
        supportsVariableType: true,
        supportsVariablePaging: true,
        supportsRunInTerminalRequest: true,
        locale: "zh-cn",
      },
    };
    dapWebsocket.current?.send(JSON.stringify(InitializeEvent));
  };

  const stepNext = () => {
    const stepNextEvent: any = {
      seq: seq++,
      command: "next",
      type: "request",
      arguments: {
        threadId: defaultThreadId,
      },
    };
    dapWebsocket.current?.send(JSON.stringify(stepNextEvent));
  };

  const stepIn = () => {
    const stepInEvent: any = {
      seq: seq++,
      command: "stepIn",
      type: "request",
      arguments: {
        threadId: defaultThreadId,
      },
    };
    dapWebsocket.current?.send(JSON.stringify(stepInEvent));
  };
  const stepOut = () => {
    const stepOutEvent: any = {
      seq: seq++,
      command: "stepOut",
      type: "request",
      arguments: {
        threadId: defaultThreadId,
      },
    };
    dapWebsocket.current?.send(JSON.stringify(stepOutEvent));
  };

  const resume = () => {
    console.log("resume");
  };

  return (
    <>
      <button onClick={startDebug}>开始调试</button>
      <button onClick={stepNext}>step next</button>
      <button onClick={stepIn}>step in</button>
      <button onClick={stepOut}>step out</button>
      <button onClick={resume}>resume</button>
    </>
  );
}

export default App;
