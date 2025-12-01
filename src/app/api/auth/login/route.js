import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Get allowed admin emails from environment
const getAdminEmails = () => {
  const emails = process.env.ADMIN_EMAILS || '';
  return emails.split(',').map(email => email.trim().toLowerCase());
};

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if email is in admin list (server-side check)
    const adminEmails = getAdminEmails();
    const normalizedEmail = email.trim().toLowerCase();

    if (!adminEmails.includes(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Access denied. This email is not authorized as admin.' },
        { status: 403 }
      );
    }

    // Attempt Supabase login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
