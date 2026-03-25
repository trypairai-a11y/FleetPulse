import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma, redis, env } from "../config";
import { JwtPayload } from "../middleware/auth";

export class AuthService {
  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
  }

  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  }

  static async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    tenantId: string;
    role?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("Email already registered");

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        phone: data.phone,
        tenantId: data.tenantId,
        role: (data.role as any) || "VIEWER",
      },
      select: { id: true, email: true, name: true, role: true, tenantId: true },
    });

    return user;
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new Error("Invalid credentials");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error("Invalid credentials");

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
    };
  }

  static async sendOtp(phone: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`otp:${phone}`, code, "EX", 300);
    console.log(`[DEV] OTP for ${phone}: ${code}`);
    return { message: "OTP sent" };
  }

  static async verifyOtp(phone: string, code: string) {
    const stored = await redis.get(`otp:${phone}`);
    if (!stored || stored !== code) throw new Error("Invalid or expired OTP");

    await redis.del(`otp:${phone}`);

    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) throw new Error("User not found");

    const payload: JwtPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
    };
  }

  static async refreshToken(token: string) {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) throw new Error("Invalid refresh token");

    const payload: JwtPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };

    return { accessToken: this.generateAccessToken(payload) };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, phone: true, role: true,
        tenantId: true, isActive: true, lastLoginAt: true,
        tenant: { select: { id: true, name: true, subscriptionPlan: true } },
      },
    });
    if (!user) throw new Error("User not found");
    return user;
  }

  static async updateMe(userId: string, data: { name?: string; email?: string; phone?: string; password?: string }) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.phone) updateData.phone = data.phone;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

    return prisma.user.update({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true, role: true },
      data: updateData,
    });
  }
}
