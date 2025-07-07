import { Request, Response, NextFunction, RequestHandler } from "express";

const asyncHandler = <T extends Request = Request>(
  requestHandler: (req: T, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req as T, res, next)).catch(next);
  };
};

export { asyncHandler };
