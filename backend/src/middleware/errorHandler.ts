import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error("Error:", err.message);

  if (err.name === "ValidationError") {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(err.status || 500).json({
    error: err.message || "Something went wrong on the server",
  });
}
