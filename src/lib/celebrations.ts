import confetti from 'canvas-confetti';

/**
 * Celebration animations for success actions
 * Adds WOW factor to user interactions
 */

/**
 * Trigger confetti explosion
 * Perfect for: successful saves, completions, major milestones
 */
export const triggerConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};

/**
 * Subtle success animation
 * Perfect for: item created, status changed, minor completions
 */
export const triggerSuccessAnimation = () => {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#10b981', '#34d399', '#6ee7b7'],
    zIndex: 9999,
  });
};

/**
 * Side cannon effect
 * Perfect for: major achievements, milestones
 */
export const triggerSideCannon = () => {
  const end = Date.now() + 3 * 1000; // 3 seconds
  const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

  (function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
      zIndex: 9999,
    });

    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
      zIndex: 9999,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
};

/**
 * Fireworks effect
 * Perfect for: completing reservations, major milestones
 */
export const triggerFireworks = () => {
  const duration = 2 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
};

/**
 * Quick pop animation
 * Perfect for: quick actions like adding items
 */
export const triggerQuickPop = () => {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.5 },
    colors: ['#10b981', '#34d399'],
    ticks: 50,
    zIndex: 9999,
  });
};
