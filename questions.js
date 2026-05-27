/* QuestionsManager
   - Seeds from `window.questionsData` when no `englishQuestions` in localStorage.
   - Operates on localStorage thereafter.
   - Provides ready() Promise, CRUD for lessons/questions, import/export, reset.
*/

const QuestionsManager = (function() {
  const STORAGE_KEY = 'englishQuestions';
  let lessons = [];
  let _readyResolve;
  const _ready = new Promise((res) => { _readyResolve = res; });
  let _inited = false;

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
    } catch (e) {
      console.warn('QuestionsManager.save() failed', e);
    }
  }

  function init() {
    if (_inited) return;
    _inited = true;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          lessons = parsed;
          console.info('QuestionsManager: loaded from localStorage', lessons.length);
          _readyResolve(true);
          return;
        }
      }
    } catch (e) {
      console.warn('QuestionsManager: error parsing localStorage', e);
    }

    if (window.questionsData && Array.isArray(window.questionsData)) {
      // clone to avoid accidental mutation of source
      lessons = JSON.parse(JSON.stringify(window.questionsData));
      save();
      console.info('QuestionsManager: seeded from window.questionsData', lessons.length);
      _readyResolve(true);
      return;
    }

    // empty default
    lessons = [];
    save();
    console.info('QuestionsManager: initialized empty lessons');
    _readyResolve(true);
  }

  // Public API
  return {
    ready() { init(); return _ready; },

    getLessons() { return lessons; },

    getLesson(index) { return lessons[index]; },

    addLesson(lesson) {
      const entry = Array.isArray(lesson) ? lesson : (lesson && lesson.questions ? lesson.questions : []);
      lessons.push(entry);
      save();
      window.lessons = lessons;
      return lessons.length - 1;
    },

    updateLesson(index, newLesson) {
      if (index < 0 || index >= lessons.length) return false;
      lessons[index] = Array.isArray(newLesson) ? newLesson : (newLesson && newLesson.questions ? newLesson.questions : []);
      save();
      window.lessons = lessons;
      return true;
    },

    deleteLesson(index) {
      if (index < 0 || index >= lessons.length) return false;
      lessons.splice(index, 1);
      save();
      window.lessons = lessons;
      return true;
    },

    addQuestion(lessonIndex, questionObj) {
      if (lessonIndex < 0 || lessonIndex >= lessons.length) return false;
      lessons[lessonIndex].push(questionObj);
      save();
      window.lessons = lessons;
      return lessons[lessonIndex].length - 1;
    },

    updateQuestion(lessonIndex, questionIndex, questionObj) {
      if (lessonIndex < 0 || lessonIndex >= lessons.length) return false;
      const lesson = lessons[lessonIndex];
      if (questionIndex < 0 || questionIndex >= lesson.length) return false;
      lesson[questionIndex] = questionObj;
      save();
      window.lessons = lessons;
      return true;
    },

    deleteQuestion(lessonIndex, questionIndex) {
      if (lessonIndex < 0 || lessonIndex >= lessons.length) return false;
      const lesson = lessons[lessonIndex];
      if (questionIndex < 0 || questionIndex >= lesson.length) return false;
      lesson.splice(questionIndex, 1);
      save();
      window.lessons = lessons;
      return true;
    },

    exportToFile(filename = 'english-questions.json') {
      try {
        const dataStr = JSON.stringify(lessons, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
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
        console.warn('QuestionsManager.exportToFile failed', e);
        return false;
      }
    },

    importFromJsonString(jsonString, replace = false) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed)) return false;
        if (replace) {
          lessons = parsed;
        } else {
          lessons = lessons.concat(parsed);
        }
        save();
        window.lessons = lessons;
        return true;
      } catch (e) {
        console.warn('QuestionsManager.importFromJsonString failed', e);
        return false;
      }
    },

    resetFromSource() {
      if (window.questionsData && Array.isArray(window.questionsData)) {
        lessons = JSON.parse(JSON.stringify(window.questionsData));
        save();
        window.lessons = lessons;
        console.info('QuestionsManager: reset from source');
        return true;
      }
      return false;
    },

    debug() {
      console.log('QuestionsManager debug — lessons count:', lessons.length);
      console.log('localStorage key', STORAGE_KEY, localStorage.getItem(STORAGE_KEY));
    }
  };
})();

// initialize immediately so UI can call QuestionsManager.ready()
QuestionsManager.ready();

// expose for UI compatibility
window.lessons = QuestionsManager.getLessons();
window.QuestionsManager_debug = QuestionsManager.debug;
