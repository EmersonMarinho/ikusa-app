import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
	'/login',
	'/api/auth/login',
	'/api/auth/logout',
	'/api/alliance-cache', // permitir GET/POST para manter cache (ajuste se quiser proteger)
]

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Permite assets e rotas públicas
	if (
		pathname.startsWith('/_next') ||
		pathname.startsWith('/favicon') ||
		PUBLIC_PATHS.some(p => pathname.startsWith(p))
	) {
		return NextResponse.next()
	}

	const cookie = request.cookies.get('ikusa_session')?.value
	const sessionToken = process.env.IKUSA_SESSION_TOKEN

	if (!cookie || !sessionToken || cookie !== sessionToken) {
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		url.searchParams.set('redirect', pathname)
		return NextResponse.redirect(url)
	}

	return NextResponse.next()
}

export const config = {
	matcher: [
		// Protege somente páginas (não intercepta API e assets), exceto /login
		'/((?!api|_next|favicon|login).*)',
	]
}


