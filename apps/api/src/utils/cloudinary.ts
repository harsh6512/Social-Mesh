import { v2 as cloudinary } from "cloudinary"
import { ENV } from "../constants/env.js";
import fs from "fs"

cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME || "",
    api_key: ENV.CLOUDINARY_API_KEY || "",
    api_secret: ENV.CLOUDINARY_API_SECRET || "",
});

interface CloudinaryUploadResult {
    url: string;
    secure_url: string;
    public_id: string;
    [key: string]: any;
}

interface CloudinaryDeleteResult {
    result: string; // 'ok' if successful, 'not found' if the resource doesn't exist
    [key: string]: any;
}

const uploadOnCloudinary = async (localFilePath: string): Promise<CloudinaryUploadResult | null> => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("The file is successfully uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null;
    }
}

const deleteFromCloudinary = async (publicId: string, resourceType: string = "auto"): Promise<CloudinaryDeleteResult | null> => {
    try {
        if (!publicId) {
            console.log("Public ID is required for deletion");
            return null;
        }

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType // "image", "video", "raw", or "auto"
        });

        console.log("File deleted from Cloudinary:", response);
        return response;
    } catch (error) {
        console.error("Error deleting file from Cloudinary:", error);
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary }