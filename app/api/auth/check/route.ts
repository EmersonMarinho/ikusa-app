import { NextResponse } from 'next/server'

// TEMPORARIAMENTE DESABILITADO PARA TESTES
export async function GET() {
  // Retorna sempre autenticado para testes
  return NextResponse.json({ 
    authenticated: true, 
    message: 'Autenticação temporariamente desabilitada para testes' 
  })
}
