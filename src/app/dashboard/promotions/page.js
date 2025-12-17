'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    main_image: '',
    app_link: '',
    reward_amount: 5000,
    duration_days: 30,
    display_order: 0,
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  async function loadPromotions() {
    try {
      const { data, error } = await supabase
        .from('promotion_apps')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `promotion_${Date.now()}.${fileExt}`;
      const filePath = `promotions/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('promotion-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('promotion-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update form data with the URL
      setFormData({ ...formData, main_image: publicUrl });
      setImagePreview(publicUrl);

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Make sure the "promotion-images" bucket exists in Supabase Storage.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingPromotion) {
        const { error } = await supabase
          .from('promotion_apps')
          .update(formData)
          .eq('id', editingPromotion.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('promotion_apps')
          .insert([formData]);

        if (error) throw error;
      }

      resetForm();
      loadPromotions();
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert('Failed to save promotion');
    } finally {
      setSaving(false);
    }
  }

  async function deletePromotion(id) {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const { error } = await supabase
        .from('promotion_apps')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
    }
  }

  async function toggleActive(promotion) {
    try {
      const { error } = await supabase
        .from('promotion_apps')
        .update({ is_active: !promotion.is_active })
        .eq('id', promotion.id);

      if (error) throw error;
      loadPromotions();
    } catch (error) {
      console.error('Error toggling promotion:', error);
    }
  }

  function editPromotion(promotion) {
    setEditingPromotion(promotion);
    setFormData({
      title: promotion.title,
      description: promotion.description,
      main_image: promotion.main_image || '',
      app_link: promotion.app_link || '',
      reward_amount: promotion.reward_amount,
      duration_days: promotion.duration_days || 30,
      display_order: promotion.display_order || 0,
    });
    setImagePreview(promotion.main_image || null);
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      main_image: '',
      app_link: '',
      reward_amount: 5000,
      duration_days: 30,
      display_order: 0,
    });
    setEditingPromotion(null);
    setShowForm(false);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Promotion Apps</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
          </svg>
          {showForm ? 'Cancel' : 'Add Promotion'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-gray-400 text-xs">Total Promotions</p>
              <p className="text-xl font-bold text-white">{promotions.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-gray-400 text-xs">Active</p>
              <p className="text-xl font-bold text-green-400">{promotions.filter(p => p.is_active).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
            </div>
            <div className="ml-3">
              <p className="text-gray-400 text-xs">Total Rewards</p>
              <p className="text-xl font-bold text-yellow-400">{promotions.reduce((sum, p) => sum + (p.reward_amount || 0), 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Get Coins"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reward Amount</label>
                  <input
                    type="number"
                    value={formData.reward_amount}
                    onChange={(e) => setFormData({ ...formData, reward_amount: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="e.g., Install Addictive Games and Score 400 in Nosy Run"
                  required
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">App Image</label>
                <div className="flex items-start gap-4">
                  {/* Image Preview */}
                  <div className="w-24 h-24 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Upload Button */}
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Upload Image
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                    
                    {/* Hidden URL input for form submission */}
                    <input
                      type="hidden"
                      value={formData.main_image}
                      required
                    />
                    {formData.main_image && (
                      <p className="text-xs text-green-400 mt-1 truncate">✓ Image uploaded</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">App Link (Play Store)</label>
                <input
                  type="url"
                  value={formData.app_link}
                  onChange={(e) => setFormData({ ...formData, app_link: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://play.google.com/store/apps/..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration (Days)</label>
                  <input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Promotion expires after this many days</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={resetForm} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving || !formData.main_image} 
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingPromotion ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promotions Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">All Promotions</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Reward</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {promotions.map((promotion) => (
                  <tr key={promotion.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{promotion.display_order}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {promotion.main_image && (
                          <img src={promotion.main_image} alt="" className="w-10 h-10 rounded-lg mr-3 object-cover" />
                        )}
                        <span className="text-white font-medium">{promotion.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm max-w-xs truncate">{promotion.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-yellow-400 font-medium">{promotion.reward_amount?.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{promotion.duration_days} days</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(promotion)}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          promotion.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {promotion.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => editPromotion(promotion)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePromotion(promotion.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {promotions.length === 0 && (
              <div className="p-8 text-center text-gray-500">No promotions yet. Click "Add Promotion" to create one.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
