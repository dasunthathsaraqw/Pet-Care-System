import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { copyFile, mkdir, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fileTypeFromFile } from "file-type";
import multer from "multer";

export const MAX_PET_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const imageTypes = new Map([
  ["image/jpeg", { extension: "jpg", originalExtensions: [".jpg", ".jpeg"] }],
  ["image/png", { extension: "png", originalExtensions: [".png"] }],
  ["image/gif", { extension: "gif", originalExtensions: [".gif"] }],
]);

const stagingDirectory = path.join(os.tmpdir(), "pet-care-image-staging");
const uploadsDirectory = fileURLToPath(new URL("../uploads/", import.meta.url));

class InvalidPetImageError extends Error {}

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    mkdir(stagingDirectory, { recursive: true })
      .then(() => callback(null, stagingDirectory))
      .catch(callback);
  },
  filename(_req, _file, callback) {
    callback(null, `${randomUUID()}.upload`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_PET_IMAGE_SIZE_BYTES, files: 1 },
  fileFilter(_req, file, callback) {
    const imageType = imageTypes.get(file.mimetype);
    const originalExtension = path.extname(file.originalname).toLowerCase();

    if (!imageType?.originalExtensions.includes(originalExtension)) {
      callback(new InvalidPetImageError("Only JPEG, PNG, and GIF images are allowed."));
      return;
    }

    callback(null, true);
  },
});

async function removeIfPresent(filePath) {
  if (filePath) {
    await rm(filePath, { force: true });
  }
}

async function publishValidatedFile(stagedPath, finalPath) {
  try {
    await rename(stagedPath, finalPath);
  } catch (error) {
    if (error.code !== "EXDEV") {
      throw error;
    }

    await copyFile(stagedPath, finalPath, fsConstants.COPYFILE_EXCL);
    await removeIfPresent(stagedPath);
  }
}

// Use validatedPetImageUpload("petImage") or validatedPetImageUpload("Pet_Image")
// when the corresponding route is ready to adopt this middleware.
export function validatedPetImageUpload(fieldName) {
  if (fieldName !== "petImage" && fieldName !== "Pet_Image") {
    throw new TypeError("Unsupported pet image field name.");
  }

  const acceptSingleImage = upload.single(fieldName);

  return (req, res, next) => {
    acceptSingleImage(req, res, async (uploadError) => {
      if (uploadError) {
        try {
          await removeIfPresent(req.file?.path);
        } catch (cleanupError) {
          return next(cleanupError);
        }

        if (uploadError instanceof InvalidPetImageError) {
          return res.status(415).json({ error: uploadError.message });
        }
        if (uploadError instanceof multer.MulterError) {
          const oversized = uploadError.code === "LIMIT_FILE_SIZE";
          return res.status(oversized ? 413 : 400).json({
            error: oversized
              ? "Pet image must be 10 MB or smaller."
              : "Invalid pet image upload request.",
          });
        }
        return next(uploadError);
      }

      if (!req.file) {
        return next();
      }

      const stagedPath = req.file.path;
      let finalPath;

      try {
        const detectedType = await fileTypeFromFile(stagedPath);
        const imageType = imageTypes.get(detectedType?.mime);
        if (!imageType || detectedType.mime !== req.file.mimetype) {
          throw new InvalidPetImageError("File content must be a valid JPEG, PNG, or GIF image.");
        }

        await mkdir(uploadsDirectory, { recursive: true });
        const filename = `${randomUUID()}.${imageType.extension}`;
        finalPath = path.join(uploadsDirectory, filename);
        await publishValidatedFile(stagedPath, finalPath);

        req.file.destination = uploadsDirectory;
        req.file.filename = filename;
        req.file.path = finalPath;
        req.file.mimetype = detectedType.mime;
        return next();
      } catch (error) {
        const cleanupResults = await Promise.allSettled([
          removeIfPresent(stagedPath),
          removeIfPresent(finalPath),
        ]);
        const cleanupFailure = cleanupResults.find((result) => result.status === "rejected");
        if (cleanupFailure) {
          return next(cleanupFailure.reason);
        }

        if (error instanceof InvalidPetImageError) {
          return res.status(415).json({ error: error.message });
        }
        return next(error);
      }
    });
  };
}

export default validatedPetImageUpload;
