'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GiftUsersPage() {
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [giftHistory, setGiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [giftType, setGiftType] = useState('item'); // item, coins, diamonds
  const [selectedItem, setSelectedItem] = useState(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { fetchData(); }, []);

  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch users first
      console.log('Fetching users...');
      const usersRes = await supabase
        .from('users')
        .select('uid, username, profile_image_url, total_coins, total_diamonds, owned_items');
      
      console.log('Users response:', usersRes);
      
      if (usersRes.error) {
        console.error('Error fetching users:', usersRes.error);
        setError('Failed to fetch users: ' + usersRes.error.message);
      } else {
        console.log('Users fetched:', usersRes.data?.length || 0);
        setUsers(usersRes.data || []);
      }

      // Fetch inventory items
      const itemsRes = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (itemsRes.error) {
        console.error('Error fetching items:', itemsRes.error);
      } else {
        setItems(itemsRes.data || []);
      }

      // Fetch gift history separately without join
      const historyRes = await supabase
        .from('gift_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (historyRes.error) {
        console.log('Gift history error:', historyRes.error.message);
      } else if (historyRes.data && historyRes.data.length > 0) {
        // Fetch user details for gift history
        const userIds = [...new Set(historyRes.data.map(g => g.user_id))];
        const { data: historyUsers } = await supabase
          .from('users')
          .select('uid, username')
          .in('uid', userIds);
        
        const usersMap = {};
        (historyUsers || []).forEach(u => { usersMap[u.uid] = u; });
        
        const historyWithUsers = historyRes.data.map(g => ({
          ...g,
          users: usersMap[g.user_id] || null
        }));
        setGiftHistory(historyWithUsers);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openGiftModal = (user) => {
    setSelectedUser(user);
    setGiftType('item');
    setSelectedItem(null);
    setAmount('');
    setMessage('');
    setShowModal(true);
  };

  const sendGift = async () => {
    if (!selectedUser) return;
    
    if (giftType === 'item' && !selectedItem) {
      alert('Please select an item to gift');
      return;
    }
    if ((giftType === 'coins' || giftType === 'diamonds') && (!amount || parseInt(amount) <= 0)) {
      alert('Please enter a valid amount');
      return;
    }

    setSending(true);
    try {
      const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
      
      if (giftType === 'item') {
        // Add item to user's owned_items
        const currentItems = selectedUser.owned_items || [];
        const updatedItems = [...currentItems, selectedItem.item_id];
        
        await supabase
          .from('users')
          .update({ owned_items: updatedItems })
          .eq('uid', selectedUser.uid);

        // Record gift history (optional - table may not exist)
        try {
          await supabase.from('gift_history').insert({
            admin_id: adminUser.email || 'admin',
            user_id: selectedUser.uid,
            gift_type: 'item',
            item_id: selectedItem.item_id,
            item_name: selectedItem.item_name,
            message: message || `You received a gift: ${selectedItem.item_name}!`
          });
        } catch (e) { console.log('Gift history not recorded:', e); }

        // Send mail notification
        await sendMailNotification(selectedUser.uid, 'gift', 
          `🎁 You received a gift!`,
          message || `You've been gifted "${selectedItem.item_name}"! Check your inventory to use it.`
        );

      } else if (giftType === 'coins') {
        const newCoins = (selectedUser.total_coins || 0) + parseInt(amount);
        
        await supabase
          .from('users')
          .update({ total_coins: newCoins })
          .eq('uid', selectedUser.uid);

        try {
          await supabase.from('gift_history').insert({
            admin_id: adminUser.email || 'admin',
            user_id: selectedUser.uid,
            gift_type: 'coins',
            amount: parseInt(amount),
            message: message || `You received ${amount} coins!`
          });
        } catch (e) { console.log('Gift history not recorded:', e); }

        await sendMailNotification(selectedUser.uid, 'reward',
          `🪙 You received ${amount} coins!`,
          message || `${amount} coins have been added to your account. Enjoy!`
        );

      } else if (giftType === 'diamonds') {
        const newDiamonds = (selectedUser.total_diamonds || 0) + parseInt(amount);
        
        await supabase
          .from('users')
          .update({ total_diamonds: newDiamonds })
          .eq('uid', selectedUser.uid);

        try {
          await supabase.from('gift_history').insert({
            admin_id: adminUser.email || 'admin',
            user_id: selectedUser.uid,
            gift_type: 'diamonds',
            amount: parseInt(amount),
            message: message || `You received ${amount} diamonds!`
          });
        } catch (e) { console.log('Gift history not recorded:', e); }

        await sendMailNotification(selectedUser.uid, 'reward',
          `💎 You received ${amount} diamonds!`,
          message || `${amount} diamonds have been added to your account. Enjoy!`
        );
      }

      alert('Gift sent successfully!');
      setShowModal(false);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error sending gift:', err);
      alert('Failed to send gift: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const sendMailNotification = async (userId, type, title, content) => {
    try {
      // Get current user's mailbox (JSONB array in users table)
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('mailbox')
        .eq('uid', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching user mailbox:', fetchError);
        return;
      }

      const currentMailbox = userData?.mailbox || [];
      
      // Create new mail item matching the app's structure
      const newMail = {
        mail_type: type === 'gift' ? 'general' : type, // 'general', 'reward', etc.
        title: title,
        content: content,
        timestamp: new Date().toISOString(),
        seen: false
      };

      // Add new mail to the beginning of the array
      const { error: updateError } = await supabase
        .from('users')
        .update({ mailbox: [newMail, ...currentMailbox] })
        .eq('uid', userId);

      if (updateError) {
        console.error('Error updating user mail:', updateError);
      } else {
        console.log('Mail sent successfully to user:', userId);
      }
    } catch (err) {
      console.error('Error sending mail notification:', err);
    }
  };


  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Gift Users</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Available Items</p>
          <p className="text-2xl font-bold text-purple-400">{items.length}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Gifts Sent (Total)</p>
          <p className="text-2xl font-bold text-green-400">{giftHistory.length}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Items Gifted</p>
          <p className="text-2xl font-bold text-yellow-400">
            {giftHistory.filter(g => g.gift_type === 'item').length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Users List */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-3">Select User to Gift</h2>
            <input type="text" placeholder="Search by username..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-red-400 mb-2">⚠️ Error</p>
                <p className="text-gray-400 text-sm">{error}</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'No users match your search' : 'No users found'}
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.uid} className="p-4 border-b border-gray-700 hover:bg-gray-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {user.profile_image_url ? (
                      <img src={user.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">{user.username || 'No username'}</p>
                      <p className="text-gray-400 text-sm text-xs">ID: {user.uid?.slice(0, 8)}...</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-yellow-400 text-xs">🪙 {user.total_coins || 0}</span>
                        <span className="text-cyan-400 text-xs">💎 {user.total_diamonds || 0}</span>
                        <span className="text-purple-400 text-xs">📦 {(user.owned_items || []).length} items</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => openGiftModal(user)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    Gift
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Gift History */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Recent Gift History</h2>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {giftHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No gifts sent yet</div>
            ) : (
              giftHistory.map(gift => (
                <div key={gift.id} className="p-4 border-b border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">
                        {gift.users?.username || 'Unknown'}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {gift.gift_type === 'item' ? (
                          <span className="text-purple-400">📦 {gift.item_name}</span>
                        ) : gift.gift_type === 'coins' ? (
                          <span className="text-yellow-400">🪙 {gift.amount} coins</span>
                        ) : (
                          <span className="text-cyan-400">💎 {gift.amount} diamonds</span>
                        )}
                      </p>
                      {gift.message && (
                        <p className="text-gray-500 text-xs mt-1 italic">"{gift.message}"</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">{new Date(gift.created_at).toLocaleDateString()}</p>
                      <p className="text-gray-600 text-xs">{gift.admin_id}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>


      {/* Gift Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-700 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Send Gift</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Selected User Info */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6 flex items-center gap-3">
              {selectedUser.profile_image_url ? (
                <img src={selectedUser.profile_image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div>
                <p className="text-white font-medium">{selectedUser.username || 'No username'}</p>
                <p className="text-gray-400 text-sm">ID: {selectedUser.uid?.slice(0, 12)}...</p>
              </div>
            </div>

            {/* Gift Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Gift Type</label>
              <div className="flex gap-2">
                {[
                  { type: 'item', label: '📦 Item', color: 'purple' },
                  { type: 'coins', label: '🪙 Coins', color: 'yellow' },
                  { type: 'diamonds', label: '💎 Diamonds', color: 'cyan' }
                ].map(g => (
                  <button key={g.type} onClick={() => { setGiftType(g.type); setSelectedItem(null); setAmount(''); }}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      giftType === g.type 
                        ? `bg-${g.color}-600 text-white` 
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                    style={giftType === g.type ? { 
                      backgroundColor: g.color === 'purple' ? '#9333ea' : g.color === 'yellow' ? '#ca8a04' : '#0891b2'
                    } : {}}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Item Selection */}
            {giftType === 'item' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Item</label>
                <div className="max-h-48 overflow-y-auto bg-gray-700/50 rounded-lg p-2 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No items available</p>
                  ) : (
                    items.map(item => (
                      <div key={item.item_id} onClick={() => setSelectedItem(item)}
                        className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${
                          selectedItem?.item_id === item.item_id 
                            ? 'bg-purple-600/30 border border-purple-500' 
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}>
                        {item.item_images && Object.values(item.item_images)[0] && (
                          <img src={Object.values(item.item_images)[0]} alt="" className="w-10 h-10 rounded object-cover" />
                        )}
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.item_name}</p>
                          <p className="text-gray-400 text-xs capitalize">{item.item_type}</p>
                        </div>
                        {selectedItem?.item_id === item.item_id && (
                          <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Amount Input */}
            {(giftType === 'coins' || giftType === 'diamonds') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount of {giftType === 'coins' ? 'Coins' : 'Diamonds'}
                </label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <div className="flex gap-2 mt-2">
                  {[100, 500, 1000, 5000, 10000].map(val => (
                    <button key={val} onClick={() => setAmount(val.toString())}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm">
                      {val >= 1000 ? `${val/1000}K` : val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Gift Message (optional)
              </label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={2}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                Cancel
              </button>
              <button onClick={sendGift} disabled={sending}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    Send Gift
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
