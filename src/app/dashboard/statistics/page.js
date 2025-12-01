'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function StatisticsPage() {
  const [stats, setStats] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [tourneysRes, usersRes, roomsRes] = await Promise.all([
        supabase.from('tournaments').select('*'),
        supabase.from('users').select('*'),
        supabase.from('game_rooms').select('*')
      ]);
      
      setTournaments(tourneysRes.data || []);
      setUsers(usersRes.data || []);
      
      const t = tourneysRes.data || [];
      const u = usersRes.data || [];
      const r = roomsRes.data || [];

      setStats({
        users: {
          total: u.length,
          totalCoins: u.reduce((sum, x) => sum + (x.total_coins || 0), 0),
          totalDiamonds: u.reduce((sum, x) => sum + (x.total_diamonds || 0), 0),
          avgCoins: u.length ? Math.round(u.reduce((sum, x) => sum + (x.total_coins || 0), 0) / u.length) : 0
        },
        tournaments: {
          total: t.length,
          upcoming: t.filter(x => x.status === 'upcoming' || x.status === 'registration').length,
          running: t.filter(x => x.status === 'in_progress' || x.status === 'finals').length,
          completed: t.filter(x => x.status === 'completed').length,
          totalPrize: t.reduce((sum, x) => sum + (x.reward_amount || 0), 0),
          totalParticipants: t.reduce((sum, x) => sum + (x.current_players || 0), 0),
          avgParticipants: t.length ? Math.round(t.reduce((sum, x) => sum + (x.current_players || 0), 0) / t.length) : 0,
          totalEntryFees: t.reduce((sum, x) => sum + ((x.entry_fee || 0) * (x.current_players || 0)), 0)
        },
        games: {
          total: r.length,
          active: r.filter(x => x.game_state === 'playing').length,
          completed: r.filter(x => x.game_state === 'finished').length
        }
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportStats = () => {
    if (!stats) return;
    const data = {
      exportDate: new Date().toISOString(),
      userStats: stats.users,
      tournamentStats: stats.tournaments,
      gameStats: stats.games
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistics_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const exportUsersCSV = () => {
    const headers = ['UID', 'Username', 'Email', 'Coins', 'Diamonds', 'Created At'];
    const rows = users.map(u => [u.uid, u.username || '', u.email || '', u.total_coins || 0, u.total_diamonds || 0, u.created_at || '']);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportTournamentsCSV = () => {
    const headers = ['ID', 'Name', 'Status', 'Entry Fee', 'Reward', 'Players', 'Start Time'];
    const rows = tournaments.map(t => [t.tournament_id, t.tournament_name, t.status, t.entry_fee || 0, t.reward_amount || 0, t.current_players || 0, t.tournament_starting_time || '']);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournaments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Statistics & Analytics</h1>
        <div className="flex space-x-3">
          <button onClick={exportUsersCSV} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Export Users CSV</button>
          <button onClick={exportTournamentsCSV} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">Export Tournaments CSV</button>
          <button onClick={exportStats} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">Export All JSON</button>
        </div>
      </div>

      {/* User Stats */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          User Statistics
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-white">{stats?.users.total.toLocaleString()}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Coins</p>
            <p className="text-3xl font-bold text-yellow-400">{stats?.users.totalCoins.toLocaleString()}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Diamonds</p>
            <p className="text-3xl font-bold text-cyan-400">{stats?.users.totalDiamonds.toLocaleString()}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Avg Coins/User</p>
            <p className="text-3xl font-bold text-green-400">{stats?.users.avgCoins.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Tournament Stats */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
          Tournament Statistics
        </h2>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Tournaments</p>
            <p className="text-3xl font-bold text-white">{stats?.tournaments.total}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Prize Pool</p>
            <p className="text-3xl font-bold text-yellow-400">{stats?.tournaments.totalPrize.toLocaleString()}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Participants</p>
            <p className="text-3xl font-bold text-purple-400">{stats?.tournaments.totalParticipants}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Entry Fees Collected</p>
            <p className="text-3xl font-bold text-green-400">{stats?.tournaments.totalEntryFees.toLocaleString()}</p>
          </div>
        </div>
        
        {/* Status Distribution */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-3">Status Distribution</p>
          <div className="flex h-6 rounded-lg overflow-hidden mb-2">
            {stats?.tournaments.upcoming > 0 && <div className="bg-blue-500" style={{ width: `${(stats.tournaments.upcoming / stats.tournaments.total) * 100}%` }}></div>}
            {stats?.tournaments.running > 0 && <div className="bg-green-500" style={{ width: `${(stats.tournaments.running / stats.tournaments.total) * 100}%` }}></div>}
            {stats?.tournaments.completed > 0 && <div className="bg-gray-500" style={{ width: `${(stats.tournaments.completed / stats.tournaments.total) * 100}%` }}></div>}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-400">Upcoming: {stats?.tournaments.upcoming}</span>
            <span className="text-green-400">Running: {stats?.tournaments.running}</span>
            <span className="text-gray-400">Completed: {stats?.tournaments.completed}</span>
          </div>
        </div>
      </div>

      {/* Game Stats */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Game Statistics
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Game Rooms</p>
            <p className="text-3xl font-bold text-white">{stats?.games.total}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Active Games</p>
            <p className="text-3xl font-bold text-green-400">{stats?.games.active}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Completed Games</p>
            <p className="text-3xl font-bold text-gray-400">{stats?.games.completed}</p>
          </div>
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Revenue Overview
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Tournament Entry Fees</span>
              <span className="text-yellow-400 font-bold">{stats?.tournaments.totalEntryFees.toLocaleString()} coins</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Prize Pool Distributed</span>
              <span className="text-red-400 font-bold">-{stats?.tournaments.totalPrize.toLocaleString()} coins</span>
            </div>
            <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
              <span className="text-white font-medium">Net Revenue</span>
              <span className={`font-bold ${(stats?.tournaments.totalEntryFees - stats?.tournaments.totalPrize) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {((stats?.tournaments.totalEntryFees || 0) - (stats?.tournaments.totalPrize || 0)).toLocaleString()} coins
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            Quick Insights
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Avg Players/Tournament</span>
              <span className="text-white font-bold">{stats?.tournaments.avgParticipants}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Avg Coins/User</span>
              <span className="text-white font-bold">{stats?.users.avgCoins.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Tournament Fill Rate</span>
              <span className="text-white font-bold">
                {stats?.tournaments.total > 0 ? Math.round((stats.tournaments.totalParticipants / (stats.tournaments.total * 8)) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
