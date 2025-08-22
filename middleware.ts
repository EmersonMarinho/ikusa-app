import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// TEMPORARIAMENTE DESABILITADO PARA TESTES
// export function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl
//   
//   // Rotas que não precisam de autenticação
//   if (pathname === '/login' || pathname === '/api/auth/login') {
//     return NextResponse.next()
//   }
//   
//   // Verificar se o usuário está autenticado
//   const token = request.cookies.get('auth-token')?.value
//   
//   if (!token) {
//     return NextResponse.redirect(new URL('/login', request.url))
//   }
//   
//   return NextResponse.next()
// }

// Middleware temporariamente desabilitado
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}


