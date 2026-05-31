'use client';
import { useState } from 'react';

export default function Flashcards() {
  const [flipped, setFlipped] = useState(false);
  const [word, setWord] = useState({ en: 'Apple', he: 'תפוח' });

  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(word.en);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col items-center p-10">
      <div 
        className="w-64 h-40 bg-white shadow-xl rounded-2xl flex items-center justify-center cursor-pointer transition-transform"
        onClick={() => setFlipped(!flipped)}
      >
        {flipped ? word.he : word.en}
      </div>
      <button onClick={speak} className="mt-4 bg-blue-600 text-white p-2 rounded">הגייה</button>
      <div className="mt-4">
        <button className="mx-2">✔ ידעתי</button>
        <button className="mx-2">✖ לא ידעתי</button>
      </div>
    </div>
  );
}