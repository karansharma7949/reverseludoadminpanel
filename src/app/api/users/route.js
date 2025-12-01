import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use service key for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET - Fetch all users
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map the data to normalize field names
    const users = (data || []).map(user => ({
      id: user.uid || user.id,
      username: user.username,
      email: user.email,
      coins: user.total_coins || 0,
      diamonds: user.total_diamonds || 0,
      profile_image_url: user.profile_image_url,
      created_at: user.created_at,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PATCH - Update user coins/diamonds
export async function PATCH(request) {
  try {
    const { userId, coins, diamonds } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData = {};
    if (coins !== undefined) updateData.total_coins = coins;
    if (diamonds !== undefined) updateData.total_diamonds = diamonds;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('uid', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return normalized user
    const user = {
      id: data.uid || data.id,
      username: data.username,
      email: data.email,
      coins: data.total_coins || 0,
      diamonds: data.total_diamonds || 0,
      profile_image_url: data.profile_image_url,
      created_at: data.created_at,
    };

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
