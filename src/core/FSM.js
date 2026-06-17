// ============================================================================
// FSM.js — Mesin state berhingga generik (basis seluruh Multi-FSM)
// Pakai: definisikan states {name:{onEnter,onUpdate,onExit,transitions}}.
// Transisi tervalidasi: hanya pindah ke state yang diizinkan.
// ============================================================================

export class FSM {
  /**
   * @param {object} opts
   * @param {string} opts.name      - nama FSM (Package/Vehicle/...)
   * @param {object} opts.states    - peta state
   * @param {string} opts.initial   - state awal
   * @param {object} opts.context   - objek pemilik (Package/Vehicle/dst)
   * @param {function} [opts.onTransition] - callback (from,to)
   */
  constructor({ name, states, initial, context = null, onTransition = null }) {
    this.name = name;
    this.states = states;
    this.context = context;
    this.onTransition = onTransition;
    this.state = null;
    this.previous = null;
    this.timeInState = 0;
    this._set(initial, true);
  }

  _set(stateName, isInitial = false) {
    const next = this.states[stateName];
    if (!next) throw new Error(`[${this.name}] state tidak dikenal: ${stateName}`);
    const from = this.state;
    if (from && this.states[from]?.onExit) this.states[from].onExit(this.context, this);
    this.previous = from;
    this.state = stateName;
    this.timeInState = 0;
    if (next.onEnter) next.onEnter(this.context, this);
    if (!isInitial && this.onTransition) this.onTransition(from, stateName, this.context, this);
  }

  /**
   * Pindah state dengan validasi transisi.
   * Bila state saat ini mendefinisikan `transitions` (array), tujuan harus ada di dalamnya.
   */
  transition(to) {
    if (to === this.state) return false;
    const cur = this.states[this.state];
    if (cur && Array.isArray(cur.transitions) && !cur.transitions.includes(to)) {
      console.warn(`[${this.name}] transisi ilegal: ${this.state} → ${to}`);
      return false;
    }
    this._set(to);
    return true;
  }

  /** Paksa pindah tanpa validasi (untuk reset / event darurat). */
  force(to) {
    this._set(to);
  }

  is(stateName) {
    return this.state === stateName;
  }

  isAny(...names) {
    return names.includes(this.state);
  }

  update(dt) {
    this.timeInState += dt;
    const cur = this.states[this.state];
    if (cur && cur.onUpdate) cur.onUpdate(this.context, this, dt);
  }
}
