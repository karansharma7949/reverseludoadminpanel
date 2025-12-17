import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function DailyBonusManagement() {
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBonuses();
  }, []);

  const fetchBonuses = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_bonus')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBonuses(data || []);
    } catch (error) {
      console.error('Error fetching bonuses:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Daily Bonus Management</h1>
      
      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Daily Bonuses</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Reward</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Claimed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {bonuses.map((bonus) => (
                  <tr key={bonus.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap text-white">
                      {bonus.user_id?.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      Day {bonus.day || 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-yellow-400">
                      {bonus.reward_amount || 0} coins
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        bonus.claimed 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {bonus.claimed ? 'Claimed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                      {bonus.created_at ? new Date(bonus.created_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bonuses.length === 0 && (
              <div className="p-8 text-center text-gray-500">No daily bonuses found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}