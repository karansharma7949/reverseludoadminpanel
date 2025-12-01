'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [tournamentRooms, setTournamentRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('game');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const [gameRes, tourneyRes] = await Promise.all([
        supabase.from('game_rooms').select('*').order('created_at', { ascending: false }),
        supabase.from('tournament_rooms').select('*').order('created_at', { ascending: false })
      ]);
      setRooms(gameRes.data || []);
      setTournamentRooms(tourneyRes.data || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteRoom = async (room, isTournament = false) => {
    if (!confirm(`Delete room ${room.room_id}?`)) return;
    try {
      const table = isTournament ? 'tournament_rooms' : 'game_rooms';
      await supabase.from(table).delete().eq('id', room.id);
      fetchRooms();
    } catch (err) {
      console.error('Error deleting room:', err);
    }
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'waiting': return 'bg-yellow-500/20 text-yellow-400';
      case 'playing': return 'bg-green-500/20 text-green-400';
      case 'finished': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-blue-500/20 text-blue-400';
    }
  };

  const filterRooms = (roomList) => {
    if (!searchTerm) return roomList;
    return roomList.filter(r => r.room_id?.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const currentRooms = activeTab === 'game' ? filterRooms(rooms) : filterRooms(tournamentRooms);
  const stats = {
    totalGame: rooms.length,
    activeGame: rooms.filter(r => r.game_state === 'playing').length,
    totalTournament: tournamentRooms.length,
    activeTournament: tournamentRooms.filter(r => r.game_state === 'playing').length
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Game Rooms Management</h1>
        <button onClick={fetchRooms} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Game Rooms</p>
          <p className="text-2xl font-bold text-white">{stats.totalGame}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Active Games</p>
          <p className="text-2xl font-bold text-green-400">{stats.activeGame}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Tournament Rooms</p>
          <p className="text-2xl font-bold text-purple-400">{stats.totalTournament}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Active Tournaments</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.activeTournament}</p>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div className="flex space-x-2">
            <button onClick={() => setActiveTab('game')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'game' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
              Game Rooms ({rooms.length})
            </button>
            <button onClick={() => setActiveTab('tournament')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'tournament' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
              Tournament Rooms ({tournamentRooms.length})
            </button>
          </div>
          <input type="text" placeholder="Search by room ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64" />
        </div>

        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Room ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Players</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">State</th>
                  {activeTab === 'tournament' && <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Level</th>}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {currentRooms.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-4 text-white font-mono text-sm">{r.room_id}</td>
                    <td className="px-4 py-4 text-gray-300">{r.no_of_players || Object.keys(r.players || {}).length}</td>
                    <td className="px-4 py-4"><span className={`px-2 py-1 rounded text-xs font-medium ${getStateColor(r.game_state)}`}>{r.game_state || 'unknown'}</span></td>
                    {activeTab === 'tournament' && <td className="px-4 py-4 text-purple-400">{r.room_level}</td>}
                    <td className="px-4 py-4 text-gray-400 text-sm">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-4">
                      <button onClick={() => deleteRoom(r, activeTab === 'tournament')} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentRooms.length === 0 && <div className="p-8 text-center text-gray-500">No rooms found</div>}
          </div>
        )}
      </div>
    </div>
  );
}
