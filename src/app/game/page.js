'use client';
import dynamic from 'next/dynamic';

const GameScene = dynamic(() => import('@/components/GameScene'), { ssr: false });

export default function GamePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">מרכז הלמידה האינטראקטיבי</h1>
      <div className="bg-white p-4 rounded-xl shadow-lg">
        <GameScene />
      </div>
      <p className="mt-6 text-gray-700">לחץ על הקובייה כדי לתרגל אינטראקציה.</p>
    </div>
  );
}