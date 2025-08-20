"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string|null>(null)

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			})
			const data = await res.json()
			if (!res.ok || !data.success) {
				setError(data.message || 'Falha no login')
				return
			}
			window.location.href = '/'
		} catch (err: any) {
			setError(err?.message || 'Erro inesperado')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<Card className="w-full max-w-sm border-neutral-800 bg-neutral-900">
				<CardHeader>
					<CardTitle className="text-neutral-100">Entrar</CardTitle>
					<CardDescription>Use suas credenciais para acessar</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="space-y-4" onSubmit={onSubmit}>
						<div className="space-y-2">
							<Label htmlFor="username">Usuário</Label>
							<Input id="username" value={username} onChange={e => setUsername(e.target.value)} className="bg-neutral-800 border-neutral-700" />
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Senha</Label>
							<Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-neutral-800 border-neutral-700" />
						</div>
						{error && <p className="text-sm text-red-400">{error}</p>}
						<Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
							{loading ? 'Entrando...' : 'Entrar'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}


