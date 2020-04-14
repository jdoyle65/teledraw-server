import { Router } from "express";
import fs from "fs";
import crypto from "crypto";

const route = Router({ mergeParams: true });

route.post("", (req, res) => {
  const { imageDataUrl } = req.body;

  if (!imageDataUrl) {
    return res.status(422).json({
      error: 'Missing "imageDataUrl" in the request body',
    });
  }

  const hash = crypto.randomBytes(20).toString("hex");
  const filename = `${hash}.png`;
  const imageData = imageDataUrl.split(";base64,").pop();

  fs.writeFile(
    `${__dirname}/uploads/${filename}`,
    imageData,
    { encoding: "base64" },
    (error) => {
      if (error) {
        return res.status(500).json(error);
      }

      return res.status(201).json({
        filename,
      });
    }
  );
});

export default route;
