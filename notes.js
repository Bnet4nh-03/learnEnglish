// ── NOTES MANAGER ──
const NotesManager = {
  storageKey: 'englishAcademyNotes',

  // Lấy tất cả ghi chú
  getAll() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  },

  // Thêm ghi chú mới
  add(title = '', content = '') {
    const notes = this.getAll();
    const newNote = {
      id: Date.now(),
      title: title || 'Ghi chú không tiêu đề',
      content: content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      highlights: []
    };
    notes.push(newNote);
    localStorage.setItem(this.storageKey, JSON.stringify(notes));
    return newNote;
  },

  // Cập nhật ghi chú
  update(id, title = '', content = '') {
    const notes = this.getAll();
    const noteIndex = notes.findIndex(n => n.id === id);
    
    if (noteIndex === -1) return null;

    notes[noteIndex] = {
      ...notes[noteIndex],
      title: title || 'Ghi chú không tiêu đề',
      content: content,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.storageKey, JSON.stringify(notes));
    return notes[noteIndex];
  },

  // Xóa ghi chú
  delete(id) {
    const notes = this.getAll();
    const filtered = notes.filter(n => n.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  },

  // Định dạng ngày tháng
  formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Kiểm tra nếu là hôm nay
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    // Kiểm tra nếu là hôm qua
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    }

    // Kiểm tra nếu trong tuần này
    const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return `${daysDiff} ngày trước`;
    }

    // Ngày cụ thể
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  // Thêm highlight vào ghi chú
  addHighlight(id, highlight) {
    const notes = this.getAll();
    const noteIndex = notes.findIndex(n => n.id === id);
    
    if (noteIndex === -1) return null;

    if (!notes[noteIndex].highlights) {
      notes[noteIndex].highlights = [];
    }

    notes[noteIndex].highlights.push({
      ...highlight,
      highlightId: Date.now()
    });

    localStorage.setItem(this.storageKey, JSON.stringify(notes));
    return notes[noteIndex];
  },

  // Xóa highlight
  removeHighlight(id, highlightId) {
    const notes = this.getAll();
    const noteIndex = notes.findIndex(n => n.id === id);
    
    if (noteIndex === -1) return null;

    notes[noteIndex].highlights = notes[noteIndex].highlights.filter(h => h.highlightId !== highlightId);
    localStorage.setItem(this.storageKey, JSON.stringify(notes));
    return notes[noteIndex];
  },

  // Lấy tất cả highlight của một ghi chú
  getHighlights(id) {
    const notes = this.getAll();
    const note = notes.find(n => n.id === id);
    return note ? (note.highlights || []) : [];
  },

  // Xuất dữ liệu ghi chú
  export() {
    return {
      exportDate: new Date().toISOString(),
      notes: this.getAll()
    };
  },

  // Nhập dữ liệu ghi chú
  import(data) {
    try {
      if (Array.isArray(data)) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }
};