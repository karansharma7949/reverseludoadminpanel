'use client';

import { useEffect, useState } from 'react';

const BONUS_TYPES = [
  { value: 'coin', label: 'Coins', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'diamond', label: 'Diamonds', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'token', label: 'Token Style', color: 'bg-green-500/20 text-green-400' },
  { value: 'board', label: 'Board Theme', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'free_spin', label: 'Free Spin', color: 'bg-pink-500/20 text-pink-400' },
  { value: 'free_7_royale_spin', label: 'Free 7 Royale Spin', color: 'bg-red-500/20 text-red-400' },
];



export default function DailyBonusPage() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    day_number: 1,
    bonus_type: 'coin',
    quantity: 1000,
    is_active: true,
    token_style: '',
    duration_days: null,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [tokenItems, setTokenItems] = useState([]);
  const [boardItems, setBoardItems] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  useEffect(() => { 
    fetchRewards(); 
    fetchInventoryItems();
  }, []);

  const fetchRewards = async () => {
    try {
      const response = await fetch('/api/daily-bonus');
      const data = await response.json();
      if (data.rewards) setRewards(data.rewards);
    } catch (err) {
      console.error('Failed to fetch rewards:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async () => {
    setLoadingInventory(true);
    try {
      // Fetch tokens
      const tokenResponse = await fetch('/api/inventory?type=token');
      const tokenData = await tokenResponse.json();
      if (tokenData.items) setTokenItems(tokenData.items);

      // Fetch boards
      const boardResponse = await fetch('/api/inventory?type=board');
      const boardData = await boardResponse.json();
      if (boardData.items) setBoardItems(boardData.items);
    } catch (err) {
      console.error('Failed to fetch inventory items:', err);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleTokenStyleChange = (tokenStyleId) => {
    setFormData({ ...formData, token_style: tokenStyleId });
    
    // Get the red token image for preview
    if (tokenStyleId && (formData.bonus_type === 'token' || formData.bonus_type === 'board')) {
      const items = formData.bonus_type === 'token' ? tokenItems : boardItems;
      const selectedItem = items.find(item => item.item_id === tokenStyleId);
      
      if (selectedItem && selectedItem.item_images) {
        let imageUrl = null;
        if (formData.bonus_type === 'token') {
          // Get red token image
          imageUrl = selectedItem.item_images.red || selectedItem.item_images.blue || selectedItem.item_images.green || selectedItem.item_images.yellow || selectedItem.item_images.thumbnail || selectedItem.item_images.preview;
        } else if (formData.bonus_type === 'board') {
          // Get board image
          imageUrl = selectedItem.item_images.board || selectedItem.item_images.preview || selectedItem.item_images.thumbnail;
        }
        
        if (imageUrl) {
          setImagePreview(imageUrl);
        }
      }
    } else {
      setImagePreview(null);
    }
  };

  const handleImageChange = (file) => {
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({ day_number: 1, bonus_type: 'coin', quantity: 1000, is_active: true, token_style: '', duration_days: null });
    setImageFile(null);
    setImagePreview(null);
    setEditingReward(null);
    setShowModal(false);
  };

  const openEditModal = (reward) => {
    setEditingReward(reward);
    setFormData({
      day_number: reward.day_number,
      bonus_type: reward.bonus_type,
      quantity: reward.quantity,
      is_active: reward.is_active,
      token_style: reward.token_style || '',
      duration_days: reward.duration_days,
    });
    setImagePreview(reward.item_image_url);
    setShowModal(true);
  };

  const openAddModal = () => {
    // Find the next available day
    const usedDays = rewards.map(r => r.day_number);
    let nextDay = 1;
    for (let i = 1; i <= 7; i++) {
      if (!usedDays.includes(i)) {
        nextDay = i;
        break;
      }
    }
    setFormData({ day_number: nextDay, bonus_type: 'coin', quantity: 1000, is_active: true, token_style: '', duration_days: null });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      data.append('day_number', formData.day_number);
      data.append('bonus_type', formData.bonus_type);
      data.append('quantity', formData.quantity);
      data.append('is_active', formData.is_active);
      if (formData.token_style) data.append('token_style', formData.token_style);
      if (formData.duration_days !== null) data.append('duration_days', formData.duration_days);
      if (editingReward) data.append('id', editingReward.id);
      if (imageFile) data.append('image', imageFile);

      const response = await fetch('/api/daily-bonus', {
        method: editingReward ? 'PUT' : 'POST',
        body: data,
      });
      const result = await response.json();

      if (result.reward) {
        if (editingReward) {
          setRewards(rewards.map(r => r.id === result.reward.id ? result.reward : r));
        } else {
          setRewards([...rewards, result.reward].sort((a, b) => a.day_number - b.day_number));
        }
        resetForm();
      } else {
        alert(result.error || 'Failed to save reward');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to save reward');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rewardId) => {
    if (!confirm('Are you sure you want to delete this daily bonus reward?')) return;
    
    try {
      const response = await fetch('/api/daily-bonus', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rewardId }),
      });
      const result = await response.json();
      if (result.success) {
        setRewards(rewards.filter(r => r.id !== rewardId));
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const toggleActive = async (reward) => {
    try {
      const data = new FormData();
      data.append('id', reward.id);
      data.append('day_number', reward.day_number);
      data.append('bonus_type', reward.bonus_type);
      data.append('quantity', reward.quantity || 0);
      data.append('is_active', !reward.is_active);
      if (reward.token_style) data.append('token_style', reward.token_style);
      if (reward.duration_days !== null) data.append('duration_days', reward.duration_days);

      const response = await fetch('/api/daily-bonus', { method: 'PUT', body: data });
      const result = await response.json();
      if (result.reward) {
        setRewards(rewards.map(r => r.id === result.reward.id ? result.reward : r));
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const getBonusTypeInfo = (type) => BONUS_TYPES.find(t => t.value === type) || BONUS_TYPES[0];
  const availableDays = [1, 2, 3, 4, 5, 6, 7].filter(d => 
    !rewards.some(r => r.day_number === d) || (editingReward && editingReward.day_number === d)
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Bonus Management</h1>
          <p className="text-gray-400 text-sm mt-1">Configure 7-day daily bonus rewards cycle</p>
        </div>
        <button onClick={openAddModal} disabled={rewards.length >= 7}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Day Reward
        </button>
      </div>

      {/* 7-Day Calendar View */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const reward = rewards.find(r => r.day_number === day);
            const typeInfo = reward ? getBonusTypeInfo(reward.bonus_type) : null;
            
            return (
              <div key={day} className={`bg-gray-800 rounded-xl border ${reward ? 'border-gray-700' : 'border-dashed border-gray-600'} overflow-hidden`}>
                <div className={`px-4 py-3 ${day === 7 ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-700'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">Day {day}</span>
                    {day === 7 && <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">JACKPOT</span>}
                  </div>
                </div>
                
                {reward ? (
                  <div className="p-4">
                    <div className="flex items-center justify-center mb-4">
                      {reward.item_image_url ? (
                        <img src={reward.item_image_url} alt={reward.bonus_type} className="w-20 h-20 object-contain rounded-lg bg-gray-700 p-2" />
                      ) : (
                        <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                          <span className="text-3xl">🎁</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center mb-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${typeInfo?.color}`}>
                        {typeInfo?.label}
                      </span>
                      {['token', 'board'].includes(reward.bonus_type) ? (
                        <div className="mt-2">
                          <p className="text-lg font-bold text-white">
                            {reward.token_style ? 
                              (reward.bonus_type === 'token' ? 
                                tokenItems.find(s => s.item_id === reward.token_style)?.item_name || reward.token_style :
                                boardItems.find(s => s.item_id === reward.token_style)?.item_name || reward.token_style
                              ) : 'Not Set'
                            }
                          </p>
                          <p className="text-xs text-gray-400">
                            {reward.duration_days ? `${reward.duration_days} days` : 'Permanent'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-2xl font-bold text-white mt-2">{reward.quantity.toLocaleString()}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400 text-sm">Status</span>
                      <button onClick={() => toggleActive(reward)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${reward.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {reward.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>

                    <div className="flex space-x-2">
                      <button onClick={() => openEditModal(reward)}
                        className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(reward.id)}
                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 flex flex-col items-center justify-center h-48">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm mb-3">No reward configured</p>
                    <button onClick={() => { setFormData({ ...formData, day_number: day }); setShowModal(true); }}
                      className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm">
                      Add Reward
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                {editingReward ? `Edit Day ${editingReward.day_number} Reward` : 'Add Daily Bonus Reward'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Day Number */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Day Number</label>
                <select value={formData.day_number} onChange={(e) => setFormData({ ...formData, day_number: parseInt(e.target.value) })}
                  disabled={editingReward}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50">
                  {availableDays.map(day => (
                    <option key={day} value={day}>Day {day} {day === 7 ? '(Jackpot Day)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Bonus Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bonus Type</label>
                <select value={formData.bonus_type} onChange={(e) => setFormData({ ...formData, bonus_type: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {BONUS_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Quantity - Only for coin, diamond, free_spin */}
              {!['token', 'board'].includes(formData.bonus_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                  <input type="number" required min="1" value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., 1000" />
                </div>
              )}

              {/* Token Style - Only for token type */}
              {formData.bonus_type === 'token' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Token Style</label>
                  <select value={formData.token_style} onChange={(e) => handleTokenStyleChange(e.target.value)}
                    required className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">Select Token Style</option>
                    {loadingInventory ? (
                      <option disabled>Loading tokens...</option>
                    ) : (
                      tokenItems.map(item => (
                        <option key={item.item_id} value={item.item_id}>{item.item_name}</option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Board Theme - Only for board type */}
              {formData.bonus_type === 'board' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Board Theme</label>
                  <select value={formData.token_style} onChange={(e) => handleTokenStyleChange(e.target.value)}
                    required className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">Select Board Theme</option>
                    {loadingInventory ? (
                      <option disabled>Loading boards...</option>
                    ) : (
                      boardItems.map(item => (
                        <option key={item.item_id} value={item.item_id}>{item.item_name}</option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Duration - Only for token and board types */}
              {['token', 'board'].includes(formData.bonus_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="radio" name="duration" checked={formData.duration_days === null}
                        onChange={() => setFormData({ ...formData, duration_days: null })}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500" />
                      <span className="ml-2 text-white">Permanent</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="duration" checked={formData.duration_days !== null}
                        onChange={() => setFormData({ ...formData, duration_days: 7 })}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500" />
                      <span className="ml-2 text-white">Temporary</span>
                    </label>
                    {formData.duration_days !== null && (
                      <div className="ml-6">
                        <input type="number" min="1" max="365" value={formData.duration_days || 7}
                          onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 7 })}
                          className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="7" />
                        <span className="ml-2 text-gray-400">days</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Image Upload - Only for non-token/board rewards */}
              {!['token', 'board'].includes(formData.bonus_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reward Image</label>
                  <label className="block cursor-pointer">
                    <div className={`aspect-video rounded-lg border-2 border-dashed ${imagePreview ? 'border-purple-500' : 'border-gray-600'} flex items-center justify-center overflow-hidden bg-gray-700 hover:border-purple-500 transition-colors`}>
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center p-4">
                          <svg className="w-10 h-10 mx-auto text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-gray-400 text-sm">Click to upload image</span>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e.target.files[0])} />
                  </label>
                  <p className="text-xs text-gray-400 mt-2">
                    For token and board rewards, images are automatically loaded from inventory
                  </p>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Active</span>
                <button type="button" onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_active ? 'bg-purple-600' : 'bg-gray-600'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={resetForm} className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50">
                  {saving ? 'Saving...' : (editingReward ? 'Update' : 'Add Reward')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
