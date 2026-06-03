// script.js
// Simple interactivity for the premium landing page

document.addEventListener('DOMContentLoaded', () => {
  const ctaBtn = document.getElementById('ctaBtn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      // For demo purposes, show a friendly message
      alert('🚀 Welcome! Your premium site is ready.');
    });
  }
});
