"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const colyseus_1 = require("colyseus");
const monitor_1 = require("@colyseus/monitor");
// import socialRoutes from "@colyseus/social/express"
// Routes
const ImageHandler_1 = __importDefault(require("./ImageHandler"));
// Rooms
const Teledraw_1 = require("./Teledraw");
const port = Number(process.env.PORT || 2567);
const app = express_1.default();
app.use(cors_1.default());
app.use(express_1.default.json({ limit: "1mb" }));
app.use(express_1.default.static("uploads"));
const server = http_1.default.createServer(app);
const gameServer = new colyseus_1.Server({
    server,
});
// register your room handlers
gameServer.define("teledraw", Teledraw_1.Teledraw).filterBy(["code"]);
/**
 * Register @colyseus/social routes
 *
 * - uncomment if you want to use default authentication (https://docs.colyseus.io/authentication/)
 * - also uncomment the import statement
 */
// app.use("/", socialRoutes);
// register colyseus monitor AFTER registering your room handlers
app.use("/colyseus", monitor_1.monitor());
app.use("/image", ImageHandler_1.default);
gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);
