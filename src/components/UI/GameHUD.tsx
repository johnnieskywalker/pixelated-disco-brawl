import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PlayerInfo {
  id: string;
  name: string;
  health: number;
  score: number;
}

interface GameHUDProps {
  playerInfo: PlayerInfo;
  otherPlayers: PlayerInfo[];
  timeRemaining?: number;
  onPause: () => void;
}

const GameHUD = ({ playerInfo, otherPlayers, timeRemaining, onPause }: GameHUDProps) => {
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    console.log("Health updated to:", playerInfo.health);
  }, [playerInfo.health]);

  // Add debugging to verify health updates
  useEffect(() => {
    console.log("GameHUD health updated:", playerInfo.health);
  }, [playerInfo.health]);

  // Add these console logs to verify updates
  useEffect(() => {
    console.log("GameHUD rendered with health:", playerInfo.health);
  }, [playerInfo.health]);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* Top bar with time and score */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 ps1-panel px-8 py-2">
        <div className="flex items-center space-x-8">
          {timeRemaining !== undefined && (
            <div className="text-center">
              <p className="font-retro text-xs text-disco-yellow mb-1">TIME</p>
              <p className="font-pixel text-white">
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </p>
            </div>
          )}
          
          <div className="text-center">
            <p className="font-retro text-xs text-disco-yellow mb-1">SCORE</p>
            <p className="font-pixel text-white">{playerInfo.score}</p>
          </div>
        </div>
      </div>
      
      {/* Player health bar */}
      <div className="absolute bottom-4 left-4 ps1-panel p-4 w-64">
        <p className="font-retro text-xs text-disco-purple mb-1">
          {playerInfo.name}
        </p>
        
        {/* Make sure the health bar styling is correct */}
        <div className="health-bar h-4 w-full bg-secondary relative overflow-hidden border border-disco-purple">
          <div 
            className="health-bar-fill h-full absolute top-0 left-0"
            style={{ 
              width: `${playerInfo.health}%`,
              backgroundColor: playerInfo.health < 30 ? '#ff3333' : 
                               playerInfo.health < 70 ? '#ffcc00' : 
                               '#33cc33',
              transition: 'width 0.3s ease-out'
            }}
          ></div>
        </div>
      </div>
      
      {/* Other players list */}
      <div className="absolute top-4 right-4 ps1-panel p-4 w-64">
        <p className="font-retro text-xs text-disco-yellow mb-2">PLAYERS</p>
        
        <ul className="space-y-2">
          {otherPlayers.map((player) => (
            <li key={player.id} className="flex justify-between">
              <span className="font-retro text-xs text-white truncate mr-2">
                {player.name}
              </span>
              
              <div className="w-24 h-2 bg-secondary overflow-hidden">
                <div 
                  className="h-full bg-disco-red"
                  style={{ width: `${player.health}%` }}
                ></div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Controls help */}
      <div 
        className="absolute bottom-4 right-4 ps1-panel p-4 pointer-events-auto cursor-pointer"
        onClick={() => setShowControls(!showControls)}
      >
        <p className="font-retro text-xs text-disco-yellow">
          {showControls ? 'HIDE CONTROLS' : 'SHOW CONTROLS'}
        </p>
        
        {showControls && (
          <div className="mt-2 space-y-1">
            <p className="font-retro text-xs text-white">WASD - Move</p>
            <p className="font-retro text-xs text-white">MOUSE - Look</p>
            <p className="font-retro text-xs text-white">Z - Punch</p>
            <p className="font-retro text-xs text-white">X - Kick</p>
            <p className="font-retro text-xs text-white">SPACE - Jump</p>
            <p className="font-retro text-xs text-white">E - Pickup</p>
            <p className="font-retro text-xs text-white">Q - Throw</p>
            <p className="font-retro text-xs text-white">ESC - Pause</p>
          </div>
        )}
      </div>
      
      {/* Pause button */}
      <button 
        className="ps1-button absolute top-4 left-4 pointer-events-auto"
        onClick={onPause}
      >
        <span className="font-retro">PAUSE</span>
      </button>
    </div>
  );
};

export default GameHUD;
