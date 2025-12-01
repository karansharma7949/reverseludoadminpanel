import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET() {
  try {
    // Get user stats
    const { data: users, error: usersError } = await supabase.from('users').select('*');
    if (usersError) throw usersError;

    // Get tournament stats
    const { data: tournaments, error: tournamentsError } = await supabase.from('tournaments').select('*');
    if (tournamentsError) throw tournamentsError;

    // Get game rooms stats
    const { data: gameRooms, error: gameRoomsError } = await supabase.from('game_rooms').select('*');
    
    // Calculate stats
    const userStats = {
      total: users?.length || 0,
      totalCoins: users?.reduce((sum, u) => sum + (u.total_coins || 0), 0) || 0,
      totalDiamonds: users?.reduce((sum, u) => sum + (u.total_diamonds || 0), 0) || 0,
      activeToday: users?.filter(u => {
        const lastSeen = new Date(u.updated_at || u.created_at);
        const today = new Date();
        return lastSeen.toDateString() === today.toDateString();
      }).length || 0
    };

    const tournamentStats = {
      total: tournaments?.length || 0,
      upcoming: tournaments?.filter(t => t.status === 'upcoming' || t.status === 'registration').length || 0,
      running: tournaments?.filter(t => t.status === 'in_progress' || t.status === 'finals').length || 0,
      completed: tournaments?.filter(t => t.status === 'completed').length || 0,
      totalPrizePool: tournaments?.reduce((sum, t) => sum + (t.reward_amount || 0), 0) || 0,
      totalParticipants: tournaments?.reduce((sum, t) => sum + (t.current_players || 0), 0) || 0
    };

    const gameStats = {
      totalRooms: gameRooms?.length || 0,
      activeGames: gameRooms?.filter(r => r.game_state === 'playing').length || 0,
      completedGames: gameRooms?.filter(r => r.game_state === 'finished').length || 0
    };

    return NextResponse.json({
      users: userStats,
      tournaments: tournamentStats,
      games: gameStats
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
