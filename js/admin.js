/**
 * ════════════════════════════════════════════════════════════════
 *  admin.js  –  Digitalization Review Suite
 *
 *  TWO modules exported to window:
 *
 *  AgendaStore  – single source of truth for speaker/agenda data
 *                 all reads/writes go through here.
 *
 *  AdminUI      – all DOM rendering and event handling for
 *                 admin.html.  Pure presentation layer.
 *
 *  localStorage key: "digi_review_agenda"
 *  Schema: Array of Speaker objects (see below).
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   AgendaStore
   ──────────────────────────────────────────────────────────────
   Speaker object schema
   {
     id      : string   – UUID (generated on creation)
     owner   : string   – Speaker name
     title   : string   – Topic / presentation title
     seconds : number   – Allocated time in seconds
     mode    : string   – "presenter" | "discussion"
   }
══════════════════════════════════════════════════════════════ */
var AgendaStore = (function () {

  var STORAGE_KEY = 'digi_review_agenda';

  /* ── Default seed agenda (mirrors the original hardcoded data) ── */
  var DEFAULT_AGENDA = [
    { id: _uid(), owner: 'GANESH WAICHAL',                 title: 'PREFACE / ICEBREAKING',     seconds: 5*60,  mode: 'presenter'  },
    { id: _uid(), owner: 'GAUTAM PARIDA + SHRADDHA PAGAR', title: '2025 JOURNEY',               seconds: 5*60,  mode: 'presenter'  },
    { id: _uid(), owner: 'VEDANT PURANDARE',               title: 'TEAM 2025',                  seconds: 5*60,  mode: 'presenter'  },
    { id: _uid(), owner: 'ABHIJEET SOLANKE',               title: 'VIDEO OF 2025 PROJECTS',     seconds: 10*60, mode: 'presenter'  },
    { id: _uid(), owner: 'SHRIKANT NIMBALKAR',             title: 'AI TRENDS',                  seconds: 10*60, mode: 'presenter'  },
    { id: _uid(), owner: 'SHRIKANT NIMBALKAR',             title: 'AMBASSADOR PROGRAM',         seconds: 10*60, mode: 'presenter'  },
    { id: _uid(), owner: 'VEDANT PURANDARE',               title: 'TEAM 2026',                  seconds: 5*60,  mode: 'presenter'  },
    { id: _uid(), owner: 'SHRIKANT NIMBALKAR',             title: '2026 PLAN',                  seconds: 5*60,  mode: 'presenter'  },
    { id: _uid(), owner: 'LEADERSHIP',                     title: 'LEADERSHIP VIEWS',           seconds: 10*60, mode: 'discussion' },
    { id: _uid(), owner: 'SHRIKANT NIMBALKAR',             title: 'CLOSING',                    seconds: 2*60,  mode: 'presenter'  }
  ];

  /* ── Private: UUID generator ──────────────────────────────── */
  function _uid() {
    return 'spk_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
  }

  /* ── Private: persist to localStorage ────────────────────── */
  function _save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[AgendaStore] Save failed:', e);
    }
  }

  /* ── Private: load from localStorage ─────────────────────── */
  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('[AgendaStore] Load failed, using defaults:', e);
    }
    // First run or corrupted data: seed with defaults and save
    _save(DEFAULT_AGENDA);
    return DEFAULT_AGENDA.map(function(s){ return Object.assign({}, s); });
  }

  /* ── Public: get all speakers (live copy) ─────────────────── */
  function getAll() {
    return _load();
  }

  /* ── Public: replace entire agenda (e.g. after reorder) ───── */
  function saveAll(speakers) {
    _save(speakers);
  }

  /* ── Public: add a new speaker ────────────────────────────── */
  function add(ownerStr, titleStr, minutes, mode) {
    var list = _load();
    var speaker = {
      id      : _uid(),
      owner   : ownerStr.trim(),
      title   : titleStr.trim(),
      seconds : Math.max(60, parseInt(minutes, 10) * 60),
      mode    : (mode === 'discussion') ? 'discussion' : 'presenter'
    };
    list.push(speaker);
    _save(list);
    return speaker;
  }

  /* ── Public: update an existing speaker by id ─────────────── */
  function update(id, ownerStr, titleStr, minutes, mode) {
    var list = _load();
    var found = false;
    list = list.map(function (s) {
      if (s.id !== id) return s;
      found = true;
      return {
        id      : s.id,
        owner   : ownerStr.trim(),
        title   : titleStr.trim(),
        seconds : Math.max(60, parseInt(minutes, 10) * 60),
        mode    : (mode === 'discussion') ? 'discussion' : 'presenter'
      };
    });
    if (found) _save(list);
    return found;
  }

  /* ── Public: delete a speaker by id ───────────────────────── */
  function remove(id) {
    var list = _load();
    var filtered = list.filter(function (s) { return s.id !== id; });
    _save(filtered);
    return filtered.length < list.length; // true if something was removed
  }

  /* ── Public: move item from fromIdx to toIdx ──────────────── */
  function reorder(fromIdx, toIdx) {
    var list = _load();
    if (fromIdx < 0 || fromIdx >= list.length) return;
    if (toIdx   < 0 || toIdx   >= list.length) return;
    if (fromIdx === toIdx) return;
    var moved = list.splice(fromIdx, 1)[0];
    list.splice(toIdx, 0, moved);
    _save(list);
  }

  /* ── Public: find speaker by id ───────────────────────────── */
  function getById(id) {
    return _load().find(function(s){ return s.id === id; }) || null;
  }

  /* ── Public: reset to factory defaults ────────────────────── */
  function resetToDefaults() {
    var fresh = DEFAULT_AGENDA.map(function(s){
      return Object.assign({}, s, { id: _uid() });
    });
    _save(fresh);
    return fresh;
  }

  /* ── Public: compute summary stats ───────────────────────── */
  function getStats() {
    var list = _load();
    var totalSeconds = list.reduce(function(acc, s){ return acc + s.seconds; }, 0);
    var presenterCount  = list.filter(function(s){ return s.mode !== 'discussion'; }).length;
    var discussionCount = list.filter(function(s){ return s.mode === 'discussion'; }).length;
    return {
      speakerCount    : list.length,
      totalSeconds    : totalSeconds,
      totalMinutes    : Math.ceil(totalSeconds / 60),
      presenterCount  : presenterCount,
      discussionCount : discussionCount
    };
  }

  /* Public API */
  return {
    getAll         : getAll,
    saveAll        : saveAll,
    add            : add,
    update         : update,
    remove         : remove,
    reorder        : reorder,
    getById        : getById,
    resetToDefaults: resetToDefaults,
    getStats       : getStats
  };

})();


/* ══════════════════════════════════════════════════════════════
   AdminUI
   ──────────────────────────────────────────────────────────────
   Handles all DOM interaction for admin.html.
   Depends on AgendaStore for all data operations.
══════════════════════════════════════════════════════════════ */
var AdminUI = (function () {

  /* ── State ─────────────────────────────────────────────────── */
  var _editingId    = null;   // id of speaker being edited, or null for add
  var _deletingId   = null;   // id of speaker pending delete confirmation
  var _dragFromIdx  = null;   // source row index during drag

  /* ── Helpers ───────────────────────────────────────────────── */
  function _el(id) { return document.getElementById(id); }

  function _pad2(n) { return String(n).padStart(2, '0'); }

  function _fmtMins(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return s === 0 ? m + ' min' : m + ':' + _pad2(s);
  }

  function _fmtClock(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return _pad2(m) + ':' + _pad2(s);
  }

  /* ── Toast ─────────────────────────────────────────────────── */
  function _toast(msg, type) {
    var zone  = _el('toast-zone');
    if (!zone) return;
    var div   = document.createElement('div');
    div.className = 'toast' + (type === 'ok' ? ' ok' : '');
    div.textContent = msg;
    zone.appendChild(div);
    setTimeout(function () {
      div.style.opacity = '0';
      div.style.transition = 'opacity 0.4s ease';
      setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 420);
    }, 2500);
  }

  /* ── Render summary strip ──────────────────────────────────── */
  function _renderSummary() {
    var strip = _el('summary-strip');
    if (!strip) return;
    var st = AgendaStore.getStats();
    strip.innerHTML =
      '<div class="s-chip">'        +
        '<span class="s-chip-label">Speakers</span>' +
        '<span class="s-chip-value">' + st.speakerCount + '</span>' +
      '</div>' +
      '<div class="s-chip accent">' +
        '<span class="s-chip-label">Total Time</span>' +
        '<span class="s-chip-value">' + st.totalMinutes + ' min</span>' +
      '</div>' +
      '<div class="s-chip">'        +
        '<span class="s-chip-label">Presenter</span>' +
        '<span class="s-chip-value">' + st.presenterCount + '</span>' +
      '</div>' +
      '<div class="s-chip">'        +
        '<span class="s-chip-label">Discussion</span>' +
        '<span class="s-chip-value">' + st.discussionCount + '</span>' +
      '</div>';
  }

  /* ── Render the speaker list ───────────────────────────────── */
  function _renderList() {
    var container = _el('speaker-list');
    if (!container) return;

    var speakers = AgendaStore.getAll();

    if (speakers.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<p>No speakers yet. Add the first one to get started.</p>' +
          '<button class="btn btn-primary" onclick="AdminUI.openAddModal()">+ Add Speaker</button>' +
        '</div>';
      _renderSummary();
      return;
    }

    container.innerHTML = '';

    speakers.forEach(function (spk, i) {
      var row = document.createElement('div');
      row.className = 'speaker-row col-grid';
      row.setAttribute('data-id',  spk.id);
      row.setAttribute('data-idx', i);
      row.draggable = true;

      var modeLabel = spk.mode === 'discussion' ? 'Discussion' : 'Presenter';
      var modeClass = spk.mode === 'discussion' ? 'discussion' : 'presenter';

      row.innerHTML =
        '<div class="drag-handle" title="Drag to reorder">&#8942;&#8942;</div>' +
        '<div class="row-num">'   + (i + 1) + '</div>' +
        '<div class="row-name">'  + _esc(spk.owner) + '</div>' +
        '<div class="row-topic">' + _esc(spk.title) + '</div>' +
        '<div class="row-time">'  + _fmtClock(spk.seconds) + '</div>' +
        '<div><span class="mode-chip ' + modeClass + '">' + modeLabel + '</span></div>' +
        '<div class="row-actions">' +
          '<button class="icon-btn" title="Edit"   onclick="AdminUI.openEditModal(\'' + spk.id + '\')">&#9998;</button>' +
          '<button class="icon-btn del" title="Delete" onclick="AdminUI.openDeleteModal(\'' + spk.id + '\')">&#10005;</button>' +
        '</div>';

      /* ── Drag-and-drop wiring ─────────────────────────────── */
      row.addEventListener('dragstart', function (e) {
        _dragFromIdx = parseInt(row.getAttribute('data-idx'), 10);
        row.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', function () {
        row.classList.remove('is-dragging');
        document.querySelectorAll('.speaker-row').forEach(function(r){
          r.classList.remove('drag-over');
        });
        _dragFromIdx = null;
      });
      row.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var toIdx = parseInt(row.getAttribute('data-idx'), 10);
        if (toIdx !== _dragFromIdx) row.classList.add('drag-over');
      });
      row.addEventListener('dragleave', function () {
        row.classList.remove('drag-over');
      });
      row.addEventListener('drop', function (e) {
        e.preventDefault();
        row.classList.remove('drag-over');
        var toIdx = parseInt(row.getAttribute('data-idx'), 10);
        if (_dragFromIdx !== null && _dragFromIdx !== toIdx) {
          AgendaStore.reorder(_dragFromIdx, toIdx);
          _renderAll();
          _toast('Order updated', 'ok');
        }
      });

      container.appendChild(row);
    });

    _renderSummary();
  }

  /* ── Render everything ─────────────────────────────────────── */
  function _renderAll() {
    _renderList();
    _renderSummary();
  }

  /* ── HTML escape ───────────────────────────────────────────── */
  function _esc(str) {
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  /* ── Open ADD modal ────────────────────────────────────────── */
  function openAddModal() {
    _editingId = null;
    _el('modal-heading').textContent   = 'Add Speaker';
    _el('field-id').value              = '';
    _el('field-owner').value           = '';
    _el('field-title').value           = '';
    _el('field-minutes').value         = '5';
    _el('opt-presenter').checked       = true;
    _el('form-error').textContent      = '';
    _el('form-error').classList.remove('visible');
    _el('edit-backdrop').classList.add('open');
    setTimeout(function(){ _el('field-owner').focus(); }, 120);
  }

  /* ── Open EDIT modal ───────────────────────────────────────── */
  function openEditModal(id) {
    var spk = AgendaStore.getById(id);
    if (!spk) return;
    _editingId = id;
    _el('modal-heading').textContent   = 'Edit Speaker';
    _el('field-id').value              = spk.id;
    _el('field-owner').value           = spk.owner;
    _el('field-title').value           = spk.title;
    _el('field-minutes').value         = Math.round(spk.seconds / 60);
    _el('opt-presenter').checked       = spk.mode !== 'discussion';
    _el('opt-discussion').checked      = spk.mode === 'discussion';
    _el('form-error').textContent      = '';
    _el('form-error').classList.remove('visible');
    _el('edit-backdrop').classList.add('open');
    setTimeout(function(){ _el('field-owner').focus(); }, 120);
  }

  /* ── Close edit/add modal ──────────────────────────────────── */
  function closeModal() {
    _el('edit-backdrop').classList.remove('open');
    _editingId = null;
  }

  /* ── Save form (add or edit) ───────────────────────────────── */
  function saveForm() {
    var owner   = _el('field-owner').value.trim();
    var title   = _el('field-title').value.trim();
    var minutes = parseInt(_el('field-minutes').value, 10);
    var mode    = document.querySelector('input[name="seg-mode"]:checked');
    var errEl   = _el('form-error');

    /* Validation */
    if (!owner) {
      _showFormError('Speaker name is required.'); return;
    }
    if (!title) {
      _showFormError('Topic / title is required.'); return;
    }
    if (isNaN(minutes) || minutes < 1 || minutes > 120) {
      _showFormError('Time must be between 1 and 120 minutes.'); return;
    }

    var modeVal = mode ? mode.value : 'presenter';

    if (_editingId) {
      AgendaStore.update(_editingId, owner, title, minutes, modeVal);
      _toast('Speaker updated', 'ok');
    } else {
      AgendaStore.add(owner, title, minutes, modeVal);
      _toast('Speaker added', 'ok');
    }

    closeModal();
    _renderAll();
  }

  function _showFormError(msg) {
    var errEl = _el('form-error');
    errEl.textContent = msg;
    errEl.classList.add('visible');
  }

  /* ── Open DELETE confirm modal ─────────────────────────────── */
  function openDeleteModal(id) {
    var spk = AgendaStore.getById(id);
    if (!spk) return;
    _deletingId = id;
    _el('del-name-label').textContent = spk.owner;
    _el('delete-backdrop').classList.add('open');
  }

  /* ── Close delete modal ────────────────────────────────────── */
  function closeDeleteModal() {
    _el('delete-backdrop').classList.remove('open');
    _deletingId = null;
  }

  /* ── Confirm delete ────────────────────────────────────────── */
  function confirmDelete() {
    if (!_deletingId) return;
    AgendaStore.remove(_deletingId);
    closeDeleteModal();
    _renderAll();
    _toast('Speaker removed');
  }

  /* ── Close modals on backdrop click ───────────────────────── */
  function _wireBackdropClose() {
    ['edit-backdrop', 'delete-backdrop'].forEach(function(id){
      var el = _el(id);
      if (!el) return;
      el.addEventListener('click', function(e){
        if (e.target === el) {
          el.classList.remove('open');
          _editingId  = null;
          _deletingId = null;
        }
      });
    });
  }

  /* ── Keyboard shortcut: Escape closes any open modal ────────── */
  function _wireKeyboard() {
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') {
        closeModal();
        closeDeleteModal();
      }
    });
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    _renderAll();
    _wireBackdropClose();
    _wireKeyboard();
  }

  /* Public API */
  return {
    init             : init,
    openAddModal     : openAddModal,
    openEditModal    : openEditModal,
    closeModal       : closeModal,
    saveForm         : saveForm,
    openDeleteModal  : openDeleteModal,
    closeDeleteModal : closeDeleteModal,
    confirmDelete    : confirmDelete
  };

})();
