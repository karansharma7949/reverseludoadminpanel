'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editCoins, setEditCoins] = useState('');
  const [editDiamonds, setEditDiamonds] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tournamentStats, setTournamentStats] = useState({ total: 0, running: 0, totalPrize: 0 });
  const [gameStats, setGameStats] = useState({ total: 0, active: 0 });

  useEffect(() => { fetchUsers(); fetchStats(); }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [tourneysRes, roomsRes] = await Promise.all([
        supabase.from('tournaments').select('*'),
        supabase.from('game_rooms').select('game_state')
      ]);
      const t = tourneysRes.data || [];
      const r = roomsRes.data || [];
      setTournamentStats({
        total: t.length,
        running: t.filter(x => x.status === 'in_progress' || x.status === 'finals').length,
        totalPrize: t.reduce((sum, x) => sum + (x.reward_amount || 0), 0)
      });
      setGameStats({
        total: r.length,
        active: r.filter(x => x.game_state === 'playing').length
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditCoins(user.coins?.toString() || '0');
    setEditDiamonds(user.diamonds?.toString() || '0');
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditCoins('');
    setEditDiamonds('');
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editingUser.id, coins: parseInt(editCoins) || 0, diamonds: parseInt(editDiamonds) || 0 }),
      });
      const data = await response.json();
      if (data.user) {
        setUsers(users.map(u => u.id === data.user.id ? data.user : u));
        closeEditModal();
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setSaving(false);
    }
  };


  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-gray-400 text-xs">Users</p>
              <p className="text-xl font-bold text-white">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
            </div>
            <div className="ml-3">
              <p className="text-gray-400 text-xs">Total Coins</p>
              <p className="text-xl font-bold text-yellow-400">{users.reduce((sum, u) => sum + (u.coins || 0), 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" /></svg>
            </div>
            <div className="ml-3">
              <p className="text-gray-400 text-xs">Diamonds</p>
              <p className="text-xl font-bold text-cyan-400">{users.reduce((sum, u) => sum + (u.diamonds || 0), 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            </div>
            <div className="ml-3">
              <p className="text-gray-400 text-xs">Tournaments</p>
              <p className="text-xl font-bold text-purple-400">{tournamentStats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
            </div>
            <div className="ml-3">
              <p className="text-gray-400 text-xs">Active Games</p>
              <p className="text-xl font-bold text-green-400">{gameStats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
            </div>
            <div className="ml-3">
              <p className="text-gray-400 text-xs">Prize Pool</p>
              <p className="text-xl font-bold text-orange-400">{tournamentStats.totalPrize.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Users</h2>
          <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64" />
        </div>
        {usersLoading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Coins</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Diamonds</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">{u.username?.[0]?.toUpperCase() || '?'}</div>
                        <div className="ml-3">
                          <p className="text-white font-medium">{u.username || 'No username'}</p>
                          <p className="text-gray-500 text-xs">{u.id?.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{u.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="text-yellow-400 font-medium">{(u.coins || 0).toLocaleString()}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="text-cyan-400 font-medium">{(u.diamonds || 0).toLocaleString()}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button onClick={() => setViewingUser(u)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Details</button>
                        <button onClick={() => openEditModal(u)} className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <div className="p-8 text-center text-gray-500">No users found</div>}
          </div>
        )}
      </div>


      {/* User Details Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">User Details</h3>
              <button onClick={() => setViewingUser(null)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Basic Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                        {viewingUser.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-white font-medium text-lg">{viewingUser.username || 'No username'}</p>
                        <p className="text-gray-400 text-sm">{viewingUser.email || 'No email'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-gray-400 text-sm">User ID</p>
                        <p className="text-white font-mono text-sm">{viewingUser.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Status</p>
                        <p className="text-white">{viewingUser.status || 'Active'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Joined</p>
                        <p className="text-white">{viewingUser.created_at ? new Date(viewingUser.created_at).toLocaleDateString() : '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Last Updated</p>
                        <p className="text-white">{viewingUser.updated_at ? new Date(viewingUser.updated_at).toLocaleDateString() : '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Currency & Assets */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    Currency & Assets
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-yellow-400 text-sm font-medium">Coins</p>
                          <p className="text-white text-xl font-bold">{(viewingUser.coins || 0).toLocaleString()}</p>
                        </div>
                        <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      </div>
                    </div>
                    <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-cyan-400 text-sm font-medium">Diamonds</p>
                          <p className="text-white text-xl font-bold">{(viewingUser.diamonds || 0).toLocaleString()}</p>
                        </div>
                        <svg className="w-8 h-8 text-cyan-500" fill="currentColor" viewBox="0 0 24 24">
                          <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-gray-400 text-sm mb-2">Owned Items</p>
                    <div className="bg-gray-800 rounded p-2 max-h-20 overflow-y-auto">
                      <p className="text-white text-sm font-mono">
                        {viewingUser.owned_items ? JSON.stringify(viewingUser.owned_items).slice(0, 100) + '...' : 'None'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Game Statistics */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                    </svg>
                    Game Statistics
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-green-400 text-2xl font-bold">{viewingUser.games_won || 0}</p>
                      <p className="text-gray-400 text-sm">Games Won</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-400 text-2xl font-bold">{viewingUser.games_lost || 0}</p>
                      <p className="text-gray-400 text-sm">Games Lost</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-400 text-2xl font-bold">{viewingUser.win_streak || 0}</p>
                      <p className="text-gray-400 text-sm">Win Streak</p>
                    </div>
                    <div className="text-center">
                      <p className="text-yellow-400 text-2xl font-bold">{viewingUser.tournaments_won || 0}</p>
                      <p className="text-gray-400 text-sm">Tournaments Won</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Win Rate</span>
                      <span className="text-white font-medium">
                        {viewingUser.games_won || viewingUser.games_lost ? 
                          Math.round((viewingUser.games_won || 0) / ((viewingUser.games_won || 0) + (viewingUser.games_lost || 0)) * 100) + '%' 
                          : '0%'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Customization */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                    </svg>
                    Profile Customization
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-400 text-sm">Selected Dice Style</p>
                      <p className="text-white">{viewingUser.selected_dice_style || 'Default'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Selected Board Style</p>
                      <p className="text-white">{viewingUser.selected_board_style || 'Default'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Selected Token Style</p>
                      <p className="text-white">{viewingUser.selected_token_style || 'Default'}</p>
                    </div>
                    {viewingUser.profile_image_url && (
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Profile Image</p>
                        <img src={viewingUser.profile_image_url} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Social & Activity */}
                <div className="bg-gray-700/30 rounded-lg p-4 lg:col-span-2">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Social & Activity
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Active Game</p>
                      <p className="text-white">{viewingUser.active_game || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Friends Count</p>
                      <p className="text-white">{viewingUser.friends ? (Array.isArray(viewingUser.friends) ? viewingUser.friends.length : 0) : 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Friend Requests</p>
                      <p className="text-white">{viewingUser.friend_requests ? (Array.isArray(viewingUser.friend_requests) ? viewingUser.friend_requests.length : 0) : 0}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-2">Recent Played</p>
                      <div className="bg-gray-800 rounded p-2 max-h-20 overflow-y-auto">
                        <p className="text-white text-sm font-mono">
                          {viewingUser.recent_played ? JSON.stringify(viewingUser.recent_played).slice(0, 100) + '...' : 'None'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-2">Mailbox</p>
                      <div className="bg-gray-800 rounded p-2 max-h-20 overflow-y-auto">
                        <p className="text-white text-sm font-mono">
                          {viewingUser.mailbox ? JSON.stringify(viewingUser.mailbox).slice(0, 100) + '...' : 'Empty'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {viewingUser.talk_time_end_date && (
                    <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <p className="text-orange-400 text-sm font-medium">Talk Time Restriction</p>
                      <p className="text-white text-sm">Ends: {new Date(viewingUser.talk_time_end_date).toLocaleString()}</p>
                    </div>
                  )}
                  {viewingUser.is_bot && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-400 text-sm font-medium">🤖 Bot Account</p>
                      <p className="text-white text-sm">This is an automated bot user</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">Edit User</h3>
            <p className="text-gray-400 mb-6">{editingUser.username || editingUser.email || editingUser.id}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Coins</label>
                <input type="number" value={editCoins} onChange={(e) => setEditCoins(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Diamonds</label>
                <input type="number" value={editDiamonds} onChange={(e) => setEditDiamonds(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={closeEditModal} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
