import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create admin client with service role key (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GET - Fetch all dares
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('dares')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Create new dare
export async function POST(request) {
  try {
    const body = await request.json();
    const { dare_text, category, is_active } = body;
    
    if (!dare_text?.trim()) {
      return NextResponse.json({ error: 'Dare text is required' }, { status: 400 });
    }
    
    const { data, error } = await supabaseAdmin
      .from('dares')
      .insert([{ dare_text: dare_text.trim(), category, is_active }])
      .select();
    
    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update dare
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, dare_text, category, is_active } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Dare ID is required' }, { status: 400 });
    }
    
    const { data, error } = await supabaseAdmin
      .from('dares')
      .update({ dare_text: dare_text?.trim(), category, is_active })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Delete dare
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Dare ID is required' }, { status: 400 });
    }
    
    const { error } = await supabaseAdmin
      .from('dares')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
