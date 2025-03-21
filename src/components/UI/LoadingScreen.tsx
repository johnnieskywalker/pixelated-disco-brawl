
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  onLoaded: () => void;
}

const LoadingScreen = ({ onLoaded }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [tips] = useState<string[]>([
    "Throw bottles for maximum damage!",
    "Security guards are slower but tougher.",
    "Jump and kick for a powerful attack.",
    "Chairs make excellent melee weapons.",
    "Watch your back at all times!",
    "Fiat 126p is indestructible.",
    "Use tables for cover during intense fights.",
  ]);
  
  const [currentTip, setCurrentTip] = useState(0);
  
  useEffect(() => {
    // Simulate loading
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        
        if (newProgress >= 100) {
          clearInterval(interval);
          
          // Allow animation to complete before continuing
          setTimeout(() => {
            onLoaded();
          }, 500);
          
          return 100;
        }
        
        return newProgress;
      });
    }, 500);
    
    // Cycle through tips
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 3000);
    
    return () => {
      clearInterval(interval);
      clearInterval(tipInterval);
    };
  }, [onLoaded, tips]);
  
  return (
    <div className="fixed inset-0 z-50 crt-effect flex flex-col items-center justify-center bg-disco-black bg-noise-pattern">
      <div className="scanline"></div>
      
      <div className="flex flex-col items-center justify-center max-w-md w-full px-4">
        <h1 className="text-4xl font-pixel text-white mb-8 animate-pulse-glow">
          DISCO BRAWL
        </h1>
        
        <div className="ps1-panel w-full mb-8 p-6">
          <h2 className="text-sm font-retro text-disco-pink mb-4 text-center">
            LOADING...
          </h2>
          
          <div className="health-bar w-full h-6 mb-4">
            <div 
              className="health-bar-fill bg-disco-purple"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <p className="text-sm font-retro text-white text-center">
            {Math.floor(progress)}%
          </p>
        </div>
        
        <div className="ps1-panel w-full p-4">
          <p className="text-sm font-retro text-disco-yellow animate-pulse text-center">
            TIP: {tips[currentTip]}
          </p>
        </div>
        
        <p className="mt-8 text-xs text-white opacity-60 font-retro">
          © 2023 DISCO BRAWL ENTERTAINMENT
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
