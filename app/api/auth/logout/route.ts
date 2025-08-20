import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(_request: NextRequest) {
	const res = NextResponse.json({ success: true })
	res.cookies.set('ikusa_session', '', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: 0,
		sameSite: 'lax'
	})
	return res
}


