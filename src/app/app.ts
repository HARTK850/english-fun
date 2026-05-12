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
  activeGame = signal<'flashcards' | 'typing' | 'multiple-choice' | 'spelling-letters' | 'spelling-hebrew' | null>(null);

  theme = signal<'light' | 'dark'>('light');

  stats = signal<UserStats>({ score: 0, streak: 0, coins: 0, level: 1 });
  words = signal<Word[]>([]);

  // Flashcards State
  currentWordIndex = signal(0);
  cardFlipped = signal(false);
  currentWord = computed(() => this.words()[this.currentWordIndex()] || null);
  flashcardMode = signal<'he-to-en' | 'en-to-he'>('he-to-en');

  // Multi-choice state
  mcOptions = signal<string[]>([]);
  
  // Distractor spelling
  spellingLetters = signal<{char: string, id: number}[]>([]);
  spellingTarget = signal<string>('');
  spellingCurrent = signal<string>('');

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

  startGame(game: 'flashcards' | 'typing' | 'multiple-choice' | 'spelling-letters' | 'spelling-hebrew') {
    if (this.words().length === 0 && game !== 'flashcards') {
        alert('יש להוסיף מילים למאגר (במסך הכספת) לפני התחלת משחקים!');
        this.view.set('manager');
        return;
    }
    this.view.set('learn');
    this.activeGame.set(game);
    this.resetGameStates();
  }

  toggleTheme() {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
    const isDark = this.theme() === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  speak(text: string, lang: 'en-US' | 'he-IL') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // limit overlap
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      if (lang === 'he-IL') {
         utterance.rate = 0.9;
      }
      window.speechSynthesis.speak(utterance);
    }
  }

  resetGameStates() {
    if (this.words().length > 0) {
      this.currentWordIndex.set(Math.floor(Math.random() * this.words().length));
    }
    this.cardFlipped.set(false);
    this.typingFeedback.set(null);
    this.typingForm.reset();
    
    if (this.activeGame() === 'multiple-choice') {
      this.generateMCOptions();
    } else if (this.activeGame() === 'spelling-letters') {
      this.generateSpellingLetters();
    } else if (this.activeGame() === 'spelling-hebrew') {
      this.generateHebrewSpelling();
    }
  }

  generateMCOptions() {
    const word = this.currentWord();
    if (!word) return;
    const allWords = this.words();
    // In multi-choice, we show english, choose hebrew (or vice versa, let's do random)
    // we need 5 options
    let options = new Set<string>();
    options.add(word.hebrew); // We assume showing english, select hebrew
    while(options.size < 5 && options.size < allWords.length) {
      const rw = allWords[Math.floor(Math.random() * allWords.length)];
      options.add(rw.hebrew);
    }
    this.mcOptions.set(Array.from(options).sort(() => Math.random() - 0.5));
  }

  checkMCOption(opt: string) {
    if (opt === this.currentWord()?.hebrew) {
      this.typingFeedback.set('correct');
      this.stats.update(s => ({ ...s, coins: s.coins + 5 }));
      this.playSound('success');
      setTimeout(() => this.resetGameStates(), 1000);
    } else {
      this.typingFeedback.set('incorrect');
      this.playSound('error');
    }
  }

  generateSpellingLetters() {
    const word = this.currentWord();
    if (!word) return;
    const target = word.english.toUpperCase();
    this.spellingTarget.set(target);
    this.spellingCurrent.set('');
    
    let chars = target.split('');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    // add 4 distractors
    for(let i=0; i<4; i++) {
        chars.push(alphabet[Math.floor(Math.random()*alphabet.length)]);
    }
    chars.sort(() => Math.random() - 0.5);
    this.spellingLetters.set(chars.map((c, i) => ({char: c, id: i})));
  }

  selectSpellingLetter(l: {char: string, id: number}) {
    const current = this.spellingCurrent();
    const target = this.spellingTarget();
    const nextExpected = target[current.length];
    
    if (l.char === nextExpected) {
      this.spellingCurrent.set(current + l.char);
      this.spellingLetters.update(arr => arr.filter(x => x.id !== l.id)); // remove it
      
      if (this.spellingCurrent() === target) {
         this.typingFeedback.set('correct');
         this.playSound('success');
         this.stats.update(s => ({ ...s, coins: s.coins + 15 }));
         setTimeout(() => {
             this.cardFlipped.set(false);
             this.resetGameStates();
         }, 1000);
      } else {
        this.playSound('flip'); // click sound
      }
    } else {
       this.typingFeedback.set('incorrect');
       this.playSound('error');
       setTimeout(() => this.typingFeedback.set(null), 800);
    }
  }

  generateHebrewSpelling() {
     const word = this.currentWord();
     if (!word) return;
     this.spellingTarget.set(word.hebrew); // we need to type hebrew
  }


  onHebrewSpellingSuccess() {
     this.stats.update(s => ({ ...s, coins: s.coins + 10 }));
     this.playSound('success');
     this.resetGameStates();
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
          if (this.words().length > 0) {
            let nextIdx = (this.currentWordIndex() + 1) % this.words().length;
            this.currentWordIndex.set(nextIdx);
          }
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
