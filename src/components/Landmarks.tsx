import React, { useState } from 'react';
import { Text, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import landmarksData from '../data/landmarks.json';

interface Landmark {
  id: string;
  label: string;
  description: string;
  coords: [number, number, number];
  color: string;
  size: number;
}

const landmarks: Landmark[] = landmarksData as Landmark[];

interface LandmarksProps {
  visible?: boolean;
  opacity?: number;
  showRegions?: boolean;
}

export function Landmarks({ 
  visible = true, 
  opacity = 0.5,
  showRegions = true 
}: LandmarksProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!visible) return null;

  return (
    <group name="landmarks">
      {landmarks.map((landmark) => {
        const isHovered = hoveredId === landmark.id;
        const baseOpacity = opacity;
        const currentOpacity = isHovered ? 1.0 : baseOpacity;
        
        // Scale sphere size based on cluster size (normalized)
        const maxSize = 1350;
        const minRadius = 0.15;
        const maxRadius = 0.4;
        const radius = minRadius + (landmark.size / maxSize) * (maxRadius - minRadius);

        return (
          <group key={landmark.id} position={landmark.coords}>
            {/* Region sphere */}
            {showRegions && (
              <mesh
                onPointerEnter={() => setHoveredId(landmark.id)}
                onPointerLeave={() => setHoveredId(null)}
              >
                <sphereGeometry args={[radius, 16, 16]} />
                <meshBasicMaterial
                  color={landmark.color}
                  transparent
                  opacity={isHovered ? 0.45 : 0.18}
                  depthWrite={false}
                />
              </mesh>
            )}

            {/* Label */}
            <Billboard follow={true}>
              <Text
                fontSize={isHovered ? 0.22 : 0.16}
                color={landmark.color}
                anchorX="center"
                anchorY="middle"
                fillOpacity={currentOpacity}
                outlineWidth={0.008}
                outlineColor="#000000"
                outlineOpacity={currentOpacity * 0.7}
                position={[0, radius + 0.12, 0]}
              >
                {landmark.label}
              </Text>
            </Billboard>

            {/* Hover tooltip with description */}
            {isHovered && (
              <Html
                position={[0, -radius - 0.15, 0]}
                center
                style={{
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{
                  background: 'rgba(0, 0, 0, 0.85)',
                  color: landmark.color,
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  border: `1px solid ${landmark.color}40`,
                  maxWidth: '200px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                    {landmark.label}
                  </div>
                  <div style={{ color: '#aaa', fontSize: '10px' }}>
                    {landmark.description}
                  </div>
                  <div style={{ color: '#666', fontSize: '9px', marginTop: '3px' }}>
                    {landmark.size} tokens
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
