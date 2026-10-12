// ---------- State ----------
let particlesActive = true;
let canvasAnimationId = null;
let selectedRole = 'admin';
let authMode = 'signin'; // 'signin' | 'signup'
let toastTimer = null;
let currentUser = null; // set by the Firebase module below

const roleLabels = {
  admin: 'Facility Administrator',
  faculty: 'Faculty & Lecturer',
  student: 'Student Researcher'
};

// ---------- Mega menu ----------
function toggleMegaMenu() {
  const menu = document.getElementById('megaMenu');
  const open = menu.classList.toggle('hidden') === false;
  document.getElementById('exploreBtn').setAttribute('aria-expanded', String(open));
  document.getElementById('exploreChevron').classList.toggle('rotate-180', open);
}
function closeMegaMenu() {
  document.getElementById('megaMenu').classList.add('hidden');
  document.getElementById('exploreBtn').setAttribute('aria-expanded', 'false');
  document.getElementById('exploreChevron').classList.remove('rotate-180');
}
document.addEventListener('click', (e) => {
  const menu = document.getElementById('megaMenu');
  const btn = document.getElementById('exploreBtn');
  if (!menu.classList.contains('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) {
    closeMegaMenu();
  }
});

// ---------- Auth modal ----------
function openAuthModal(role, mode) {
  closeMegaMenu();
  if (typeof role === 'string') selectedRole = role;
  setAuthMode(mode === 'signup' ? 'signup' : 'signin');
  clearAuthMessage();
  const modal = document.getElementById('authModal');
  const box = document.getElementById('authModalBox');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  // next frame so the transition runs
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95');
    box.classList.add('scale-100');
    document.getElementById('modalUserEmail').focus();
  });
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  const box = document.getElementById('authModalBox');
  if (modal.classList.contains('hidden')) return;
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100');
  box.classList.add('scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('loginForm').reset();
    clearAuthMessage();
  }, 250);
}

document.getElementById('authModal').addEventListener('click', (e) => {
  if (e.target.id === 'authModal') closeAuthModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeAuthModal(); closeMegaMenu(); }
});

function selectModalRole(role) {
  if (!roleLabels[role]) role = 'admin';
  selectedRole = role;
  Object.keys(roleLabels).forEach((r) => {
    const btn = document.getElementById('modal-role-' + r);
    btn.className = r === role
      ? 'py-2 text-xs font-bold rounded-xl transition bg-nvidiaGreen text-black shadow-sm'
      : 'py-2 text-xs font-bold rounded-xl transition text-slate-400 hover:text-white';
  });
  // className above wipes the "hidden" class, so re-apply it
  document.getElementById('modal-role-admin').classList.toggle('hidden', authMode === 'signup');
}

function getAuthMode() { return authMode; }
function getSelectedRole() { return selectedRole; }

function submitLabel() {
  return authMode === 'signup' ? 'Create Account & Enter Dashboard' : 'Authenticate & Enter Dashboard';
}

function setAuthMode(mode) {
  authMode = mode === 'signup' ? 'signup' : 'signin';
  const signup = authMode === 'signup';

  // Public sign-up can never create an admin, so hide that role there
  if (signup && selectedRole === 'admin') selectedRole = 'student';
  document.getElementById('modal-role-admin').classList.toggle('hidden', signup);
  const pills = document.getElementById('rolePills');
  pills.classList.toggle('grid-cols-3', !signup);
  pills.classList.toggle('grid-cols-2', signup);
  selectModalRole(selectedRole);

  document.getElementById('nameField').classList.toggle('hidden', !signup);
  document.getElementById('confirmField').classList.toggle('hidden', !signup);
  document.getElementById('forgotBtn').classList.toggle('hidden', signup);
  document.getElementById('modalUserPass').autocomplete = signup ? 'new-password' : 'current-password';

  document.getElementById('authTitle').textContent = signup ? 'Create Your Account' : 'Institutional Authentication';
  document.getElementById('btnModalText').textContent = submitLabel();
  document.getElementById('switchPrompt').textContent = signup ? 'Already have an account?' : 'New to EcoCampus AI?';
  document.getElementById('switchModeBtn').textContent = signup ? 'Sign in' : 'Create an account';

  document.getElementById('mode-signin').className = 'pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ' +
    (signup ? 'border-transparent text-slate-400 hover:text-white' : 'border-nvidiaGreen text-white');
  document.getElementById('mode-signup').className = 'pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ' +
    (signup ? 'border-nvidiaGreen text-white' : 'border-transparent text-slate-400 hover:text-white');

  clearAuthMessage();
}

function toggleModalPassword() {
  const pass = document.getElementById('modalUserPass');
  const eye = document.getElementById('modalEyeIcon');
  if (pass.type === 'password') {
    pass.type = 'text';
    eye.className = 'fa-regular fa-eye-slash text-xs text-nvidiaGreen';
  } else {
    pass.type = 'password';
    eye.className = 'fa-regular fa-eye text-xs';
  }
}

// Inline message helpers (textContent only, so no HTML injection)
function showAuthMessage(text, type) {
  const box = document.getElementById('authMessage');
  box.textContent = text;
  box.className = 'p-3 rounded-xl mb-4 text-xs font-semibold border ' + (
    type === 'success'
      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
      : type === 'info'
        ? 'bg-blue-950/60 border-blue-500/40 text-blue-300'
        : 'bg-red-950/60 border-red-500/40 text-red-400'
  );
}
function clearAuthMessage() {
  const box = document.getElementById('authMessage');
  box.textContent = '';
  box.className = 'hidden p-3 rounded-xl mb-4 text-xs font-semibold';
}

// ---------- Nav sign-in / sign-out button ----------
function handleAuthNavClick() {
  if (currentUser && typeof window.ecoSignOut === 'function') {
    window.ecoSignOut();
  } else {
    openAuthModal();
  }
}

function updateAuthUI(user, role) {
  currentUser = user;
  const text = document.getElementById('authNavText');
  const icon = document.getElementById('authNavIcon');
  document.getElementById('signUpNavBtn').classList.toggle('sm:inline-flex', !user);
  if (user) {
    const name = user.displayName || (user.email || 'Signed in').split('@')[0];
    text.textContent = role ? `${name} · ${role}` : name;
    icon.className = 'fa-solid fa-right-from-bracket text-xs';
    document.getElementById('authNavBtn').title = 'Click to sign out';
  } else {
    text.textContent = 'Sign In';
    icon.className = 'fa-regular fa-user text-xs';
    document.getElementById('authNavBtn').title = '';
  }
}

// ---------- Destinations ----------
function launchDestination(dest) {
  if (dest === 'dashboard') {
    showToast('Entering live campus monitoring dashboard...');
    document.getElementById('interactiveNodeMap').scrollIntoView({ behavior: 'smooth' });
  } else if (dest === 'rooms') {
    if (!currentUser) { showToast('Sign in to control room actuators.', 'warn'); openAuthModal('faculty'); return; }
    showToast('Accessing smart actuator controls for Classroom 101...');
  } else if (dest === 'safety') {
    showToast('Launching safety telemetry console...');
  } else if (dest === 'ai') {
    showToast('Loading neural forecast console...');
  } else if (dest === 'api') {
    showToast('Opening the research API portal...');
  }
}

function inspectZone(zoneName) {
  showToast(`Synchronized with ${zoneName} telemetry bus.`);
}

function simulateToggle(btn) {
  if (!currentUser) {
    showToast('Sign in to override actuators.', 'warn');
    openAuthModal('faculty');
    return;
  }
  const overridden = btn.dataset.overridden === '1';
  if (!overridden) {
    btn.dataset.overridden = '1';
    btn.className = 'px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold whitespace-nowrap';
    btn.textContent = 'MANUAL OFF';
    showToast('Actuator overridden to OFF');
  } else {
    btn.dataset.overridden = '0';
    btn.className = 'px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold whitespace-nowrap';
    btn.textContent = btn.dataset.label;
    showToast('Actuator returned to AI autonomous mode');
  }
}

// ---------- Toast ----------
function showToast(msg, type) {
  const toast = document.getElementById('toastNotification');
  const icon = document.getElementById('toastIcon');
  document.getElementById('toastMsg').textContent = msg;
  icon.className = type === 'warn'
    ? 'fa-solid fa-triangle-exclamation text-amber-400'
    : 'fa-solid fa-circle-check text-nvidiaGreen';
  toast.classList.remove('translate-y-24', 'opacity-0');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('translate-y-24', 'opacity-0');
  }, 3000);
}

// ---------- Hero canvas ----------
const canvas = document.getElementById('heroCanvas');
const ctx = canvas.getContext('2d');
let width = 0, height = 0;
let particles = [];
const mouse = { x: -1000, y: -1000 };

function resizeCanvas() {
  width = canvas.width = canvas.parentElement.offsetWidth;
  height = canvas.height = canvas.parentElement.offsetHeight;
}

window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

class IoTNodeParticle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.8;
    this.vy = (Math.random() - 0.5) * 0.8;
    this.radius = Math.random() * 2 + 1;
    this.color = Math.random() > 0.4 ? '#76b900' : '#004ec4';
    this.alpha = Math.random() * 0.6 + 0.2;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;

    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0 && dist < 120) {   // guard against divide-by-zero
      this.x -= (dx / dist) * 1.5;
      this.y -= (dy / dist) * 1.5;
    }
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha;
    ctx.fill();
  }
}

function initParticles() {
  resizeCanvas();
  particles = [];
  const count = Math.min(80, Math.floor(width / 18));
  for (let i = 0; i < count; i++) particles.push(new IoTNodeParticle());
}

function animateParticles() {
  if (!particlesActive) return;
  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();

    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 110) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = '#76b900';
        ctx.globalAlpha = (1 - distance / 110) * 0.18;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  canvasAnimationId = requestAnimationFrame(animateParticles);
}

function toggleHeroParticles() {
  particlesActive = !particlesActive;
  const icon = document.getElementById('particleIcon');
  cancelAnimationFrame(canvasAnimationId);       // never run two loops at once
  if (particlesActive) {
    icon.className = 'fa-solid fa-pause text-xs';
    animateParticles();
    showToast('Ambient IoT simulation resumed.');
  } else {
    icon.className = 'fa-solid fa-play text-xs';
    showToast('Ambient IoT simulation paused.');
  }
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(initParticles, 150);
});

// Respect reduced-motion: start paused
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

window.addEventListener('load', () => {
  initParticles();
  if (prefersReducedMotion) {
    particlesActive = false;
    document.getElementById('particleIcon').className = 'fa-solid fa-play text-xs';
  } else {
    animateParticles();
  }
});

// ---------- Live ticker (demo data) ----------
setInterval(() => {
  const powerEl = document.getElementById('tickerPower');
  if (powerEl) powerEl.textContent = 118 + Math.floor(Math.random() * 6);
}, 3000);