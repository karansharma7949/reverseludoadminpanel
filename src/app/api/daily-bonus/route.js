import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET - Fetch all daily bonus rewards
export async function GET() {
  try {
    const { data: rewards, error } = await supabase
      .from('daily_bonus_rewards')
      .select('*')
      .order('day_number', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ rewards });
  } catch (error) {
    console.error('Error fetching daily bonus rewards:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new daily bonus reward
export async function POST(request) {
  try {
    const formData = await request.formData();
    const day_number = parseInt(formData.get('day_number'));
    const bonus_type = formData.get('bonus_type');
    const quantity = parseInt(formData.get('quantity')) || 0;
    const is_active = formData.get('is_active') === 'true';
    const token_style = formData.get('token_style') || null;
    const duration_days = formData.get('duration_days') ? parseInt(formData.get('duration_days')) : null;
    const imageFile = formData.get('image');

    let item_image_url = null;

    // For token/board rewards, get image from inventory
    if (['token', 'board'].includes(bonus_type) && token_style) {
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('inventory')
        .select('item_images')
        .eq('item_id', token_style)
        .single();

      if (!inventoryError && inventoryItem && inventoryItem.item_images) {
        const images = inventoryItem.item_images;
        // Use red token for tokens, 4playerBoard image for boards
        if (bonus_type === 'token') {
          item_image_url = images.red || images.blue || images.green || images.yellow || images.thumbnail || images.preview || Object.values(images)[0];
        } else if (bonus_type === 'board') {
          item_image_url = images['4playerBoard'] || images.board || images.preview || images.thumbnail || Object.values(images)[0];
        }
      }
    } else if (imageFile && imageFile.size > 0) {
      // Upload image for other reward types
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `day${day_number}-${Date.now()}.${fileExt}`;
      const filePath = `daily-bonus/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('daily-bonus-images')
        .upload(filePath, imageFile, { contentType: imageFile.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('daily-bonus-images')
        .getPublicUrl(filePath);

      item_image_url = publicUrl;
    }

    const { data: reward, error } = await supabase
      .from('daily_bonus_rewards')
      .insert({
        day_number,
        bonus_type,
        quantity,
        is_active,
        item_image_url,
        token_style,
        duration_days,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ reward });
  } catch (error) {
    console.error('Error creating daily bonus reward:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


// PUT - Update existing daily bonus reward
export async function PUT(request) {
  try {
    const formData = await request.formData();
    const id = parseInt(formData.get('id'));
    const day_number = parseInt(formData.get('day_number'));
    const bonus_type = formData.get('bonus_type');
    const quantity = parseInt(formData.get('quantity')) || 0;
    const is_active = formData.get('is_active') === 'true';
    const token_style = formData.get('token_style') || null;
    const duration_days = formData.get('duration_days') ? parseInt(formData.get('duration_days')) : null;
    const imageFile = formData.get('image');

    const updateData = {
      day_number,
      bonus_type,
      quantity,
      is_active,
      token_style,
      duration_days,
      updated_at: new Date().toISOString(),
    };

    // For token/board rewards, get image from inventory
    if (['token', 'board'].includes(bonus_type) && token_style) {
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('inventory')
        .select('item_images')
        .eq('item_id', token_style)
        .single();

      if (!inventoryError && inventoryItem && inventoryItem.item_images) {
        const images = inventoryItem.item_images;
        // Use red token for tokens, 4playerBoard image for boards
        if (bonus_type === 'token') {
          updateData.item_image_url = images.red || images.blue || images.green || images.yellow || images.thumbnail || images.preview || Object.values(images)[0];
        } else if (bonus_type === 'board') {
          updateData.item_image_url = images['4playerBoard'] || images.board || images.preview || images.thumbnail || Object.values(images)[0];
        }
      }
    } else if (imageFile && imageFile.size > 0) {
      // Upload new image for other reward types
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `day${day_number}-${Date.now()}.${fileExt}`;
      const filePath = `daily-bonus/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('daily-bonus-images')
        .upload(filePath, imageFile, { contentType: imageFile.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('daily-bonus-images')
        .getPublicUrl(filePath);

      updateData.item_image_url = publicUrl;
    }

    const { data: reward, error } = await supabase
      .from('daily_bonus_rewards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ reward });
  } catch (error) {
    console.error('Error updating daily bonus reward:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete daily bonus reward
export async function DELETE(request) {
  try {
    const { id } = await request.json();

    const { error } = await supabase
      .from('daily_bonus_rewards')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting daily bonus reward:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
