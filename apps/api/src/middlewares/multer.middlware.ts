import multer, { StorageEngine } from 'multer';
import { Request } from 'express';
import { ApiError } from '../utils/ApiError.js';

const storage: StorageEngine = multer.diskStorage({
  destination: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ): void {
    cb(null, './public/temp');
  },
  
  filename: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ): void {
    cb(null, file.originalname);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const postType = req.params.postType; 
  const mime = file.mimetype;
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const fieldName = file.fieldname;

  switch (postType) {
    case "Image":
      if (fieldName === "media") {
        return isImage 
          ? cb(null, true) 
          : cb(new ApiError(400, "Only image files are allowed for image posts"));
      }
      return cb(new ApiError(400, "Invalid field for image posts"));

    case "Video":
      if (fieldName === "media") {
        return isVideo 
          ? cb(null, true) 
          : cb(new ApiError(400, "Only video files are allowed for video posts"));
      }
      if (fieldName === "thumbnail") {
        return isImage 
          ? cb(null, true) 
          : cb(new ApiError(400, "Thumbnail must be an image file"));
      }
      return cb(new ApiError(400, "Invalid field for video posts"));

    case "Tweet":
      if (fieldName === "media") {
        return (isImage || isVideo) 
          ? cb(null, true) 
          : cb(new ApiError(400, "Only video or image files are allowed for tweet posts"));
      }
      return cb(new ApiError(400, "Invalid field for tweet posts"));

    default:
      return cb(new ApiError(400, "Invalid post type"));
  }
};

export const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, 
    files: 2
  }
});