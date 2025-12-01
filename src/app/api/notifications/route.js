import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get all notifications
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ notifications: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Create notification (broadcast to all or specific users)
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, message, type, target_users, tournament_id } = body;

    // If target_users is empty, broadcast to all users
    let userIds = target_users || [];
    
    if (userIds.length === 0) {
      // Get all user IDs
      const { data: users } = await supabase.from('users').select('uid');
      userIds = users?.map(u => u.uid) || [];
    }

    // Create notification records for each user
    const notifications = userIds.map(uid => ({
      user_id: uid,
      title,
      message,
      type: type || 'general',
      tournament_id,
      read: false,
      created_at: new Date().toISOString()
    }));

    if (notifications.length > 0) {
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, sent_to: userIds.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
