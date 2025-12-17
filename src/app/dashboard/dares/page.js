'use client';

import { useState, useEffect } from 'react';

export default function DaresPage() {
  const [dares, setDares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDare, setSelectedDare] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, casual: 0, funny: 0, love: 0, active: 0, inactive: 0 });

  const [formData, setFormData] = useState({
    dare_text: '',
    category: 'casual',
    is_active: true
  });

  const categories = ['casual', 'funny', 'love'];

  useEffect(() => { fetchDares(); }, []);

  const fetchDares = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dares');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDares(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Error fetching dares:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const s = { total: data.length, casual: 0, funny: 0, love: 0, active: 0, inactive: 0 };
    data.forEach(d => {
      if (d.category === 'casual') s.casual++;
      else if (d.category === 'funny') s.funny++;
      else if (d.category === 'love') s.love++;
      if (d.is_active) s.active++;
      else s.inactive++;
    });
    setStats(s);
  };

  const filterDares = () => {
    let filtered = dares;
    if (activeCategory !== 'all') {
      filtered = filtered.filter(d => d.category === activeCategory);
    }
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.dare_text?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  };


  const handleCreate = async () => {
    if (!formData.dare_text.trim()) {
      alert('Please enter dare text');
      return;
    }
    try {
      const res = await fetch('/api/dares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dare_text: formData.dare_text.trim(),
          category: formData.category,
          is_active: formData.is_active
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setShowCreateModal(false);
      resetForm();
      fetchDares();
    } catch (err) {
      console.error('Error creating dare:', err);
      alert('Error creating dare: ' + err.message);
    }
  };

  const handleUpdate = async () => {
    if (!selectedDare || !formData.dare_text.trim()) return;
    try {
      const res = await fetch('/api/dares', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedDare.id,
          dare_text: formData.dare_text.trim(),
          category: formData.category,
          is_active: formData.is_active
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setShowEditModal(false);
      resetForm();
      fetchDares();
    } catch (err) {
      console.error('Error updating dare:', err);
      alert('Error updating dare: ' + err.message);
    }
  };

  const handleDelete = async (dare) => {
    if (!confirm(`Delete this dare?\n\n"${dare.dare_text}"`)) return;
    try {
      const res = await fetch(`/api/dares?id=${dare.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchDares();
    } catch (err) {
      console.error('Error deleting dare:', err);
      alert('Error deleting dare: ' + err.message);
    }
  };

  const handleToggleActive = async (dare) => {
    try {
      const res = await fetch('/api/dares', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dare.id,
          is_active: !dare.is_active
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchDares();
    } catch (err) {
      console.error('Error toggling dare status:', err);
    }
  };

  const openEditModal = (dare) => {
    setSelectedDare(dare);
    setFormData({
      dare_text: dare.dare_text || '',
      category: dare.category || 'casual',
      is_active: dare.is_active ?? true
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ dare_text: '', category: 'casual', is_active: true });
    setSelectedDare(null);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'casual': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'funny': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'love': return 'bg-pink-500/20 text-pink-400 border-pink-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'casual': return '🎯';
      case 'funny': return '😂';
      case 'love': return '❤️';
      default: return '📝';
    }
  };


  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Dare Management</h1>
        <button 
          onClick={() => { resetForm(); setShowCreateModal(true); }} 
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Dare
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Dares</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">🎯 Casual</p>
          <p className="text-2xl font-bold text-blue-400">{stats.casual}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">😂 Funny</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.funny}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">❤️ Love</p>
          <p className="text-2xl font-bold text-pink-400">{stats.love}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Inactive</p>
          <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 mb-6">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-wrap gap-4">
          <div className="flex space-x-2">
            {['all', ...categories].map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)} 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === cat 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All' : `${getCategoryIcon(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
              </button>
            ))}
          </div>
          <input 
            type="text" 
            placeholder="Search dares..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 w-64" 
          />
        </div>

        {/* Dares Table */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Dare Text</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filterDares().map((dare) => (
                  <tr key={dare.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-4">
                      <p className="text-white max-w-xl">{dare.dare_text}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(dare.category)}`}>
                        {getCategoryIcon(dare.category)} {dare.category}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button 
                        onClick={() => handleToggleActive(dare)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          dare.is_active 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {dare.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => openEditModal(dare)} 
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg" 
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(dare)} 
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg" 
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filterDares().length === 0 && (
              <div className="p-8 text-center text-gray-500">No dares found</div>
            )}
          </div>
        )}
      </div>


      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-700 m-4">
            <h3 className="text-xl font-semibold text-white mb-6">
              {showEditModal ? 'Edit Dare' : 'Add New Dare'}
            </h3>
            
            <div className="space-y-4">
              {/* Dare Text */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Dare Text *</label>
                <textarea 
                  value={formData.dare_text} 
                  onChange={(e) => setFormData({ ...formData, dare_text: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" 
                  placeholder="Enter the dare text..."
                />
              </div>
              
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <div className="flex space-x-3">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        formData.category === cat 
                          ? getCategoryColor(cat) + ' ring-2 ring-offset-2 ring-offset-gray-800'
                          : 'bg-gray-700 text-gray-400 border-gray-600 hover:text-white'
                      }`}
                    >
                      {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Active Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setFormData({ ...formData, is_active: true })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.is_active 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    ✓ Active
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, is_active: false })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !formData.is_active 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    ✕ Inactive
                  </button>
                </div>
              </div>
            </div>
            
            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} 
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={showEditModal ? handleUpdate : handleCreate} 
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg"
              >
                {showEditModal ? 'Update Dare' : 'Add Dare'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
