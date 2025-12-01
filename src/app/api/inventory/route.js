import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET - Fetch all inventory items
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

// POST - Create new inventory item
export async function POST(request) {
  try {
    const formData = await request.formData();
    const itemName = formData.get('item_name');
    const itemType = formData.get('item_type');
    const itemPrice = parseInt(formData.get('item_price')) || 0;
    
    // Generate unique item_id
    const itemId = `${itemType}_${Date.now()}`;
    
    // Upload images based on item_type
    const itemImages = {};
    
    if (itemType === 'dice') {
      // Dice needs: idle, dice1-6, frame_01-15 (22 images total)
      const diceKeys = [
        'idle',
        'dice1', 'dice2', 'dice3', 'dice4', 'dice5', 'dice6',
        'frame_01', 'frame_02', 'frame_03', 'frame_04', 'frame_05',
        'frame_06', 'frame_07', 'frame_08', 'frame_09', 'frame_10',
        'frame_11', 'frame_12', 'frame_13', 'frame_14', 'frame_15'
      ];
      
      for (const key of diceKeys) {
        const file = formData.get(key);
        if (file && file.size > 0) {
          const fileName = `dice/${itemId}/${key}.png`;
          const { error: uploadError } = await supabase.storage
            .from('items')
            .upload(fileName, file, { contentType: file.type, upsert: true });
          
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(fileName);
          itemImages[key] = publicUrl;
        }
      }
    } else if (itemType === 'token') {
      // Token needs 6 color images
      const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
      for (const color of colors) {
        const file = formData.get(color);
        if (file && file.size > 0) {
          const fileName = `tokens/${itemId}/${color}.png`;
          const { error: uploadError } = await supabase.storage
            .from('items')
            .upload(fileName, file, { contentType: file.type, upsert: true });
          
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(fileName);
          itemImages[color] = publicUrl;
        }
      }
    } else if (itemType === 'board') {
      // Board needs 1 image
      const file = formData.get('board');
      if (file && file.size > 0) {
        const fileName = `boards/${itemId}/board.png`;
        const { error: uploadError } = await supabase.storage
          .from('items')
          .upload(fileName, file, { contentType: file.type, upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(fileName);
        itemImages.board = publicUrl;
      }
    }

    // Insert into inventory table
    const { data, error } = await supabase
      .from('inventory')
      .insert({
        item_id: itemId,
        item_name: itemName,
        item_type: itemType,
        item_images: itemImages,
        item_price: itemPrice,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}

// DELETE - Delete inventory item
export async function DELETE(request) {
  try {
    const { itemId } = await request.json();

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('item_id', itemId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
