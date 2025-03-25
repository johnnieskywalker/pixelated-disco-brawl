
import { useRef, useState, useEffect } from 'react';
import LoadingScreen from '../UI/LoadingScreen';
import MainMenu from '../UI/MainMenu';
import GameHUD from '../UI/GameHUD';
import Scene from './Scene';

interface PlayerInfo {
  id: string;
  name: string;
  health: number;
  score: number;
}

const Game = () => {
  // Game states
  const [gameState, setGameState] = useState<'loading' | 'menu' | 'playing' | 'paused' | 'credits' | 'options'>('loading');
  
  // References
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Player and game info
  const [playerInfo, setPlayerInfo] = useState({
    id: 'player-1',
    name: 'Player',
    health: 100,
    score: 0,
  });
  
  const [otherPlayers, setOtherPlayers] = useState<PlayerInfo[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  
  // State for scene reset
  const [sceneKey, setSceneKey] = useState(0);
  
  // Sound effects
  const backgroundMusic = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    console.log("Game component mounted");
    // Create audio element for background music
    backgroundMusic.current = new Audio();
    backgroundMusic.current.loop = true;
    backgroundMusic.current.volume = 0.5;
    
    return () => {
      console.log("Game component unmounting");
      if (backgroundMusic.current) {
        backgroundMusic.current.pause();
      }
    };
  }, []);
  
  // Simulate loading complete
  useEffect(() => {
    if (gameState === 'loading') {
      // Simulate loading time for better UX
      const loadingTimer = setTimeout(() => {
        console.log("Loading complete, showing menu");
        setGameState('menu');
      }, 3000);
      
      return () => clearTimeout(loadingTimer);
    }
  }, [gameState]);
  
  // Game timer
  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            // Game over logic would go here
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [gameState]);
  
  // Force reset player stats when going back to menu
  useEffect(() => {
    if (gameState === 'menu') {
      console.log("Resetting player stats when returning to menu");
      setPlayerInfo({
        id: 'player-1',
        name: 'Player',
        health: 100,
        score: 0,
      });
      setTimeRemaining(300);
    }
  }, [gameState]);
  
  // Handle game state transitions
  const handleStartGame = () => {
    console.log("Starting game - switching to playing state");
    
    // Reset player info when starting a new game
    setPlayerInfo({
      id: 'player-1',
      name: 'Player',
      health: 100,
      score: 0,
    });
    
    // Reset timer
    setTimeRemaining(300);
    
    // Force scene remount by changing key
    setSceneKey(prevKey => prevKey + 1);
    
    // Switch to playing state
    setGameState('playing');
    
    // Play background music
    if (backgroundMusic.current) {
      backgroundMusic.current.src = 'https://freemusicarchive.org/track/polish-girl/download/';
      backgroundMusic.current.play().catch(error => {
        console.error('Failed to play audio:', error);
      });
    }
  };
  
  const handlePauseGame = () => {
    if (gameState === 'playing') {
      setGameState('paused');
      
      // Pause music
      if (backgroundMusic.current) {
        backgroundMusic.current.pause();
      }
    } else if (gameState === 'paused') {
      setGameState('playing');
      
      // Resume music
      if (backgroundMusic.current) {
        backgroundMusic.current.play().catch(error => {
          console.error('Failed to play audio:', error);
        });
      }
    }
  };
  
  const handleShowOptions = () => {
    if (gameState === 'menu') {
      setGameState('options');
    } else {
      setGameState('menu');
    }
  };
  
  const handleShowCredits = () => {
    if (gameState === 'menu') {
      setGameState('credits');
    } else {
      setGameState('menu');
    }
  };
  
  // Handle restart game after game over
  const handleRestartGame = () => {
    console.log("Restarting game - completely resetting state");
    
    // Reset player info
    setPlayerInfo({
      id: 'player-1',
      name: 'Player',
      health: 100,
      score: 0,
    });
    
    // Reset timer
    setTimeRemaining(300);
    
    // Force scene remount by changing key
    setSceneKey(prevKey => prevKey + 1);
    
    // Switch to playing state
    setGameState('playing');
    
    // Play background music
    if (backgroundMusic.current) {
      backgroundMusic.current.src = 'https://freemusicarchive.org/track/polish-girl/download/';
      backgroundMusic.current.play().catch(error => {
        console.error('Failed to play audio:', error);
      });
    }
  };
  
  // Go back to main menu (used from pause menu and game over screen)
  const handleReturnToMenu = () => {
    console.log("Returning to main menu - resetting game state");
    setGameState('menu');
    
    // Force scene remount by changing key
    setSceneKey(prevKey => prevKey + 1);
    
    // Reset player info
    setPlayerInfo({
      id: 'player-1',
      name: 'Player',
      health: 100,
      score: 0,
    });
    
    // Reset timer
    setTimeRemaining(300);
    
    // Stop music
    if (backgroundMusic.current) {
      backgroundMusic.current.pause();
    }
  };
  
  // Render the game state
  const renderGameState = () => {
    switch (gameState) {
      case 'loading':
        return <LoadingScreen onLoaded={() => setGameState('menu')} />;
        
      case 'menu':
        return (
          <MainMenu 
            onStartGame={handleStartGame}
            onOptions={handleShowOptions}
            onCredits={handleShowCredits}
          />
        );
        
      case 'options':
        return (
          <div className="fixed inset-0 z-40 crt-effect flex flex-col items-center justify-center bg-disco-black">
            <div className="scanline"></div>
            <div className="ps1-panel p-8 max-w-lg w-full">
              <h2 className="text-2xl font-retro text-disco-purple mb-6 text-center">OPTIONS</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-retro text-disco-yellow mb-2">Volume</h3>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  defaultValue="50"
                  className="w-full" 
                  onChange={(e) => {
                    if (backgroundMusic.current) {
                      backgroundMusic.current.volume = Number(e.target.value) / 100;
                    }
                  }}
                />
              </div>
              
              <div className="flex justify-center">
                <button 
                  className="ps1-button font-retro text-xl"
                  onClick={() => setGameState('menu')}
                >
                  BACK
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'credits':
        return (
          <div className="fixed inset-0 z-40 crt-effect flex flex-col items-center justify-center bg-disco-black">
            <div className="scanline"></div>
            <div className="ps1-panel p-8 max-w-lg w-full">
              <h2 className="text-2xl font-retro text-disco-purple mb-6 text-center">CREDITS</h2>
              
              <div className="space-y-4 mb-6">
                <p className="text-lg font-retro text-white">DISCO BRAWL</p>
                <p className="text-sm font-retro text-disco-yellow">A nostalgic fighting game inspired by PS1 classics</p>
                <p className="text-sm font-retro text-white">Created with Three.js and React</p>
                <p className="text-sm font-retro text-white">Music: Polish Girl (Placeholder)</p>
              </div>
              
              <div className="flex justify-center">
                <button 
                  className="ps1-button font-retro text-xl"
                  onClick={() => setGameState('menu')}
                >
                  BACK
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'paused':
        return (
          <div className="fixed inset-0 z-40 crt-effect flex flex-col items-center justify-center bg-disco-black bg-opacity-80">
            <div className="scanline"></div>
            <div className="ps1-panel p-8 max-w-lg w-full">
              <h2 className="text-4xl font-retro text-disco-purple mb-8 text-center animate-pulse-glow">PAUSED</h2>
              
              <div className="space-y-4 mb-6">
                <button 
                  className="ps1-button w-full font-retro text-xl py-3"
                  onClick={() => setGameState('playing')}
                >
                  RESUME
                </button>
                
                <button 
                  className="ps1-button w-full font-retro text-xl py-3"
                  onClick={handleShowOptions}
                >
                  OPTIONS
                </button>
                
                <button 
                  className="ps1-button w-full font-retro text-xl py-3"
                  onClick={handleReturnToMenu}
                >
                  MAIN MENU
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'playing':
        return null; // GameHUD is now rendered separately
        
      default:
        return null;
    }
  };
  
  return (
    <div className="relative h-screen w-screen crt-effect overflow-hidden">
      <div className="scanline"></div>
      <div ref={containerRef} className="absolute inset-0">
        {/* Three.js canvas will be inserted here */}
        {/* Only render Scene when we're not in loading state and forced remount with key */}
        {gameState !== 'loading' && (
          <Scene 
            key={sceneKey} // Add key to force remount when needed
            containerRef={containerRef} 
            onUpdatePlayerInfo={(info) => {
              setPlayerInfo(prev => ({
                ...prev,
                health: info.health !== undefined ? info.health : prev.health,
                score: info.score !== undefined ? info.score : prev.score
              }));
            }}
          />
        )}
      </div>
      {renderGameState()}

      {/* Show GameHUD only when playing */}
      {gameState === 'playing' && (
        <GameHUD 
          playerInfo={playerInfo}
          otherPlayers={otherPlayers}
          timeRemaining={timeRemaining}
          onPause={handlePauseGame}
          onRestart={handleRestartGame}
        />
      )}
    </div>
  );
};

export default Game;
