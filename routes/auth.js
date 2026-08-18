import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authRouter = express.Router();

/**
 * POST /api/auth/register - create a new user account
 */
authRouter.post("/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();

        res.status(201).json({ _id: user._id, email: user.email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error registering user", error: error.message });
    }
});

/**
 * POST /api/auth/login - verify credentials and issue a JWT
 */
authRouter.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });

        res.json({ token, email: user.email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error logging in", error: error.message });
    }
});

export default authRouter;
