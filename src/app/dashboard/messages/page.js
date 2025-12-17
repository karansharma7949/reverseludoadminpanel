'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function UserMessagesPage() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread, open, closed
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchChats(); }, [filter]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      markAsRead(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    // Subscribe to new chats
    const chatsChannel = supabase
      .channel('admin_chats_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'admin_chats' },
        () => {
          console.log('Chat updated, refreshing...');
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
    };
  }, [filter]);

  // Real-time subscription for messages in selected chat
  useEffect(() => {
    if (!selectedChat) return;

    const messagesChannel = supabase
      .channel(`chat_messages_${selectedChat.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_chat_messages', filter: `chat_id=eq.${selectedChat.id}` },
        (payload) => {
          console.log('New message received:', payload);
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedChat?.id]);

  const [error, setError] = useState(null);

  const fetchChats = async () => {
    setLoading(true);
    setError(null);
    try {
      // First fetch chats
      let query = supabase
        .from('admin_chats')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (filter === 'unread') query = query.eq('unread_by_admin', true);
      else if (filter === 'open') query = query.eq('status', 'open');
      else if (filter === 'closed') query = query.eq('status', 'closed');

      const { data: chatsData, error: queryError } = await query;
      
      if (queryError) {
        console.error('Query error:', queryError);
        setError(queryError.message || 'Failed to fetch chats');
        return;
      }

      if (!chatsData || chatsData.length === 0) {
        setChats([]);
        return;
      }

      // Fetch user details separately
      const userIds = [...new Set(chatsData.map(c => c.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('uid, username, profile_image_url')
        .in('uid', userIds);

      // Merge user data into chats
      const usersMap = {};
      (usersData || []).forEach(u => { usersMap[u.uid] = u; });
      
      const chatsWithUsers = chatsData.map(chat => ({
        ...chat,
        users: usersMap[chat.user_id] || null
      }));

      setChats(chatsWithUsers);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const { data, error } = await supabase
        .from('admin_chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const markAsRead = async (chatId) => {
    try {
      await supabase
        .from('admin_chats')
        .update({ unread_by_admin: false })
        .eq('id', chatId);
      
      // Update local state
      setChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, unread_by_admin: false } : c
      ));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedChat) return;
    setSending(true);

    try {
      const { error } = await supabase
        .from('admin_chat_messages')
        .insert({
          chat_id: selectedChat.id,
          sender_type: 'admin',
          message: replyText.trim()
        });

      if (error) throw error;

      // Refresh messages
      await fetchMessages(selectedChat.id);
      setReplyText('');
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const updateChatStatus = async (chatId, status) => {
    try {
      await supabase
        .from('admin_chats')
        .update({ status })
        .eq('id', chatId);

      setChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, status } : c
      ));
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => ({ ...prev, status }));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = chats.filter(c => c.unread_by_admin).length;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">User Messages</h1>
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
              {unreadCount} unread
            </span>
          )}
          <button onClick={fetchChats} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm flex items-center gap-1">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <div className="flex gap-2">
          {['all', 'unread', 'open', 'closed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${
                filter === f ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>


      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat List */}
        <div className="w-80 bg-gray-800 rounded-xl border border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-red-400 mb-2">⚠️ Error</p>
                <p className="text-gray-400 text-sm">{error}</p>
                <p className="text-gray-500 text-xs mt-2">Run setup_admin_chat_and_gifts.sql in Supabase</p>
              </div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No conversations found</div>
            ) : (
              chats.map(chat => (
                <div key={chat.id} onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-purple-600/20 border-l-4 border-l-purple-500' : ''
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      {chat.users?.profile_image_url ? (
                        <img src={chat.users.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      {chat.unread_by_admin && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-white font-medium truncate">
                          {chat.users?.username || 'Unknown User'}
                        </p>
                        <span className="text-xs text-gray-500">{formatTime(chat.last_message_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          chat.status === 'open' ? 'bg-green-500/20 text-green-400' :
                          chat.status === 'closed' ? 'bg-gray-500/20 text-gray-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>{chat.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {selectedChat.users?.profile_image_url ? (
                    <img src={selectedChat.users.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">
                      {selectedChat.users?.username || 'Unknown User'}
                    </p>
                    <p className="text-gray-400 text-sm">User ID: {selectedChat.user_id?.slice(0, 8)}...</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedChat.status !== 'closed' && (
                    <button onClick={() => updateChatStatus(selectedChat.id, 'closed')}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">
                      Close Chat
                    </button>
                  )}
                  {selectedChat.status === 'closed' && (
                    <button onClick={() => updateChatStatus(selectedChat.id, 'open')}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
                      Reopen Chat
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.sender_type === 'admin' 
                        ? 'bg-purple-600 text-white rounded-br-sm' 
                        : 'bg-gray-700 text-white rounded-bl-sm'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.sender_type === 'admin' ? 'text-purple-200' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex gap-3">
                  <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                    placeholder="Type your reply..."
                    className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <button onClick={sendReply} disabled={sending || !replyText.trim()}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                    {sending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
