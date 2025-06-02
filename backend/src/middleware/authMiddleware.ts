import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    role_id: number;
    [key: string]: any;
  };
}

const jwtSecret = process.env.JWT_SECRET || "your_super_secret_jwt_key";

const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];

      if (!token) {
        res.status(401).json({ message: "Not authorized, no token" });
        return; // Just return here
      }

      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(token, jwtSecret, (err, payload) => {
          if (err) {
            console.error("Token verification failed:", err);
            return reject(err); // Just return here
          }
          resolve(payload);
        });
      });

      (req as AuthenticatedRequest).user =
        decoded as AuthenticatedRequest["user"];
      next();
    } catch (error) {
      console.error("Token verification failed:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
      return; // Just return here
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
    return; // Just return here
  }
};

export default protect;
