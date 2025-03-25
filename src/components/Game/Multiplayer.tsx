
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import io, { Socket } from 'socket.io-client';

interface PlayerState {
  id: string;
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  health: number;
  score: number;
  name: string;
  color: string;
  animation?: string;
}

interface MultiplayerProps {
  onConnect?: (id: string) => void;
  onDisconnect?: () => void;
  onPlayerJoin?: (id: string, name: string) => void;
  onPlayerLeave?: (id: string) => void;
  onPlayerUpdate?: (players: Record<string, PlayerState>) => void;
  onPlayerHit?: (id: string, damage: number) => void;
  onSendPlayerState?: (callback: (state: Partial<PlayerState>) => void) => void;
  onPlayerDamageNPC?: (callback: (id: string, damage: number) => void) => void;
}

// This is a simplified multiplayer component - it just provides access to NPCs
const Multiplayer = ({
  onConnect,
  onDisconnect,
  onPlayerJoin,
  onPlayerLeave,
  onPlayerUpdate,
  onPlayerHit,
  onSendPlayerState,
  onPlayerDamageNPC,
}: MultiplayerProps) => {
  const [connected, setConnected] = useState(false);
  const socket = useRef<Socket | null>(null);
  const playersRef = useRef<Record<string, PlayerState>>({});
  
  // For the MVP, we'll simulate networking without an actual backend
  useEffect(() => {
    // Simulate connecting to server
    console.log("Simulating connection to multiplayer server...");
    
    // Generate a random player ID
    const playerId = `player-${Math.floor(Math.random() * 10000)}`;
    
    // Create just two NPCs - security guards only
    const fakePlayers: Record<string, PlayerState> = {
      'security-1': {
        id: 'security-1',
        position: { x: 5, y: 0, z: -5 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        health: 100,
        score: 0,
        name: 'SECURITY',
        color: '#000000',
      },
      'security-2': {
        id: 'security-2',
        position: { x: -5, y: 0, z: -5 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        health: 100,
        score: 0,
        name: 'SECURITY',
        color: '#000000',
      },
    };
    
    playersRef.current = fakePlayers;
    
    // Simulate successful connection
    setTimeout(() => {
      setConnected(true);
      
      if (onConnect) {
        onConnect(playerId);
      }
      
      if (onPlayerUpdate) {
        onPlayerUpdate(fakePlayers);
      }
      
      if (onPlayerJoin) {
        Object.keys(fakePlayers).forEach(id => {
          onPlayerJoin(id, fakePlayers[id].name);
        });
      }
    }, 1000);
    
    // Provide callback for sending player state
    if (onSendPlayerState) {
      onSendPlayerState((state) => {
        // In a real implementation, this would send the state to the server
        console.log("Player state update:", state);
      });
    }
    
    // Simulate handling player damage to NPCs
    const handlePlayerDamageNPC = (npcId: string, damage: number) => {
      console.log(`Player damaged NPC ${npcId} for ${damage} points`);
      
      if (playersRef.current[npcId]) {
        // Reduce NPC health
        playersRef.current[npcId].health = Math.max(0, playersRef.current[npcId].health - damage);
        
        // If NPC is defeated, increase player score
        if (playersRef.current[npcId].health <= 0) {
          console.log(`NPC ${npcId} defeated!`);
          // Respawn NPC after 5 seconds
          setTimeout(() => {
            if (playersRef.current[npcId]) {
              playersRef.current[npcId].health = 100;
              // Notify about NPC respawn
              if (onPlayerUpdate) {
                onPlayerUpdate({...playersRef.current});
              }
            }
          }, 5000);
        }
        
        // Update all clients
        if (onPlayerUpdate) {
          onPlayerUpdate({...playersRef.current});
        }
      }
    };
    
    // Register callback for NPC damage
    if (onPlayerDamageNPC) {
      onPlayerDamageNPC(handlePlayerDamageNPC);
    }
    
    // Simulate periodic updates from NPCs
    const simulateNPCMovement = setInterval(() => {
      if (!connected) return;
      
      // Update NPC positions with some random movement
      Object.keys(playersRef.current).forEach(id => {
        if (id.startsWith('security')) {
          const npc = playersRef.current[id];
          
          // Simple random walk
          const speed = 0.03;
          npc.position.x += (Math.random() - 0.5) * speed;
          npc.position.z += (Math.random() - 0.5) * speed;
          
          // Keep within bounds
          npc.position.x = Math.max(-14, Math.min(14, npc.position.x));
          npc.position.z = Math.max(-14, Math.min(14, npc.position.z));
        }
      });
      
      if (onPlayerUpdate) {
        onPlayerUpdate({...playersRef.current});
      }
    }, 100);
    
    return () => {
      // Clean up
      clearInterval(simulateNPCMovement);
      setConnected(false);
      
      if (onDisconnect) {
        onDisconnect();
      }
    };
  }, [onConnect, onDisconnect, onPlayerJoin, onPlayerLeave, onPlayerUpdate, onSendPlayerState, onPlayerDamageNPC]);
  
  return null; // This component doesn't render anything
};

export default Multiplayer;
