"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const route = express_1.Router({ mergeParams: true });
route.post("", (req, res) => {
    const { imageDataUrl } = req.body;
    if (!imageDataUrl) {
        return res.status(422).json({
            error: 'Missing "imageDataUrl" in the request body',
        });
    }
    const hash = crypto_1.default.randomBytes(20).toString("hex");
    const filename = `${hash}.png`;
    const imageData = imageDataUrl.split(";base64,").pop();
    fs_1.default.writeFile(`${__dirname}/uploads/${filename}`, imageData, { encoding: "base64" }, (error) => {
        if (error) {
            return res.status(500).json(error);
        }
        return res.status(201).json({
            filename,
        });
    });
});
exports.default = route;
