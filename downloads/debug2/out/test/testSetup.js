"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_ROOT = exports.PROJECT_ROOT = exports.lowercaseDriveLetterDirname = exports.teardown = exports.setup = void 0;
const os = require("os");
const path = require("path");
const ts = require("vscode-chrome-debug-core-testsupport");
const findFreePort = require("find-free-port");
const NIGHTLY_NAME = os.platform() === 'win32' ? 'node-nightly.cmd' : 'node-nightly';
function findPort() {
    return new Promise(resolve => {
        findFreePort(9000, (err, port) => {
            if (err)
                return resolve(9229);
            resolve(port);
        });
    });
}
function patchLaunchArgs(launchArgs) {
    return __awaiter(this, void 0, void 0, function* () {
        launchArgs.trace = 'verbose';
        if (process.version.startsWith('v6.2')) {
            launchArgs.runtimeExecutable = NIGHTLY_NAME;
        }
        if (!launchArgs.port) {
            launchArgs.port = yield findPort();
            launchArgs.runtimeArgs = launchArgs.runtimeArgs || [];
            launchArgs.runtimeArgs.push(`--inspect-brk=${launchArgs.port}`);
        }
    });
}
function setup(_opts) {
    const opts = Object.assign({
        entryPoint: './out/src/nodeDebug.js',
        type: 'legacy-node2',
        patchLaunchArgs
    }, _opts);
    return ts.setup(opts);
}
exports.setup = setup;
function teardown() {
    ts.teardown();
}
exports.teardown = teardown;
exports.lowercaseDriveLetterDirname = __dirname.charAt(0).toLowerCase() + __dirname.substr(1);
exports.PROJECT_ROOT = path.join(exports.lowercaseDriveLetterDirname, '../../');
exports.DATA_ROOT = path.join(exports.PROJECT_ROOT, 'testdata/');

//# sourceMappingURL=testSetup.js.map
