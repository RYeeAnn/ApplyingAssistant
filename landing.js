// Landing Page JavaScript for Applying Assistant

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-link, .btn[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 70; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
        
        lastScrollTop = scrollTop;
    });

    // Demo section interactive steps
    const demoSteps = document.querySelectorAll('.step');
    const demoScreens = document.querySelectorAll('.demo-screen');
    let currentStep = 1;
    let demoInterval;

    function showStep(stepNumber) {
        // Remove active class from all steps and screens
        demoSteps.forEach(step => step.classList.remove('active'));
        demoScreens.forEach(screen => screen.classList.remove('active'));
        
        // Add active class to current step and screen
        const activeStep = document.querySelector(`[data-step="${stepNumber}"]`);
        const activeScreen = document.querySelector(`[data-screen="${stepNumber}"]`);
        
        if (activeStep && activeScreen) {
            activeStep.classList.add('active');
            activeScreen.classList.add('active');
        }
    }

    // Auto-cycle through demo steps
    function startDemoAnimation() {
        demoInterval = setInterval(() => {
            currentStep = currentStep >= 3 ? 1 : currentStep + 1;
            showStep(currentStep);
        }, 3000);
    }

    // Manual step selection
    demoSteps.forEach(step => {
        step.addEventListener('click', function() {
            const stepNumber = parseInt(this.getAttribute('data-step'));
            currentStep = stepNumber;
            showStep(stepNumber);
            
            // Restart auto-cycle
            clearInterval(demoInterval);
            setTimeout(startDemoAnimation, 5000);
        });
    });

    // Start demo animation when section comes into view
    const demoSection = document.getElementById('demo');
    const demoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                startDemoAnimation();
            } else {
                clearInterval(demoInterval);
            }
        });
    }, { threshold: 0.3 });

    if (demoSection) {
        demoObserver.observe(demoSection);
    }

    // Hero animation effects
    const heroTextarea = document.querySelector('.form-textarea');
    const templateSuggestion = document.querySelector('.template-suggestion');
    
    if (heroTextarea && templateSuggestion) {
        // Show template suggestion on textarea focus
        heroTextarea.addEventListener('focus', function() {
            templateSuggestion.style.display = 'block';
            setTimeout(() => {
                templateSuggestion.style.opacity = '1';
                templateSuggestion.style.transform = 'translateY(0)';
            }, 100);
        });

        // Simulate typing effect
        let typingTimeout;
        heroTextarea.addEventListener('click', function() {
            if (this.value === '') {
                clearTimeout(typingTimeout);
                const text = "I'm excited about this opportunity because [company name] aligns perfectly with my values and career aspirations...";
                let i = 0;
                
                const typeWriter = () => {
                    if (i < text.length) {
                        this.value += text.charAt(i);
                        i++;
                        typingTimeout = setTimeout(typeWriter, 50);
                    }
                };
                
                setTimeout(typeWriter, 1000);
            }
        });
    }

    // Animate feature cards on scroll
    const featureCards = document.querySelectorAll('.feature-card');
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        cardObserver.observe(card);
    });

    // Template cards hover effects
    const templateCards = document.querySelectorAll('.template-card');
    templateCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Install button functionality
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Check if Chrome Web Store is available
            if (typeof chrome !== 'undefined' && chrome.webstore) {
                // This would be the actual Chrome Web Store ID
                // chrome.webstore.install();
                alert('This would redirect to the Chrome Web Store to install the extension!');
            } else {
                // Fallback for non-Chrome browsers or development
                alert('To install Applying Assistant:\n\n1. Open Chrome\n2. Go to chrome://extensions/\n3. Enable "Developer mode"\n4. Click "Load unpacked" and select the extension folder');
            }
        });
    }

    // Parallax effect for hero section
    const hero = document.querySelector('.hero');
    const heroContent = document.querySelector('.hero-content');
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        if (hero && scrolled < hero.offsetHeight) {
            hero.style.transform = `translateY(${rate}px)`;
        }
    });

    // Add loading animation
    window.addEventListener('load', function() {
        document.body.classList.add('loaded');
        
        // Animate hero elements
        const heroElements = document.querySelectorAll('.hero-badge, .hero-title, .hero-description, .hero-buttons, .hero-stats');
        heroElements.forEach((element, index) => {
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 200);
        });
    });

    // Initialize hero elements for animation
    const heroElements = document.querySelectorAll('.hero-badge, .hero-title, .hero-description, .hero-buttons, .hero-stats');
    heroElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    });

    // Stats counter animation
    const stats = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = target.textContent;
                let currentValue = 0;
                const increment = finalValue.includes('%') ? 1 : 1;
                const duration = 2000;
                const stepTime = duration / (parseInt(finalValue) || 10);
                
                const counter = setInterval(() => {
                    if (finalValue.includes('%')) {
                        currentValue += increment;
                        target.textContent = currentValue + '%';
                        if (currentValue >= parseInt(finalValue)) {
                            clearInterval(counter);
                            target.textContent = finalValue;
                        }
                    } else if (finalValue.includes('min')) {
                        target.textContent = finalValue; // Keep as is for "5min"
                        clearInterval(counter);
                    } else {
                        currentValue += increment;
                        target.textContent = currentValue + '+';
                        if (currentValue >= parseInt(finalValue)) {
                            clearInterval(counter);
                            target.textContent = finalValue;
                        }
                    }
                }, stepTime);
                
                statsObserver.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => {
        statsObserver.observe(stat);
    });

    // Add subtle animations to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Easter egg: Konami code
    let konamiCode = [];
    const konamiSequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA
    
    document.addEventListener('keydown', function(e) {
        konamiCode.push(e.keyCode);
        
        if (konamiCode.length > konamiSequence.length) {
            konamiCode.shift();
        }
        
        if (konamiCode.length === konamiSequence.length && 
            konamiCode.every((code, index) => code === konamiSequence[index])) {
            
            // Easter egg activated!
            document.body.style.animation = 'rainbow 2s infinite';
            setTimeout(() => {
                document.body.style.animation = '';
                alert('🎉 Easter egg found! You\'re clearly detail-oriented - perfect for job applications!');
            }, 2000);
            
            konamiCode = [];
        }
    });

    // Add rainbow animation for easter egg
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Performance optimization: debounce scroll events
const debouncedScroll = debounce(function() {
    // Any scroll-based animations can be optimized here
}, 16); // ~60fps

window.addEventListener('scroll', debouncedScroll); 