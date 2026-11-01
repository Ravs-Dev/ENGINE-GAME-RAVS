// Store complete edit transactions. Simulation and selection changes are excluded.
export class History {
  constructor(state, limit = 100) {
    this.entries = [structuredClone(state)];
    this.index = 0;
    this.limit = limit;
  }
  get canUndo() { return this.index > 0; }
  get canRedo() { return this.index < this.entries.length - 1; }
  record(state) {
    if (JSON.stringify(state.scene) === JSON.stringify(this.entries[this.index].scene)) return false;
    this.entries.splice(this.index + 1);
    this.entries.push(structuredClone(state));
    if (this.entries.length > this.limit + 1) this.entries.shift();
    this.index = this.entries.length - 1;
    return true;
  }
  undo() { if (!this.canUndo) return null; return structuredClone(this.entries[--this.index]); }
  redo() { if (!this.canRedo) return null; return structuredClone(this.entries[++this.index]); }
}
