import confetti from 'canvas-confetti';

// Efektleri yönetecek servis
export const effectService = {
  /**
   * Doğru cevap verildiğinde konfeti efektini tetikler.
   */
  playSuccessConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    const myConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: true
    });

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const duration = 2 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 50 * (timeLeft / duration);
      myConfetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      myConfetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  },

  /**
   * Yanlış cevap verildiğinde ekranı kırmızı flaşla uyarır.
   */
  playWrongAnswerFlash() {
    const flashElement = document.getElementById('wrong-answer-flash');
    if (flashElement) {
      flashElement.classList.add('active');
      setTimeout(() => {
        flashElement.classList.remove('active');
      }, 1000); // Animasyon süresiyle eşleşmeli
    }
  },
};
