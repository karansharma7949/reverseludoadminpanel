'use client';

import { useEffect, useState } from 'react';

const ITEM_TYPES = {
  dice: { 
    name: 'Dice', 
    images: [
      'idle', 
      'dice1', 'dice2', 'dice3', 'dice4', 'dice5', 'dice6',
      'frame_01', 'frame_02', 'frame_03', 'frame_04', 'frame_05',
      'frame_06', 'frame_07', 'frame_08', 'frame_09', 'frame_10',
      'frame_11', 'frame_12', 'frame_13', 'frame_14', 'frame_15'
    ] 
  },
  token: { name: 'Token', images: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] },
  board: { name: 'Board', images: ['4playerBoard', '5playerBoard', '6playerBoard'] },
};

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ item_name: '', item_type: 'dice', item_price: '' });
  const [imageFiles, setImageFiles] = useState({});
  const [imagePreviews, setImagePreviews] = useState({});

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/inventory');
      const data = await response.json();
      if (data.items) setItems(data.items);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (key, file) => {
    if (file) {
      setImageFiles(prev => ({ ...prev, [key]: file }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviews(prev => ({ ...prev, [key]: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({ item_name: '', item_type: 'dice', item_price: '' });
    setImageFiles({});
    setImagePreviews({});
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      data.append('item_name', formData.item_name);
      data.append('item_type', formData.item_type);
      data.append('item_price', formData.item_price);

      // Append image files
      Object.entries(imageFiles).forEach(([key, file]) => {
        data.append(key, file);
      });

      const response = await fetch('/api/inventory', { method: 'POST', body: data });
      const result = await response.json();

      if (result.item) {
        setItems([result.item, ...items]);
        resetForm();
      } else {
        alert(result.error || 'Failed to create item');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const response = await fetch('/api/inventory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const result = await response.json();
      if (result.success) {
        setItems(items.filter(i => i.item_id !== itemId));
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const filteredItems = items.filter(i =>
    i.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.item_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const requiredImages = ITEM_TYPES[formData.item_type]?.images || [];


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Launch New Item
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input type="text" placeholder="Search by item name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full max-w-md" />
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div key={item.item_id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{item.item_name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.item_type === 'dice' ? 'bg-blue-500/20 text-blue-400' :
                      item.item_type === 'token' ? 'bg-green-500/20 text-green-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>{item.item_type}</span>
                  </div>
                  <button onClick={() => handleDelete(item.item_id)} className="text-red-400 hover:text-red-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                {/* Preview Images */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {item.item_images && (() => {
                    // For board items, show 4playerBoard as main preview
                    if (item.item_type === 'board' && item.item_images['4playerBoard']) {
                      return (
                        <img 
                          src={item.item_images['4playerBoard']} 
                          alt="4playerBoard" 
                          className="w-12 h-12 rounded-lg object-cover bg-gray-700" 
                        />
                      );
                    }
                    // For other items, show first 4 images
                    return Object.entries(item.item_images).slice(0, 4).map(([key, url]) => (
                      <img key={key} src={url} alt={key} className="w-12 h-12 rounded-lg object-cover bg-gray-700" />
                    ));
                  })()}
                  {item.item_images && Object.keys(item.item_images).length > 4 && item.item_type !== 'board' && (
                    <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400 text-xs">
                      +{Object.keys(item.item_images).length - 4}
                    </div>
                  )}
                  {item.item_images && item.item_type === 'board' && Object.keys(item.item_images).length > 1 && (
                    <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400 text-xs">
                      +{Object.keys(item.item_images).length - 1}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-green-400 font-medium">₹{item.item_price?.toLocaleString()}</span>
                  <span className="text-gray-500 text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && <div className="col-span-full text-center text-gray-500 py-12">No items found</div>}
        </div>
      )}


      {/* Launch Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Launch New Item</h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Item Name</label>
                <input type="text" required value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Golden Dice Set" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Item Type</label>
                <select value={formData.item_type} onChange={(e) => { setFormData({ ...formData, item_type: e.target.value }); setImageFiles({}); setImagePreviews({}); }}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="dice">Dice (22 images: idle, dice1-6, frame_01-15)</option>
                  <option value="token">Token (6 color images)</option>
                  <option value="board">Board (3 images: 4playerBoard, 5playerBoard, 6playerBoard)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Price (₹)</label>
                <input type="number" required value={formData.item_price} onChange={(e) => setFormData({ ...formData, item_price: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 199" />
              </div>

              {/* Image Uploads */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Upload Images ({ITEM_TYPES[formData.item_type]?.name} - {requiredImages.length} required)
                </label>
                {formData.item_type === 'board' && (
                  <p className="text-sm text-gray-400 mb-3">
                    Upload board images for different player modes. The 4-player board will be used as the preview image.
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {requiredImages.map((imgKey) => (
                    <div key={imgKey} className="relative">
                      <label className="block cursor-pointer">
                        <div className={`aspect-square rounded-lg border-2 border-dashed ${imagePreviews[imgKey] ? 'border-purple-500' : 'border-gray-600'} flex items-center justify-center overflow-hidden bg-gray-700 hover:border-purple-500 transition-colors`}>
                          {imagePreviews[imgKey] ? (
                            <img src={imagePreviews[imgKey]} alt={imgKey} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-2">
                              <svg className="w-8 h-8 mx-auto text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-gray-400 text-xs">
                                {formData.item_type === 'board' && imgKey.includes('player') 
                                  ? imgKey.replace('playerBoard', ' Player') 
                                  : imgKey}
                              </span>
                            </div>
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(imgKey, e.target.files[0])} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={resetForm} className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Cancel</button>
                <button type="submit" disabled={saving || Object.keys(imageFiles).length !== requiredImages.length}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? 'Launching...' : 'Launch Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
