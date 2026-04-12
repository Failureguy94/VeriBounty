import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";

type Schemas = {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
};

export const validate = (schemas: Schemas) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Validation failed",
          issues: error.flatten()
        });
        return;
      }

      next(error);
    }
  };
};
