// This file extends Express Request interface to include user property added by auth middleware
declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      userType: string;
    };
  }
}
