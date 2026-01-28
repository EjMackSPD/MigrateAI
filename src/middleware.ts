import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/api/projects/:path*',
    '/api/pillars/:path*',
    '/api/drafts/:path*',
    '/api/matches/:path*',
    '/api/jobs/:path*',
    '/api/exports/:path*',
  ],
}
