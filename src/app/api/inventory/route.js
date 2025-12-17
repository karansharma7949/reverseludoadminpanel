import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET - Fetch inventory items by type (optional)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let query = supabase
      .from('inventory')
      .select('item_id, item_name, item_type, item_images, item_price, created_at')
      .order('item_name', { ascending: true });

    // If type is specified, filter by type
    if (type) {
      query = query.eq('item_type', type);
    }

    const { data: items, error } = await query;

    if (error) throw error;
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new inventory item
export async function POST(request) {
  try {
    const formData = await request.formData();
    const item_name = formData.get('item_name');
    const item_type = formData.get('item_type');
    const item_price = parseInt(formData.get('item_price'));

    console.log('Creating inventory item:', { item_name, item_type, item_price });

    if (!item_name || !item_type || isNaN(item_price)) {
      return NextResponse.json({ 
        error: 'Missing or invalid required fields',
        received: { item_name, item_type, item_price }
      }, { status: 400 });
    }

    // Generate a unique item_id (needed for file naming)
    const item_id = `${item_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Handle image uploads to Supabase Storage
    const item_images = {};
    const imageKeys = ['idle', 'dice1', 'dice2', 'dice3', 'dice4', 'dice5', 'dice6',
      'frame_01', 'frame_02', 'frame_03', 'frame_04', 'frame_05', 'frame_06',
      'frame_07', 'frame_08', 'frame_09', 'frame_10', 'frame_11', 'frame_12',
      'frame_13', 'frame_14', 'frame_15', 'red', 'blue', 'green', 'yellow',
      'purple', 'orange', '4playerBoard', '5playerBoard', '6playerBoard'];

    // Upload each image file to Supabase Storage
    for (const key of imageKeys) {
      const file = formData.get(key);
      if (file && file.size > 0) {
        try {
          // Convert file to buffer
          const fileBuffer = await file.arrayBuffer();
          const fileName = `${item_id}_${key}.${file.name.split('.').pop()}`;
          // Use existing folder structure: boards, dice, tokens
          let folderName;
          if (item_type === 'board') folderName = 'boards';
          else if (item_type === 'dice') folderName = 'dice';
          else if (item_type === 'token') folderName = 'tokens';
          else folderName = item_type; // fallback
          
          const filePath = `${folderName}/${fileName}`;

          console.log(`Uploading ${key} to ${filePath}`);

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('items')
            .upload(filePath, fileBuffer, {
              contentType: file.type,
              upsert: true
            });

          if (uploadError) {
            console.error(`Upload error for ${key}:`, uploadError);
            throw new Error(`Failed to upload ${key}: ${uploadError.message}`);
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('items')
            .getPublicUrl(filePath);

          item_images[key] = urlData.publicUrl;
          console.log(`Successfully uploaded ${key}: ${urlData.publicUrl}`);

        } catch (uploadError) {
          console.error(`Error uploading ${key}:`, uploadError);
          throw new Error(`Failed to upload image ${key}: ${uploadError.message}`);
        }
      }
    }

    console.log('Image files uploaded:', Object.keys(item_images));

    // Check if at least one image was uploaded
    if (Object.keys(item_images).length === 0) {
      return NextResponse.json({ 
        error: 'At least one image is required for the inventory item'
      }, { status: 400 });
    }

    const insertData = {
      item_id,
      item_name,
      item_type,
      item_price,
      item_images
    };

    console.log('Inserting data:', insertData);

    // Insert into database
    const { data: item, error } = await supabase
      .from('inventory')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Item created successfully:', item);
    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.details || 'No additional details'
    }, { status: 500 });
  }
}

// DELETE - Delete inventory item
export async function DELETE(request) {
  try {
    const { itemId } = await request.json();

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('item_id', itemId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}