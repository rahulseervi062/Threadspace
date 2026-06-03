/**
 * script.js - Interactive Logic for Threadspace
 */

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initSettingsTabs();
    initAppearanceSettings();
    initSaveButtons();
});

/**
 * Theme Management
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', currentTheme);
    themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
        const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
}

/**
 * Settings Page Logic
 */
function initSettingsTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    if (navItems.length === 0) return;

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');

            // Update active nav item
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Update active tab pane
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === tabId) {
                    pane.classList.add('active');
                }
            });
        });
    });
}

function initAppearanceSettings() {
    // Theme Card Selection
    const themeCards = document.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
        card.addEventListener('click', () => {
            themeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // Color Palette Selection
    const colorCircles = document.querySelectorAll('.color-circle');
    colorCircles.forEach(circle => {
        circle.addEventListener('click', () => {
            colorCircles.forEach(c => c.classList.remove('active'));
            circle.classList.add('active');

            // Dynamically update CSS variable for primary color
            const color = circle.style.backgroundColor;
            document.documentElement.style.setProperty('--primary', color);
        });
    });
}

function initSaveButtons() {
    const saveBtns = document.querySelectorAll('.save-btn');
    saveBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const originalText = this.textContent;
            this.textContent = 'Saving...';
            this.disabled = true;
            this.style.opacity = '0.7';

            // Simulate network delay for professional feel
            setTimeout(() => {
                this.textContent = '✓ Saved!';
                this.style.backgroundColor = '#10b981'; // Green success color

                setTimeout(() => {
                    this.textContent = originalText;
                    this.disabled = false;
                    this.style.opacity = '1';
                    this.style.backgroundColor = ''; // Reset to CSS default
                }, 2000);
            }, 800);
        });
    });
}
