// ── NOTES MANAGER (no localStorage) ──
// This version seeds from notes-data.js (window.notesData) and operates
// entirely in-memory. Use `exportToNotesJs()` to download an updated
// notes-data.js file that re-seeds the app when loaded.

const NotesManager = {
  notes: [],
  _sourceNotes: null,

  // Load dữ liệu từ file notes-data.js (window.notesData)
  init() {
    if (this._inited) return true;
    this._inited = true;

    if (window.notesData && Array.isArray(window.notesData)) {
      // clone source to work in-memory
      this.notes = JSON.parse(JSON.stringify(window.notesData));
      this._sourceNotes = JSON.parse(JSON.stringify(window.notesData));
      console.info('NotesManager.init: seeded from window.notesData', this.notes.length);
      return true;
    }

    // otherwise start empty
    this.notes = [];
    this._sourceNotes = [];
    console.info('NotesManager.init: initialized empty notes (no localStorage)');
    return true;
  },

  ready() {
    return Promise.resolve(true);
  },

  // Return a sorted shallow copy (by updatedAt desc)
  getAll() {
    return [...this.notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  // Save in-memory only
  save(notes) {
    this.notes = notes;
  },

  // Add note
  add(title = '', content = '') {
    const notes = this.getAll();
    const now = new Date().toISOString();
    const newNote = {
      id: Date.now(),
      title: title.trim() || 'Ghi chú không tiêu đề',
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
      highlights: []
    };
    notes.unshift(newNote);
    this.save(notes);
    return newNote;
  },

  // Update note
  update(id, title = '', content = '', highlights) {
    const notes = this.getAll();
    const noteIndex = notes.findIndex(n => n.id === id);
    if (noteIndex === -1) return null;
    notes[noteIndex] = {
      ...notes[noteIndex],
      title: title.trim() || 'Ghi chú không tiêu đề',
      content: content.trim(),
      highlights: highlights !== undefined ? highlights : (notes[noteIndex].highlights || []),
      updatedAt: new Date().toISOString()
    };
    this.save(notes);
    return notes[noteIndex];
  },

  // Delete note
  delete(id) {
    const notes = this.getAll().filter(n => n.id !== id);
    this.save(notes);
    return true;
  },

  // Date formatting (unchanged)
  formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    }
    const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) return `${daysDiff} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  // Highlights
  addHighlight(id, highlight) {
    const notes = this.getAll();
    const noteIndex = notes.findIndex(n => n.id === id);
    if (noteIndex === -1) return null;
    if (!notes[noteIndex].highlights) notes[noteIndex].highlights = [];
    notes[noteIndex].highlights.push({ ...highlight, highlightId: Date.now() });
    this.save(notes);
    return notes[noteIndex];
  },

  removeHighlight(id, highlightId) {
    const notes = this.getAll();
    const noteIndex = notes.findIndex(n => n.id === id);
    if (noteIndex === -1) return null;
    notes[noteIndex].highlights = (notes[noteIndex].highlights || []).filter(h => h.highlightId !== highlightId);
    this.save(notes);
    return notes[noteIndex];
  },

  getHighlights(id) {
    const note = this.getAll().find(n => n.id === id);
    return note ? (note.highlights || []) : [];
  },

  // Export JSON file (same as before)
  exportToFile() {
    const data = JSON.stringify(this.getAll(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Export as JS assignment file (notes-data.js style)
  exportToNotesJs(filename = `notes-data-${Date.now()}.js`) {
    try {
      const arr = this.getAll();
      const js = 'window.notesData = ' + JSON.stringify(arr, null, 2) + ';\n';
      const blob = new Blob([js], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('exportToNotesJs failed', e);
      return false;
    }
  },

  // Import from file — supports JSON array or notes-data.js (window.notesData = [...];)
  async importFromFile(file) {
    try {
      const text = await file.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        const m = text.match(/window\.notesData\s*=\s*(\[([\s\S]*)\]);?/m);
        if (m && m[1]) {
          try {
            parsed = JSON.parse(m[1]);
          } catch (e2) {
            try {
              const fn = new Function('return ' + m[1]);
              parsed = fn();
            } catch (e3) {
              parsed = null;
            }
          }
        }
      }
      if (!Array.isArray(parsed)) throw new Error('File không hợp lệ: không tìm thấy mảng ghi chú');
      this.notes = parsed;
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  // Reset in-memory notes to original source from notes-data.js (if present)
  resetFromSource() {
    if (this._sourceNotes) {
      this.notes = JSON.parse(JSON.stringify(this._sourceNotes));
      return true;
    }
    return false;
  }
};

// Khởi tạo
NotesManager.init();

// Debug helper
window.NotesManager_debug = function() {
  console.log('NotesManager.notes', NotesManager.notes);
  console.log('NotesManager.source', NotesManager._sourceNotes);
};
