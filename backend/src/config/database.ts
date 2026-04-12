import { PrismaClient } from "../generated/prisma";
import { prismaExtensions } from "./prismaExtensions";

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

const prisma = basePrisma.$extends(prismaExtensions) as unknown as PrismaClient;

export default prisma;
