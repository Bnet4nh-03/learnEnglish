// ── NOTES MANAGER (in-memory) ──
// Seeds from notes-data.js (window.notesData) and supports folders, simple
// search/filter/sort helpers. Everything remains in-memory; use export
// helpers to persist if needed.

const NotesManager = {
  notes: [],
  folders: [],
  _sourceNotes: null,
  _sourceFolders: null,
  _inited: false,

  // Load dữ liệu từ file notes-data.js (window.notesData)
  init() {
    if (this._inited) return true;
    this._inited = true;

    const now = new Date().toISOString();

    if (window.notesData && Array.isArray(window.notesData)) {
      // clone source to work in-memory and normalize fields
      this.notes = JSON.parse(JSON.stringify(window.notesData)).map(n => ({
        id: n.id || Date.now() + Math.floor(Math.random() * 1000),
        title: (n.title || 'Ghi chú không tiêu đề').trim(),
        content: n.content || '',
        createdAt: n.createdAt || now,
        updatedAt: n.updatedAt || n.createdAt || now,
        highlights: n.highlights || [],
        folderId: n.folderId || null
      }));

      this._sourceNotes = JSON.parse(JSON.stringify(this.notes));

      // optional folders seed
      if (window.notesFolders && Array.isArray(window.notesFolders)) {
        this.folders = JSON.parse(JSON.stringify(window.notesFolders));
        this._sourceFolders = JSON.parse(JSON.stringify(this.folders));
      } else {
        this.folders = [];
        this._sourceFolders = [];
      }

      console.info('NotesManager.init: seeded from window.notesData', this.notes.length);
      return true;
    }

    // otherwise start empty
    this.notes = [];
    this.folders = [];
    this._sourceNotes = [];
    this._sourceFolders = [];
    console.info('NotesManager.init: initialized empty notes (no localStorage)');
    return true;
  },

  ready() {
    return Promise.resolve(true);
  },

  // Return a sorted shallow copy. Optionally accept filter options:
  // { search, folderId, sort }
  getAll(options = null) {
    let arr = [...this.notes];

    // default sort: updated desc
    const applySort = (list, sort) => {
      if (!sort || sort === 'updated_desc') return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      if (sort === 'updated_asc') return list.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
      if (sort === 'title_asc') return list.sort((a, b) => a.title.localeCompare(b.title));
      if (sort === 'title_desc') return list.sort((a, b) => b.title.localeCompare(a.title));
      return list;
    };

    if (options) {
      const { search, folderId, sort } = options;
      if (folderId !== undefined && folderId !== null && folderId !== '') {
        if (folderId === 'null') arr = arr.filter(n => !n.folderId);
        else arr = arr.filter(n => String(n.folderId) === String(folderId));
      }
      if (search) {
        const q = String(search).toLowerCase();
        arr = arr.filter(n => (n.title && n.title.toLowerCase().includes(q)) || (n.content && n.content.toLowerCase().includes(q)));
      }
      arr = applySort(arr, sort);
      return arr;
    }

    return applySort(arr, 'updated_desc');
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
      highlights: [],
      folderId: null
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

  // Folders API
  getFolders() {
    return [...this.folders].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  createFolder(name) {
    const f = { id: Date.now(), name: (name || 'Untitled').trim(), createdAt: new Date().toISOString() };
    this.folders.push(f);
    return f;
  },

  renameFolder(id, name) {
    const idx = this.folders.findIndex(f => f.id === id);
    if (idx === -1) return null;
    this.folders[idx].name = (name || this.folders[idx].name).trim();
    return this.folders[idx];
  },

  deleteFolder(id) {
    this.folders = this.folders.filter(f => f.id !== id);
    // remove folder assignment from notes
    this.notes = this.getAll().map(n => n.folderId === id ? { ...n, folderId: null } : n);
    return true;
  },

  setNoteFolder(noteId, folderId) {
    const notes = this.getAll();
    const i = notes.findIndex(n => n.id === noteId);
    if (i === -1) return null;
    notes[i] = { ...notes[i], folderId: folderId || null, updatedAt: new Date().toISOString() };
    this.save(notes);
    return notes[i];
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

  // Export JSON file
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

  // Export as JS assignment file (notes-data.js style) including folders
  exportToNotesJs(filename = `notes-data-${Date.now()}.js`) {
    try {
      const arr = this.getAll();
      let js = 'window.notesData = ' + JSON.stringify(arr, null, 2) + '\n';
      if (this.folders && this.folders.length) js += 'window.notesFolders = ' + JSON.stringify(this.folders, null, 2) + '\n';
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
      // normalize
      const now = new Date().toISOString();
      this.notes = parsed.map(n => ({
        id: n.id || Date.now() + Math.floor(Math.random() * 1000),
        title: (n.title || 'Ghi chú không tiêu đề').trim(),
        content: n.content || '',
        createdAt: n.createdAt || now,
        updatedAt: n.updatedAt || n.createdAt || now,
        highlights: n.highlights || [],
        folderId: n.folderId || null
      }));
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
      this.folders = this._sourceFolders ? JSON.parse(JSON.stringify(this._sourceFolders)) : [];
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
  console.log('NotesManager.folders', NotesManager.folders);
};
