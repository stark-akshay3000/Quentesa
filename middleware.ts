// Import authMiddleware from Clerk SDK
import { authMiddleware } from "@clerk/nextjs/server";

// Define authMiddleware configuration
export default authMiddleware({
  publicRoutes: ['/', '/api/webhooks/clerk', '/api/webhooks/stripe']
});

// Additional config for Next.js API routes
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
