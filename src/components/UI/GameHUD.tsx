
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skull, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
  onRestart?: () => void;
}

const GameHUD = ({ playerInfo, otherPlayers, timeRemaining, onPause, onRestart }: GameHUDProps) => {
  const [showControls, setShowControls] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);

  useEffect(() => {
    if (playerInfo.health <= 0 && !showGameOver) {
      setShowGameOver(true);
    } else if (playerInfo.health > 0 && showGameOver) {
      setShowGameOver(false);
    }
  }, [playerInfo.health, showGameOver]);

  useEffect(() => {
    console.log("GameHUD health updated:", playerInfo.health);
  }, [playerInfo.health]);

  useEffect(() => {
    console.log("GameHUD rendered with health:", playerInfo.health);
  }, [playerInfo.health]);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-30">
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
      
      <div className="absolute bottom-4 left-4 ps1-panel p-4 w-64">
        <p className="font-retro text-xs text-disco-purple mb-1">
          {playerInfo.name}
        </p>
        
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
      
      <div className="absolute top-4 right-4 ps1-panel p-4 w-64">
        <p className="font-retro text-xs text-disco-yellow mb-2">PLAYERS</p>
        
        <ul className="space-y-2">
          {otherPlayers.map((player) => (
            <li key={player.id} className="flex justify-between items-center">
              <div className="flex-1 mr-2">
                <div className="flex justify-between mb-1">
                  <span className="font-retro text-xs text-white truncate mr-2">
                    {player.name}
                  </span>
                  <span className="font-retro text-xs text-disco-yellow">
                    {Math.max(0, Math.floor(player.health))}%
                  </span>
                </div>
                <div className="w-full h-2 bg-secondary overflow-hidden">
                  <div 
                    className="h-full"
                    style={{ 
                      width: `${Math.max(0, player.health)}%`,
                      backgroundColor: player.health < 30 ? '#ff3333' : 
                                      player.health < 70 ? '#ffcc00' : 
                                      '#33cc33',
                      transition: 'width 0.2s ease-out'
                    }}
                  ></div>
                </div>
              </div>
              {player.health <= 0 && (
                <Skull className="h-4 w-4 text-disco-red" />
              )}
            </li>
          ))}
        </ul>
      </div>
      
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
      
      <button 
        className="ps1-button absolute top-4 left-4 pointer-events-auto"
        onClick={onPause}
      >
        <span className="font-retro">PAUSE</span>
      </button>

      <Dialog open={showGameOver} onOpenChange={setShowGameOver}>
        <DialogContent className="crt-effect bg-disco-black border-[5px] border-disco-red max-w-xl mx-auto text-center pt-10 pb-12 px-8">
          <div className="scanline"></div>
          <div className="flex flex-col items-center justify-center space-y-6">
            <Skull className="text-disco-red h-24 w-24 animate-pulse" />
            
            <h1 className="text-6xl font-retro text-disco-red animate-pulse-glow">WASTED</h1>
            
            <div className="flex flex-col space-y-2 items-center mb-4">
              <p className="text-xl font-retro text-white">FINAL SCORE</p>
              <p className="text-4xl font-pixel text-disco-yellow">{playerInfo.score}</p>
            </div>
            
            <div className="flex space-x-4">
              <Button 
                className="ps1-button font-retro text-xl"
                onClick={onRestart}
              >
                RETRY
              </Button>
              
              <Button 
                className="ps1-button font-retro text-xl"
                onClick={onPause}
              >
                MAIN MENU
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GameHUD;
