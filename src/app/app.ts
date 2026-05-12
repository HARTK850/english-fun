import {Component, ChangeDetectionStrategy, signal, computed, inject} from '@angular/core';
import {ReactiveFormsModule, FormBuilder, Validators} from '@angular/forms';

interface Word { hebrew: string; english: string; status: 'new' | 'learning' | 'mastered'; }
interface UserStats { score: number; streak: number; coins: number; level: number; }

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [ReactiveFormsModule],
  templateUrl: './app.html',
})
export class App {
  fb = inject(FormBuilder);

  view = signal<'home' | 'learn' | 'manager'>('home');
  activeGame = signal<'flashcards' | 'typing' | null>(null);

  stats = signal<UserStats>({ score: 450, streak: 12, coins: 450, level: 3 });
  words = signal<Word[]>([
    { hebrew: 'חללית', english: 'spaceship', status: 'new' },
    { hebrew: 'אסטרונאוט', english: 'astronaut', status: 'new' },
    { hebrew: 'כבידה', english: 'gravity', status: 'learning' },
    { hebrew: 'יקום', english: 'universe', status: 'new' },
    { hebrew: 'תגלית', english: 'discovery', status: 'mastered' },
  ]);

  // Flashcards State
  currentWordIndex = signal(0);
  cardFlipped = signal(false);
  currentWord = computed(() => this.words()[this.currentWordIndex()]);

  // Typing State
  typingForm = this.fb.group({ answer: ['', Validators.required] });
  typingFeedback = signal<'correct' | 'incorrect' | null>(null);

  // Manager State
  wordsForm = this.fb.group({ rawText: ['', Validators.required] });

  // AI State
  aiLoading = signal(false);
  aiMessage = signal<string | null>(null);

  setView(v: 'home' | 'learn' | 'manager') {
    this.view.set(v);
    if (v !== 'learn') {
        this.activeGame.set(null);
    }
  }

  startGame(game: 'flashcards' | 'typing') {
    this.view.set('learn');
    this.activeGame.set(game);
    this.resetGameStates();
  }

  resetGameStates() {
    if (this.words().length > 0) {
      this.currentWordIndex.set(Math.floor(Math.random() * this.words().length));
    }
    this.cardFlipped.set(false);
    this.typingFeedback.set(null);
    this.typingForm.reset();
  }

  // Flashcards Actions
  flipCard() {
    this.cardFlipped.update(f => !f);
    this.playSound('flip');
  }

  submitAnswer(knewIt: boolean) {
    if (knewIt) {
       this.stats.update(s => ({ ...s, coins: s.coins + 5 }));
       this.playSound('success');
    } else {
       this.playSound('error');
    }

    // Next word
    setTimeout(() => {
       this.cardFlipped.set(false);
       setTimeout(() => {
          let nextIdx = (this.currentWordIndex() + 1) % this.words().length;
          this.currentWordIndex.set(nextIdx);
       }, 300); // Wait for flip back
    }, 400);
  }

  // Typing Actions
  checkTyping() {
    const val = this.typingForm.value.answer?.toLowerCase().trim();
    const correct = this.currentWord()?.english.toLowerCase() === val;

    if (correct) {
       this.typingFeedback.set('correct');
       this.stats.update(s => ({ ...s, coins: s.coins + 10 }));
       this.playSound('success');
       setTimeout(() => {
          this.resetGameStates();
       }, 1500);
    } else {
       this.typingFeedback.set('incorrect');
       this.playSound('error');
    }
  }

  // Manager Actions
  importWords() {
    const text = this.wordsForm.value.rawText;
    if (!text) return;

    const lines = text.split('\n');
    const newWords: Word[] = [];

    for (const line of lines) {
       if (line.includes('-')) {
          const parts = line.split('-');
          if (parts.length >= 2) {
             let p1 = parts[0].trim();
             let p2 = parts[1].trim();

             let hebrew = p1.match(/[\u0590-\u05FF]/) ? p1 : p2;
             let english = p1 === hebrew ? p2 : p1;

             newWords.push({ hebrew, english, status: 'new' });
          }
       }
    }

    if (newWords.length > 0) {
       this.words.update(w => [...w, ...newWords]);
       this.wordsForm.reset();
       alert(`נוספו ${newWords.length} מילים בהצלחה!`);
    }
  }

  // Native Web Audio Synthesizer
  playSound(type: 'success' | 'error' | 'flip') {
    try {
       const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();

       osc.connect(gain);
       gain.connect(ctx.destination);

       if (type === 'success') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(500, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
       } else if (type === 'error') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
       } else if (type === 'flip') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
       }
    } catch(e) {}
  }

  async getAIPersonalizedPlan() {
    this.aiLoading.set(true);
    try {
       const res = await fetch('/api/ai-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             stats: this.stats(),
             knownWordsCount: this.words().length
          })
       });
       const data = await res.json();

       if (data.newWords && data.newWords.length > 0) {
           const mapped = data.newWords.map((w: any) => ({...w, status: 'new'}));
           this.words.update(w => [...w, ...mapped]);
       }
       this.aiMessage.set(data.aiFeedback || 'תוכנית נוצרה בהצלחה!');

    } catch (e) {
       console.error(e);
       this.aiMessage.set('שגיאה בתקשורת מול מערכת ה-AI.');
    } finally {
       this.aiLoading.set(false);
    }
  }
}
