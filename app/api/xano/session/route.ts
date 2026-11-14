import { NextResponse } from 'next/server'

export async function DELETE() {
  const response = new NextResponse(null, { status: 204 })
  response.cookies.set('madallion_xano_session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/xano',
    maxAge: 0,
  })
  return response
}
