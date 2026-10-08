import fs from "fs";
import path from "path";
import { cloudinary, isCloudinaryEnabled } from "../configs/cloudinary.js";
import { STORAGE_PROVIDERS } from "../constants/index.js";

const UPLOAD_ROOT = path.resolve("uploads");

export async function removeLocalFile(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // file already gone, nothing to do
  }
}

/*
  Takes a file that multer saved in uploads/tmp and stores it for good:
  - Cloudinary if the keys are in .env
  - otherwise the local uploads/ folder (served at /uploads)

  folder example: "meetings/<meetingId>/files"
  resourceType:   "image" | "video" | "raw" (Cloudinary term for documents)
*/
export async function saveUploadedFile({ file, folder, resourceType = "raw" }) {
  if (isCloudinaryEnabled()) {
    try {
      const result = await cloudinary.uploader.upload_large(file.path, {
        folder: `google-meet-clone/${folder}`,
        resource_type: resourceType,
        chunk_size: 6000000,
      });
      return {
        url: result.secure_url,
        fileName: result.public_id,
        publicId: result.public_id,
        resourceType,
        storageProvider: STORAGE_PROVIDERS.CLOUDINARY,
      };
    } finally {
      await removeLocalFile(file.path); // temp file is no longer needed
    }
  }

  try {
    const targetDir = path.join(UPLOAD_ROOT, folder);
    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.rename(file.path, path.join(targetDir, file.filename));

    const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
    return {
      url: `${serverUrl}/uploads/${folder}/${file.filename}`,
      fileName: file.filename,
      publicId: `${folder}/${file.filename}`, // relative path, used for deleting
      resourceType,
      storageProvider: STORAGE_PROVIDERS.LOCAL,
    };
  } catch (error) {
    await removeLocalFile(file.path);
    throw error;
  }
}

export async function deleteStoredFile({ storageProvider, publicId, resourceType }) {
  if (!publicId) return;

  try {
    if (storageProvider === STORAGE_PROVIDERS.CLOUDINARY && isCloudinaryEnabled()) {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || "raw" });
      return;
    }

    if (storageProvider === STORAGE_PROVIDERS.LOCAL) {
      const fullPath = path.resolve(UPLOAD_ROOT, publicId);
      // Safety: never delete anything outside the uploads folder
      if (fullPath.startsWith(UPLOAD_ROOT + path.sep)) await removeLocalFile(fullPath);
    }
  } catch (error) {
    // The database record is what matters to the user, so we only log storage problems
    console.error("Could not delete stored file:", error.message);
  }
}
