import { NextFunction, Request, Response } from "express";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: number }).code === 11000
  ) {
    res.status(409).json({
      message: "Duplicate resource"
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    message: "Internal server error"
  });
};
