// import { Router } from "express";
// import { asyncHandler } from "../../utils/asyncHandler.js";
// import { handleConstructionProcess } from "./controller.js";

// const router = Router();

// router.get("/", asyncHandler(handleConstructionProcess));
// router.post("/", asyncHandler(handleConstructionProcess));
// router.put("/", asyncHandler(handleConstructionProcess));
// router.delete("/", asyncHandler(handleConstructionProcess));

// export default router;

import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  handleConstructionProcess,
  handleFileUpload,
  handleFileDownload,
  handleFileDelete,
} from "./controller.js";

const router = Router();

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

const uploadFile = (req, res, next) =>
  upload.single("file")(req, res, (err) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res
        .status(413)
        .json({ success: 0, message: "File too large. Max size is 2 MB." });
    }
    if (err) return next(err);
    next();
  });

router.get("/", asyncHandler(handleConstructionProcess));
router.post("/", asyncHandler(handleConstructionProcess));
router.put("/", asyncHandler(handleConstructionProcess));
router.delete("/", asyncHandler(handleConstructionProcess));

// files per process line
router.post("/file", uploadFile, asyncHandler(handleFileUpload));
router.get("/file/:fileId", asyncHandler(handleFileDownload));
router.delete("/file/:fileId", asyncHandler(handleFileDelete));

export default router;