class Disclosure {
  constructor(a) {
    const b = a.querySelectorAll('summary:not(:scope summary + * *)');
    b.forEach(c => {
      const d = c.parentElement;
      const e = d.name;
      const f = async (a, b) => {
        const c = a.parentElement;
        const d = a.nextElementSibling;
        const f = d.style;
        const g = document.querySelector(`details[name="${e}"][open]`);
        c.open = true;
        const h = `${d.scrollHeight}px`;
        if (g) {
          g.open = true;
        }
        const i = async () => {
          for (let i = 0; i < 2; i++) {
            await new Promise(requestAnimationFrame);
          }
        };
        d.addEventListener('transitionend', function a(d) {
          if (d.propertyName !== 'max-height') {
            return;
          }
          delete c.dataset.disclosureTransitioning;
          if (e) {
            c.name = e;
          }
          if (!b) {
            c.open = false;
            delete c.dataset.disclosureClosing;
          }
          f.maxHeight = f.overflow = '';
          this.removeEventListener('transitionend', a);
        });
        c.dataset.disclosureTransitioning = '';
        if (e) {
          c.removeAttribute('name');
        }
        if (b) {
          c.open = true;
        } else {
          c.dataset.disclosureClosing = '';
        }
        f.maxHeight = b ? 0 : h;
        f.overflow = 'clip';
        await i();
        f.maxHeight = b ? h : 0;
      };
      c.addEventListener('click', b => {
        b.preventDefault();
        if (a.querySelector('[data-disclosure-transitioning]')) {
          return;
        }
        f(c, !d.open);
        if (d.open && e) {
          const g = document.querySelector(`details[name="${e}"][open] > summary`);
          if (g && b !== c) {
            f(g, false);
          }
        }
      });
      c.addEventListener('keydown', a => {
        const c = a.key;
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(c)) {
          return;
        }
        a.preventDefault();
        const d = [...b].indexOf(document.activeElement);
        const e = b.length;
        const f = b[c === 'ArrowUp' ? d - 1 < 0 ? e - 1 : d - 1 : c === 'ArrowDown' ? (d + 1) % e : c === 'Home' ? 0 : e - 1];
        f.focus();
      });
    });
  }
}

export default Disclosure;