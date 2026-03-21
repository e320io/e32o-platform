'use client';
import dynamic from 'next/dynamic';

const Curvy = dynamic(() => import('./Curvy'), { ssr: false });

export default function CurvyWrapper() {
  return <Curvy />;
}
