export const checkPublicToken = (req, res, next) => {
  const token = req.query.token || req.headers["x-public-token"];

  if (!token || token !== process.env.PUBLIC_TOKEN) {
    return res.status(401).json({ message: "Invalid or missing public token" });
  }

  next();
};
