
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MainMenuProps {
  onStartGame: () => void;
  onOptions: () => void;
  onCredits: () => void;
}

const MainMenu = ({ onStartGame, onOptions, onCredits }: MainMenuProps) => {
  const [selectedOption, setSelectedOption] = useState(0);
  const options = ['START GAME', 'OPTIONS', 'CREDITS'];
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      setSelectedOption(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'ArrowDown') {
      setSelectedOption(prev => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'Enter') {
      handleSelect(selectedOption);
    }
  };
  
  const handleSelect = (index: number) => {
    switch (index) {
      case 0:
        onStartGame();
        break;
      case 1:
        onOptions();
        break;
      case 2:
        onCredits();
        break;
    }
  };
  
  return (
    <div 
      className="fixed inset-0 z-40 crt-effect flex flex-col items-center justify-center bg-disco-black"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="scanline"></div>
      
      <div className="max-w-lg w-full px-4 flex flex-col items-center">
        <h1 className="text-6xl font-pixel text-white mb-8 neon-text animate-pulse-glow">
          DISCO BRAWL
        </h1>
        
        <div className="mb-12">
          <h2 className="text-lg font-retro text-disco-yellow">
            1990s POLISH DISCO FIGHTING
          </h2>
        </div>
        
        <ul className="ps1-panel w-full mb-12 py-6">
          {options.map((option, index) => (
            <li 
              key={index}
              className={cn(
                "ps1-button w-full text-center py-3 my-4 font-retro text-xl transition-all",
                selectedOption === index 
                  ? "text-disco-yellow bg-secondary/80 animate-pulse-glow transform scale-110" 
                  : "text-white"
              )}
              onClick={() => handleSelect(index)}
              onMouseEnter={() => setSelectedOption(index)}
            >
              {selectedOption === index && "► "}
              {option}
              {selectedOption === index && " ◄"}
            </li>
          ))}
        </ul>
        
        <div className="flex flex-col items-center">
          <p className="text-sm font-retro text-disco-pink mb-2">
            © 2023 DISCO BRAWL ENTERTAINMENT
          </p>
          <p className="text-xs font-retro text-white opacity-60">
            USE ARROW KEYS TO NAVIGATE, ENTER TO SELECT
          </p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
