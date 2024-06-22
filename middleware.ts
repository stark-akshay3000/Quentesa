import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define which routes are public (not protected)
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/clerk/webhook', // Add your webhook endpoint here
]);

export default clerkMiddleware((auth, request) => {
  // Check if the request matches a public route
  if (!isPublicRoute(request)) {
    auth().protect(); // Protect routes that are not public
  }
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)', // Match all routes except those with a dot (likely static files) or _next
    '/', // Match the root route
    '/(api|trpc)(.*)', // Match any routes starting with /api or /trpc
  ],
};
