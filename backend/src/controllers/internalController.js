import bcrypt from "bcrypt";
import User from "../models/User.js";

export const provisionUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: "Missing email/password/name" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existed = await User.findOne({ email: cleanEmail });
    if (existed) {
      return res
        .status(200)
        .json({ message: "User existed", userId: existed._id });
    }

    // username dùng email cho đơn giản
    const username = cleanEmail;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email: cleanEmail,
      hashedPassword,
      displayName: name,
    });

    return res.status(201).json({ message: "Created", userId: newUser._id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal error" });
  }
};
