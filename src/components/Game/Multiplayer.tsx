import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

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

// This is a simplified multiplayer component - it just manages NPCs
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
  const playersRef = useRef<Record<string, PlayerState>>({});
  
  // Simplified implementation without actual networking
  useEffect(() => {
    console.log("Multiplayer component initializing");
    
    // Generate a random player ID but don't create an extra player character
    const playerId = `player-${Math.floor(Math.random() * 10000)}`;
    
    // Create exactly two security guard NPCs for a controlled experience
    const npcPlayers: Record<string, PlayerState> = {
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
    
    playersRef.current = npcPlayers;
    
    // Simulate successful connection
    setTimeout(() => {
      setConnected(true);
      
      if (onConnect) {
        onConnect(playerId);
        console.log("Multiplayer connected with ID:", playerId);
      }
      
      if (onPlayerUpdate) {
        onPlayerUpdate(npcPlayers);
        console.log("Initial NPC update sent, NPC count:", Object.keys(npcPlayers).length);
      }
      
      if (onPlayerJoin) {
        Object.keys(npcPlayers).forEach(id => {
          onPlayerJoin(id, npcPlayers[id].name);
          console.log(`NPC joined: ${id} (${npcPlayers[id].name})`);
        });
      }
    }, 1000);
    
    // Provide callback for sending player state
    if (onSendPlayerState) {
      onSendPlayerState((state) => {
        // In a real implementation, this would send the state to the server
        console.log("Player state update received:", state);
      });
    }
    
    // Handle player damage to NPCs
    const handlePlayerDamageNPC = (npcId: string, damage: number) => {
      console.log(`Player damaged NPC ${npcId} for ${damage} points`);
      
      if (playersRef.current[npcId]) {
        // Reduce NPC health
        playersRef.current[npcId].health = Math.max(0, playersRef.current[npcId].health - damage);
        
        // If NPC is defeated, respawn after 5 seconds
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
    
    // Simulate periodic updates from NPCs, but with reduced frequency to save resources
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
    }, 200); // Increased interval from 100ms to 200ms to reduce resource usage
    
    return () => {
      // Clean up
      clearInterval(simulateNPCMovement);
      setConnected(false);
      console.log("Multiplayer component unmounting");
      
      if (onDisconnect) {
        onDisconnect();
      }
    };
  }, [onConnect, onDisconnect, onPlayerJoin, onPlayerLeave, onPlayerUpdate, onSendPlayerState, onPlayerDamageNPC]);
  
  return null; // This component doesn't render anything
};

export default Multiplayer;
