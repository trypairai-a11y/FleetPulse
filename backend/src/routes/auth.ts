import { Router, Request, Response } from "express";
import { AuthService } from "../services/authService";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, tenantId, role } = req.body;
    const user = await AuthService.register({ email, password, name, phone, tenantId, role });
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.post("/login-otp", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    const result = await AuthService.sendOtp(phone);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    const result = await AuthService.verifyOtp(phone, code);
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) { res.status(401).json({ error: "No refresh token" }); return; }
    const result = await AuthService.refreshToken(token);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out" });
});

router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await AuthService.getMe(req.user!.userId);
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await AuthService.updateMe(req.user!.userId, req.body);
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
