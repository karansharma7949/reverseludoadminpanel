'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function TournamentPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, upcoming: 0, running: 0, completed: 0, totalPrize: 0, totalParticipants: 0 });
  const [uploading, setUploading] = useState({ icon: false, reward: false });

  const iconInputRef = useRef(null);
  const rewardInputRef = useRef(null);

  const [formData, setFormData] = useState({
    tournament_name: '',
    tournament_id: '',
    tournament_icon: '',
    reward_type: 'coins',
    reward_amount: 0,
    reward_description: '',
    reward_image: '',
    tournament_starting_time: '',
    tournament_end_date: '',
    entry_fee: 0,
    max_players: 8,
    status: 'upcoming'
  });

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tournaments').select('*').order('tournament_starting_time', { ascending: false });
      if (error) throw error;
      setTournaments(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const s = { total: data.length, upcoming: 0, running: 0, completed: 0, totalPrize: 0, totalParticipants: 0 };
    data.forEach(t => {
      if (t.status === 'upcoming' || t.status === 'registration') s.upcoming++;
      else if (t.status === 'in_progress' || t.status === 'finals') s.running++;
      else if (t.status === 'completed') s.completed++;
      s.totalPrize += t.reward_amount || 0;
      s.totalParticipants += t.current_players || 0;
    });
    setStats(s);
  };

  const uploadImage = async (file, type) => {
    if (!file) return null;
    
    setUploading(prev => ({ ...prev, [type]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `tournament-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tournament-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tournament-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error(`Error uploading ${type}:`, err);
      alert(`Error uploading ${type}: ${err.message}`);
      return null;
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, 'icon');
    if (url) setFormData(prev => ({ ...prev, tournament_icon: url }));
  };

  const handleRewardImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, 'reward');
    if (url) setFormData(prev => ({ ...prev, reward_image: url }));
  };

  const filterTournaments = () => {
    let filtered = tournaments;
    if (activeTab === 'upcoming') filtered = tournaments.filter(t => t.status === 'upcoming' || t.status === 'registration');
    else if (activeTab === 'running') filtered = tournaments.filter(t => t.status === 'in_progress' || t.status === 'finals');
    else if (activeTab === 'completed') filtered = tournaments.filter(t => t.status === 'completed');
    if (searchTerm) filtered = filtered.filter(t => t.tournament_name?.toLowerCase().includes(searchTerm.toLowerCase()) || t.tournament_id?.toLowerCase().includes(searchTerm.toLowerCase()));
    return filtered;
  };

  const handleCreate = async () => {
    try {
      // Auto-determine status based on start time
      const startTime = new Date(formData.tournament_starting_time);
      const now = new Date();
      let autoStatus = 'upcoming';
      if (startTime <= now) {
        autoStatus = 'registration'; // Already started, open for registration/instant
      }

      const insertData = {
        tournament_id: formData.tournament_id || `TOURNEY_${Date.now()}`,
        tournament_name: formData.tournament_name,
        tournament_icon: formData.tournament_icon || null,
        reward_type: formData.reward_type,
        reward_amount: formData.reward_amount,
        reward_description: formData.reward_description || null,
        reward_image: formData.reward_image || null,
        tournament_starting_time: formData.tournament_starting_time,
        tournament_end_date: formData.tournament_end_date || null,
        entry_fee: formData.entry_fee,
        max_players: formData.max_players,
        status: autoStatus,
        tournament_state: {
          room1: { state: 'waiting', roomId: null, players: [], winner: null },
          room2: { state: 'waiting', roomId: null, players: [], winner: null },
          room3: { state: 'waiting', roomId: null, players: [], winner: null },
          room4: { state: 'waiting', roomId: null, players: [], winner: null },
          semifinalWinners: { room1: null, room2: null, room3: null, room4: null },
          finalRoom: { state: 'waiting', roomId: null, players: [] },
          finalWinner: null
        },
        registered_players: [],
        current_players: 0
      };
      
      console.log('Creating tournament with data:', insertData);
      
      const { data, error } = await supabase.from('tournaments').insert([insertData]).select();
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || JSON.stringify(error));
      }
      
      console.log('Tournament created:', data);
      setShowCreateModal(false);
      resetForm();
      fetchTournaments();
    } catch (err) {
      console.error('Error creating tournament:', err);
      alert('Error creating tournament: ' + (err.message || JSON.stringify(err)));
    }
  };

  const handleUpdate = async () => {
    if (!selectedTournament) return;
    try {
      const { error } = await supabase.from('tournaments').update(formData).eq('id', selectedTournament.id);
      if (error) throw error;
      setShowEditModal(false);
      resetForm();
      fetchTournaments();
    } catch (err) {
      console.error('Error updating tournament:', err);
      alert('Error updating tournament: ' + err.message);
    }
  };

  const handleDelete = async (tournament) => {
    if (!confirm(`Delete tournament "${tournament.tournament_name}"?`)) return;
    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', tournament.id);
      if (error) throw error;
      fetchTournaments();
    } catch (err) {
      console.error('Error deleting tournament:', err);
    }
  };

  const handleStatusChange = async (tournament, newStatus) => {
    try {
      const { error } = await supabase.from('tournaments').update({ status: newStatus }).eq('id', tournament.id);
      if (error) throw error;
      fetchTournaments();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const fetchParticipants = async (tournament) => {
    setSelectedTournament(tournament);
    const playerIds = tournament.registered_players || [];
    if (playerIds.length === 0) {
      setParticipants([]);
      setShowParticipantsModal(true);
      return;
    }
    try {
      const { data, error } = await supabase.from('users').select('*').in('uid', playerIds);
      if (error) throw error;
      setParticipants(data || []);
    } catch (err) {
      console.error('Error fetching participants:', err);
      setParticipants([]);
    }
    setShowParticipantsModal(true);
  };

  const removeParticipant = async (userId) => {
    if (!selectedTournament || !confirm('Remove this participant?')) return;
    try {
      const newPlayers = (selectedTournament.registered_players || []).filter(id => id !== userId);
      const { error } = await supabase.from('tournaments').update({
        registered_players: newPlayers,
        current_players: newPlayers.length
      }).eq('id', selectedTournament.id);
      if (error) throw error;
      fetchParticipants({ ...selectedTournament, registered_players: newPlayers });
      fetchTournaments();
    } catch (err) {
      console.error('Error removing participant:', err);
    }
  };

  const openEditModal = (tournament) => {
    setSelectedTournament(tournament);
    setFormData({
      tournament_name: tournament.tournament_name || '',
      tournament_id: tournament.tournament_id || '',
      tournament_icon: tournament.tournament_icon || '',
      reward_type: tournament.reward_type || 'coins',
      reward_amount: tournament.reward_amount || 0,
      reward_description: tournament.reward_description || '',
      reward_image: tournament.reward_image || '',
      tournament_starting_time: tournament.tournament_starting_time ? new Date(tournament.tournament_starting_time).toISOString().slice(0, 16) : '',
      tournament_end_date: tournament.tournament_end_date ? new Date(tournament.tournament_end_date).toISOString().slice(0, 16) : '',
      entry_fee: tournament.entry_fee || 0,
      max_players: tournament.max_players || 8,
      status: tournament.status || 'upcoming'
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      tournament_name: '', tournament_id: '', tournament_icon: '', reward_type: 'coins',
      reward_amount: 0, reward_description: '', reward_image: '', tournament_starting_time: '', tournament_end_date: '', entry_fee: 0, max_players: 8, status: 'upcoming'
    });
    setSelectedTournament(null);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Status', 'Entry Fee', 'Reward', 'Players', 'Max Players', 'Start Time'];
    const rows = tournaments.map(t => [t.tournament_id, t.tournament_name, t.status, t.entry_fee, t.reward_amount, t.current_players, t.max_players, t.tournament_starting_time]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournaments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-400';
      case 'registration': return 'bg-yellow-500/20 text-yellow-400';
      case 'in_progress': return 'bg-green-500/20 text-green-400';
      case 'finals': return 'bg-purple-500/20 text-purple-400';
      case 'completed': return 'bg-gray-500/20 text-gray-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Tournament Management</h1>
        <div className="flex space-x-3">
          <button onClick={exportToCSV} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
          <button onClick={() => setShowStatsModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Statistics
          </button>
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create Tournament
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><p className="text-gray-400 text-sm">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><p className="text-gray-400 text-sm">Upcoming</p><p className="text-2xl font-bold text-blue-400">{stats.upcoming}</p></div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><p className="text-gray-400 text-sm">Running</p><p className="text-2xl font-bold text-green-400">{stats.running}</p></div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><p className="text-gray-400 text-sm">Completed</p><p className="text-2xl font-bold text-gray-400">{stats.completed}</p></div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><p className="text-gray-400 text-sm">Total Prize</p><p className="text-2xl font-bold text-yellow-400">{stats.totalPrize.toLocaleString()}</p></div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><p className="text-gray-400 text-sm">Participants</p><p className="text-2xl font-bold text-purple-400">{stats.totalParticipants}</p></div>
      </div>

      {/* Tabs and Search */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 mb-6">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div className="flex space-x-2">
            {['all', 'upcoming', 'running', 'completed'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Search tournaments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64" />
        </div>

        {/* Tournament Table */}
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tournament</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Entry Fee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Reward</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Players</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Start Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filterTournaments().map((t) => (
                  <tr key={t.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center overflow-hidden">
                          {t.tournament_icon ? <img src={t.tournament_icon} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-lg">🏆</span>}
                        </div>
                        <div className="ml-3">
                          <p className="text-white font-medium">{t.tournament_name}</p>
                          <p className="text-gray-500 text-xs">{t.tournament_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <select value={t.status} onChange={(e) => handleStatusChange(t, e.target.value)} className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(t.status)} bg-transparent border border-current cursor-pointer`}>
                        <option value="upcoming">Upcoming</option>
                        <option value="registration">Registration</option>
                        <option value="in_progress">In Progress</option>
                        <option value="finals">Finals</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-yellow-400 font-medium">{(t.entry_fee || 0).toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        {t.reward_image && <img src={t.reward_image} alt="" className="w-6 h-6 rounded mr-2" />}
                        <span className="text-green-400 font-medium">{(t.reward_amount || 0).toLocaleString()} {t.reward_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4"><button onClick={() => fetchParticipants(t)} className="text-purple-400 hover:text-purple-300">{t.current_players || 0}/{t.max_players || 8}</button></td>
                    <td className="px-4 py-4 text-gray-400 text-sm">{t.tournament_starting_time ? new Date(t.tournament_starting_time).toLocaleString() : '-'}</td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <button onClick={() => openEditModal(t)} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => fetchParticipants(t)} className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg" title="Participants">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(t)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filterTournaments().length === 0 && <div className="p-8 text-center text-gray-500">No tournaments found</div>}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-3xl border border-gray-700 m-4">
            <h3 className="text-xl font-semibold text-white mb-6">{showEditModal ? 'Edit Tournament' : 'Create Tournament'}</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Tournament Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tournament Name *</label>
                <input type="text" value={formData.tournament_name} onChange={(e) => setFormData({ ...formData, tournament_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Weekend Championship" />
              </div>
              {/* Tournament ID */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tournament ID</label>
                <input type="text" value={formData.tournament_id} onChange={(e) => setFormData({ ...formData, tournament_id: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Auto-generated if empty" />
              </div>
              
              {/* Tournament Icon Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tournament Icon</label>
                <div className="flex items-center space-x-3">
                  <input type="file" ref={iconInputRef} onChange={handleIconUpload} accept="image/*" className="hidden" />
                  <button onClick={() => iconInputRef.current?.click()} disabled={uploading.icon}
                    className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 disabled:opacity-50 flex items-center">
                    {uploading.icon ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>Uploading...</>
                    ) : (
                      <><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Upload Icon</>
                    )}
                  </button>
                  {formData.tournament_icon && (
                    <div className="flex items-center">
                      <img src={formData.tournament_icon} alt="Icon" className="w-10 h-10 rounded-lg object-cover" />
                      <button onClick={() => setFormData({ ...formData, tournament_icon: '' })} className="ml-2 text-red-400 hover:text-red-300">✕</button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Time *</label>
                <input type="datetime-local" value={formData.tournament_starting_time} onChange={(e) => setFormData({ ...formData, tournament_starting_time: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              
              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Date *</label>
                <input type="datetime-local" value={formData.tournament_end_date} onChange={(e) => setFormData({ ...formData, tournament_end_date: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              
              {/* Reward Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reward Type</label>
                <select value={formData.reward_type} onChange={(e) => setFormData({ ...formData, reward_type: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="coins">Coins</option>
                  <option value="diamonds">Diamonds</option>
                  <option value="external_gift">External Gift</option>
                </select>
              </div>
              
              {/* Reward Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reward Amount</label>
                <input type="number" value={formData.reward_amount} onChange={(e) => setFormData({ ...formData, reward_amount: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              
              {/* Reward Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reward Image</label>
                <div className="flex items-center space-x-3">
                  <input type="file" ref={rewardInputRef} onChange={handleRewardImageUpload} accept="image/*" className="hidden" />
                  <button onClick={() => rewardInputRef.current?.click()} disabled={uploading.reward}
                    className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 disabled:opacity-50 flex items-center">
                    {uploading.reward ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>Uploading...</>
                    ) : (
                      <><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>Upload Reward</>
                    )}
                  </button>
                  {formData.reward_image && (
                    <div className="flex items-center">
                      <img src={formData.reward_image} alt="Reward" className="w-10 h-10 rounded-lg object-cover" />
                      <button onClick={() => setFormData({ ...formData, reward_image: '' })} className="ml-2 text-red-400 hover:text-red-300">✕</button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Entry Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Entry Fee</label>
                <input type="number" value={formData.entry_fee} onChange={(e) => setFormData({ ...formData, entry_fee: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              
              {/* Max Players */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Players</label>
                <input type="number" value={formData.max_players} onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) || 8 })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              
              {showEditModal && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="upcoming">Upcoming</option>
                    <option value="registration">Registration</option>
                    <option value="in_progress">In Progress</option>
                    <option value="finals">Finals</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
              
              {formData.reward_type === 'external_gift' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reward Description</label>
                  <textarea value={formData.reward_description} onChange={(e) => setFormData({ ...formData, reward_description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" rows={2} placeholder="Describe the prize..." />
                </div>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Cancel</button>
              <button onClick={showEditModal ? handleUpdate : handleCreate} disabled={uploading.icon || uploading.reward} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50">
                {showEditModal ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipantsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700 m-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Participants - {selectedTournament?.tournament_name}</h3>
              <button onClick={() => setShowParticipantsModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {participants.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No participants registered yet</p>
            ) : (
              <div className="space-y-3">
                {participants.map((p, idx) => (
                  <div key={p.uid || idx} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                        {p.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="ml-3">
                        <p className="text-white font-medium">{p.username || 'Unknown'}</p>
                        <p className="text-gray-500 text-xs">{p.uid?.slice(0, 12)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-yellow-400 text-sm">{(p.total_coins || 0).toLocaleString()} coins</p>
                        <p className="text-cyan-400 text-sm">{(p.total_diamonds || 0).toLocaleString()} diamonds</p>
                      </div>
                      <button onClick={() => removeParticipant(p.uid)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg" title="Remove">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-sm">Total: {participants.length} / {selectedTournament?.max_players || 8} players</p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl border border-gray-700 m-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Tournament Statistics</h3>
              <button onClick={() => setShowStatsModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{stats.total}</p>
                <p className="text-gray-400 text-sm">Total Tournaments</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-yellow-400">{stats.totalPrize.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Total Prize Pool</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-purple-400">{stats.totalParticipants}</p>
                <p className="text-gray-400 text-sm">Total Participants</p>
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <h4 className="text-white font-medium mb-4">Status Distribution</h4>
              <div className="flex h-8 rounded-lg overflow-hidden">
                {stats.upcoming > 0 && <div className="bg-blue-500" style={{ width: `${(stats.upcoming / stats.total) * 100}%` }}></div>}
                {stats.running > 0 && <div className="bg-green-500" style={{ width: `${(stats.running / stats.total) * 100}%` }}></div>}
                {stats.completed > 0 && <div className="bg-gray-500" style={{ width: `${(stats.completed / stats.total) * 100}%` }}></div>}
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-blue-400">Upcoming: {stats.upcoming}</span>
                <span className="text-green-400">Running: {stats.running}</span>
                <span className="text-gray-400">Completed: {stats.completed}</span>
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-4">Recent Completed Tournaments</h4>
              <div className="space-y-2">
                {tournaments.filter(t => t.status === 'completed').slice(0, 5).map(t => (
                  <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-0">
                    <span className="text-white">{t.tournament_name}</span>
                    <span className="text-yellow-400">{(t.reward_amount || 0).toLocaleString()} {t.reward_type}</span>
                  </div>
                ))}
                {tournaments.filter(t => t.status === 'completed').length === 0 && (
                  <p className="text-gray-500 text-center py-4">No completed tournaments yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
