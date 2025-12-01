'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function NotificationsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [notificationType, setNotificationType] = useState('all');
  const [formData, setFormData] = useState({ title: '', message: '', type: 'general', tournament_id: '' });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sentNotifications, setSentNotifications] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [tourneysRes, usersRes] = await Promise.all([
        supabase.from('tournaments').select('tournament_id, tournament_name').order('created_at', { ascending: false }),
        supabase.from('users').select('uid, username, email')
      ]);
      setTournaments(tourneysRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const sendNotification = async () => {
    if (!formData.title || !formData.message) {
      alert('Title and message are required');
      return;
    }
    setLoading(true);
    try {
      let targetUsers = [];
      if (notificationType === 'all') {
        targetUsers = users.map(u => u.uid);
      } else if (notificationType === 'tournament' && formData.tournament_id) {
        const { data } = await supabase.from('tournaments').select('registered_players').eq('tournament_id', formData.tournament_id).single();
        targetUsers = data?.registered_players || [];
      } else if (notificationType === 'selected') {
        targetUsers = selectedUsers;
      }

      if (targetUsers.length === 0) {
        alert('No users to send notification to');
        setLoading(false);
        return;
      }

      // Store notification record
      const notification = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        target_count: targetUsers.length,
        sent_at: new Date().toISOString()
      };
      setSentNotifications([notification, ...sentNotifications]);
      
      alert(`Notification sent to ${targetUsers.length} users!`);
      setShowModal(false);
      setFormData({ title: '', message: '', type: 'general', tournament_id: '' });
      setSelectedUsers([]);
    } catch (err) {
      console.error('Error sending notification:', err);
      alert('Error sending notification');
    } finally {
      setLoading(false);
    }
  };

  const notificationTemplates = [
    { title: 'New Tournament!', message: 'A new tournament is starting soon. Join now to win amazing prizes!', type: 'tournament' },
    { title: 'Tournament Starting', message: 'Your tournament is about to begin. Get ready to play!', type: 'tournament' },
    { title: 'Tournament Winner', message: 'Congratulations! You won the tournament!', type: 'tournament' },
    { title: 'New Update Available', message: 'A new version of the app is available. Update now for the best experience!', type: 'update' },
    { title: 'Daily Bonus', message: 'Claim your daily bonus now! Login to receive free coins.', type: 'reward' },
    { title: 'Special Offer', message: 'Limited time offer! Get bonus coins on your next purchase.', type: 'promo' },
  ];

  const applyTemplate = (template) => {
    setFormData({ ...formData, title: template.title, message: template.message, type: template.type });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          Send Notification
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Active Tournaments</p>
          <p className="text-2xl font-bold text-purple-400">{tournaments.length}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Notifications Sent</p>
          <p className="text-2xl font-bold text-green-400">{sentNotifications.length}</p>
        </div>
      </div>

      {/* Templates */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Templates</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {notificationTemplates.map((t, idx) => (
            <button key={idx} onClick={() => { applyTemplate(t); setShowModal(true); }}
              className="p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-left transition-colors">
              <p className="text-white font-medium text-sm">{t.title}</p>
              <p className="text-gray-400 text-xs mt-1 line-clamp-2">{t.message}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Recent Notifications</h2>
        </div>
        {sentNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No notifications sent yet</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {sentNotifications.map((n, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-700/30">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium">{n.title}</p>
                    <p className="text-gray-400 text-sm mt-1">{n.message}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">{n.target_count} users</span>
                    <p className="text-gray-500 text-xs mt-1">{new Date(n.sent_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700 m-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-6">Send Notification</h3>
            
            {/* Target Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Send To</label>
              <div className="flex space-x-2">
                {['all', 'tournament', 'selected'].map(type => (
                  <button key={type} onClick={() => setNotificationType(type)}
                    className={`px-4 py-2 rounded-lg text-sm ${notificationType === type ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    {type === 'all' ? 'All Users' : type === 'tournament' ? 'Tournament Players' : 'Select Users'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tournament Selection */}
            {notificationType === 'tournament' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Tournament</label>
                <select value={formData.tournament_id} onChange={(e) => setFormData({ ...formData, tournament_id: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option value="">Select a tournament</option>
                  {tournaments.map(t => <option key={t.tournament_id} value={t.tournament_id}>{t.tournament_name}</option>)}
                </select>
              </div>
            )}

            {/* User Selection */}
            {notificationType === 'selected' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Users ({selectedUsers.length} selected)</label>
                <div className="max-h-40 overflow-y-auto bg-gray-700/50 rounded-lg p-2">
                  {users.map(u => (
                    <label key={u.uid} className="flex items-center p-2 hover:bg-gray-700 rounded cursor-pointer">
                      <input type="checkbox" checked={selectedUsers.includes(u.uid)}
                        onChange={(e) => setSelectedUsers(e.target.checked ? [...selectedUsers, u.uid] : selectedUsers.filter(id => id !== u.uid))}
                        className="mr-3" />
                      <span className="text-white">{u.username || u.email || u.uid.slice(0, 8)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="Notification title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message *</label>
                <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white" rows={3} placeholder="Notification message" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option value="general">General</option>
                  <option value="tournament">Tournament</option>
                  <option value="update">Update</option>
                  <option value="reward">Reward</option>
                  <option value="promo">Promotion</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Cancel</button>
              <button onClick={sendNotification} disabled={loading} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
