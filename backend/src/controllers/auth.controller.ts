import type { RequestHandler } from "express";

export const getCurrentUser: RequestHandler = (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

export const logout: RequestHandler = (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);
      res.clearCookie("reachinbox.sid");
      res.status(200).json({ success: true, data: { message: "Logged out" } });
    });
  });
};
