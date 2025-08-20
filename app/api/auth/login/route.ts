import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
	try {
		const { username, password } = await request.json()
		const envUser = process.env.IKUSA_USERNAME || 'admin'
		const envPass = process.env.IKUSA_PASSWORD
		const sessionToken = process.env.IKUSA_SESSION_TOKEN

		if (!envPass || !sessionToken) {
			return NextResponse.json({ success: false, message: 'Auth não configurado. Defina IKUSA_PASSWORD e IKUSA_SESSION_TOKEN em .env.local' }, { status: 500 })
		}

		if (username !== envUser || password !== envPass) {
			return NextResponse.json({ success: false, message: 'Credenciais inválidas' }, { status: 401 })
		}

		const res = NextResponse.json({ success: true })
		res.cookies.set('ikusa_session', sessionToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			path: '/',
			maxAge: 60 * 60 * 24 * 7, // 7 dias
			sameSite: 'lax'
		})
		return res
	} catch (error) {
		return NextResponse.json({ success: false, message: 'Erro ao autenticar' }, { status: 400 })
	}
}


