// Shared placemat behaviour. Storage keys are derived per agent from
// <html data-agent="…">; theme/density are deliberately shared origin-wide (D6).
const AGENT = document.documentElement.dataset.agent || 'agent';
const LS_SEEN = 'pm-' + AGENT + '-seen-version';
const LS_COLLAPSED = 'pm-' + AGENT + '-collapsed';

// --- THEME TOGGLE LOGIC ---
function setThemeIcon(theme) {
    const btn = document.getElementById('themeBtn');
    if (btn) btn.innerHTML = theme === 'dark' ? '&#9728;&#65039;' : '&#127769;';
}
function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('placemat-theme', next);
    setThemeIcon(next);
}
setThemeIcon(document.documentElement.dataset.theme);

// --- CLICK TO COPY LOGIC (mouse + keyboard) ---
function makeCopyable(el, getText) {
    el.title = "Click to copy";
    el.tabIndex = -1;
    el.setAttribute('role', 'button');
    el.addEventListener('click', () => copyText(el, getText()));
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            copyText(el, getText());
        }
    });
}

document.querySelectorAll('code').forEach(el => {
    makeCopyable(el, () => el.innerText);
});

async function copyText(element, text) {
    try {
        await navigator.clipboard.writeText(text);
        element.classList.add('copied');
        setTimeout(() => element.classList.remove('copied'), 300);
    } catch (err) { console.error('Failed to copy: ', err); }
}

// --- HIERARCHICAL SEARCH LOGIC ---
const searchInput = document.getElementById('dashboardSearch');

// --- COLLAPSIBLE GROUPS (counts computed at load; folded state remembered) ---
const groupEls = Array.from(document.querySelectorAll('details.search-group'));
const COLLAPSED_KEY = LS_COLLAPSED;
let collapsedGroups = new Set();
try { collapsedGroups = new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]')); } catch (err) {}

function saveCollapsed() {
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Array.from(collapsedGroups))); } catch (err) {}
}

groupEls.forEach((group) => {
    group.querySelector('.group-count').textContent = group.querySelectorAll('.search-item').length;
    group.open = !collapsedGroups.has(group.dataset.group);
    group.addEventListener('toggle', () => {
        if (searchInput.value.trim()) return; // search-driven opens are temporary
        group.open ? collapsedGroups.delete(group.dataset.group) : collapsedGroups.add(group.dataset.group);
        saveCollapsed();
    });
});

function applyGroupState(term) {
    groupEls.forEach((group) => { group.open = term ? true : !collapsedGroups.has(group.dataset.group); });
}

// --- FIXED BAR HEIGHTS: measured so the header and nav always clear each other ---
(function trackBarHeights() {
    const header = document.querySelector('.global-header');
    const nav = document.querySelector('.section-nav');
    const sync = () => {
        document.documentElement.style.setProperty('--header-h', Math.round(header.offsetHeight) + 'px');
        document.documentElement.style.setProperty('--nav-h', Math.round(nav.offsetHeight) + 'px');
    };
    sync();
    if (typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(sync);
        observer.observe(header);
        observer.observe(nav);
    }
    window.addEventListener('resize', sync);
})();

// --- SECTION NAV: counts, active chip, collapse/expand all ---
const navChips = Array.from(document.querySelectorAll('.section-chips a'));
navChips.forEach((chip) => {
    const card = document.getElementById(chip.dataset.target);
    if (!card) return;
    const count = card.querySelectorAll('.search-item').length;
    chip.querySelector('.chip-count').textContent = count;
    card.querySelector('.card-count').textContent = count;
});
const cardObserver = new IntersectionObserver((entries) => {
    const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top)
            || (a.boundingClientRect.left - b.boundingClientRect.left));
    if (!visible.length) return;
    navChips.forEach((chip) => chip.classList.toggle('is-active', chip.dataset.target === visible[0].target.id));
}, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });
navChips.forEach((chip) => {
    const card = document.getElementById(chip.dataset.target);
    if (card) cardObserver.observe(card);
});

function setAllGroups(open) {
    collapsedGroups = new Set(open ? [] : groupEls.map((group) => group.dataset.group));
    saveCollapsed();
    groupEls.forEach((group) => { group.open = open; });
}
document.getElementById('printBtn').addEventListener('click', () => window.print());
document.getElementById('collapseAll').addEventListener('click', () => setAllGroups(false));
document.getElementById('expandAll').addEventListener('click', () => setAllGroups(true));

// --- DENSITY TOGGLE ---
(function initDensity() {
    const DENSITY_KEY = 'placemat-density';
    const btn = document.getElementById('densityBtn');
    const apply = (compact) => {
        document.body.classList.toggle('density-compact', compact);
        btn.setAttribute('aria-pressed', String(compact));
    };
    let compact = false;
    try { compact = localStorage.getItem(DENSITY_KEY) === 'compact'; } catch (err) {}
    apply(compact);
    btn.addEventListener('click', () => {
        compact = !compact;
        apply(compact);
        try { localStorage.setItem(DENSITY_KEY, compact ? 'compact' : 'comfortable'); } catch (err) {}
    });
})();

searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
    applyGroupState(e.target.value.trim());
    revealNoteHits(e.target.value);
});

const searchKbd = document.getElementById('searchKbd');
if (searchKbd && !/mac/i.test(navigator.platform || navigator.userAgentData?.platform || '')) {
    searchKbd.textContent = 'Ctrl K';
}

window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); searchInput.focus();
    }
});

// --- TWO-TIER ENTRIES: notes disclosure ---
const noteButtons = Array.from(document.querySelectorAll('.notes-btn'));
const setNotes = (btn, open) => {
    btn.setAttribute('aria-expanded', String(open));
    btn.nextElementSibling.hidden = !open;
};
noteButtons.forEach((btn) => btn.addEventListener('click', () => setNotes(btn, btn.getAttribute('aria-expanded') !== 'true')));
const notesAllBtn = document.getElementById('notesAll');
notesAllBtn.addEventListener('click', () => {
    const open = notesAllBtn.getAttribute('aria-pressed') !== 'true';
    notesAllBtn.setAttribute('aria-pressed', String(open));
    notesAllBtn.textContent = open ? 'Hide all notes' : 'Show all notes';
    noteButtons.forEach((btn) => setNotes(btn, open));
});
function revealNoteHits(term) {
    const needle = term.toLowerCase().trim();
    if (!needle) return;
    noteButtons.forEach((btn) => {
        const row = btn.closest('.search-item');
        const outside = (row.querySelector('td').textContent + ' ' + row.querySelector('.summary').textContent).toLowerCase().includes(needle);
        const inside = btn.nextElementSibling.textContent.toLowerCase().includes(needle);
        if (inside && !outside) setNotes(btn, true);
    });
}

// --- SEARCH: normalised match, highlight, count, URL state ---
const normaliseSearch = (s) => s.toLowerCase().replace(/[\s+_\-\/.:~]/g, '');
const searchRows = Array.from(document.querySelectorAll('.search-item'));
searchRows.forEach((row) => {
    const heading = row.closest('.search-group').querySelector('h3');
    row.dataset.norm = normaliseSearch((heading ? heading.textContent + ' ' : '') + row.textContent);
});
const searchWrap = document.querySelector('.search-wrap');
const searchCount = document.getElementById('searchCount');

function markHits(cell, term) {
    cell.querySelectorAll('mark.hit').forEach((mark) => mark.replaceWith(mark.textContent));
    cell.normalize();
    if (!term || term.length < 2) return;
    // Tolerate the separators the normaliser strips: "ctrl+r" matches "Ctrl R".
    const chars = term.split('')
        .filter((ch) => !/[\s+_\-\/.:~]/.test(ch))
        .map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!chars.length) return;
    const re = new RegExp(chars.join('[\\s+_\\-\\/.:~]*'), 'i');
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
        if (node.parentElement.closest('a.row-link')) return;
        const found = node.data.match(re);
        if (!found || !found[0]) return;
        const mark = document.createElement('mark');
        mark.className = 'hit';
        const after = node.splitText(found.index);
        after.data = after.data.slice(found[0].length);
        mark.textContent = found[0];
        node.parentNode.insertBefore(mark, after);
    });
}

function performSearch(raw) {
    const term = raw.trim();
    const needle = normaliseSearch(term);
    let total = 0;
    document.querySelectorAll('.dashboard-grid .card:not(.search-exclude)').forEach((card) => {
        let cardHasMatch = false;
        card.querySelectorAll('.search-group').forEach((group) => {
            let groupHasMatch = false;
            group.querySelectorAll('.search-item').forEach((row) => {
                const hit = !needle || row.dataset.norm.includes(needle);
                row.style.display = hit ? 'table-row' : 'none';
                row.querySelectorAll('td').forEach((cell) => markHits(cell, hit ? term : ''));
                if (hit) { groupHasMatch = true; total++; }
            });
            group.style.display = groupHasMatch ? 'block' : 'none';
            if (groupHasMatch) cardHasMatch = true;
        });
        card.style.display = cardHasMatch ? 'block' : 'none';
    });
    document.getElementById('noResults').classList.toggle('is-visible', total === 0);
    searchWrap.classList.toggle('has-term', !!needle);
    searchCount.textContent = total + (total === 1 ? ' match' : ' matches');
    const url = new URL(location.href);
    if (needle) url.searchParams.set('q', term); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    rebindRoving();
}

const initialQuery = new URLSearchParams(location.search).get('q');
if (initialQuery) { searchInput.value = initialQuery; performSearch(initialQuery); applyGroupState(initialQuery.trim()); revealNoteHits(initialQuery); }

window.addEventListener('keydown', (e) => {
    const inField = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (e.key === '/' && !inField) { e.preventDefault(); searchInput.focus(); searchInput.select(); }
    if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.blur();
    }
});

// --- PERMALINKS ---
document.querySelectorAll('.row-link').forEach((link) => {
    link.addEventListener('click', async (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        try {
            await navigator.clipboard.writeText(location.origin + location.pathname + href);
        } catch (err) { console.error('Failed to copy link:', err); }
        history.replaceState(null, '', href);
        link.classList.add('copied');
        link.textContent = '✓';
        setTimeout(() => { link.classList.remove('copied'); link.textContent = '#'; }, 900);
    });
});
if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({ block: 'center' });
}

// --- ROVING FOCUS: the grid is one tab stop ---
function visibleRows() {
    return searchRows.filter((row) => row.style.display !== 'none' && row.closest('.card').style.display !== 'none');
}
function rebindRoving() {
    const rows = visibleRows();
    searchRows.forEach((row) => { row.tabIndex = -1; });
    if (rows[0]) rows[0].tabIndex = 0;
}
rebindRoving();
document.querySelector('.dashboard-grid').addEventListener('keydown', (e) => {
    const row = e.target.closest('.search-item');
    if (!row || e.target !== row) return;
    const rows = visibleRows();
    const index = rows.indexOf(row);
    const move = (next) => {
        if (!next) return;
        e.preventDefault();
        row.tabIndex = -1;
        next.tabIndex = 0;
        next.focus();
    };
    if (e.key === 'ArrowDown') move(rows[index + 1]);
    if (e.key === 'ArrowUp') move(rows[index - 1]);
    if (e.key === 'Enter') {
        e.preventDefault();
        const chip = row.querySelector('code');
        if (chip) copyText(chip, chip.innerText);
    }
    if (e.key === 'l') {
        const link = row.querySelector('.row-link');
        if (link) link.click();
    }
});
searchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown') return;
    const rows = visibleRows();
    if (rows[0]) { e.preventDefault(); rows[0].focus(); }
});

// --- SINCE YOUR LAST VISIT ---
const versionNumber = (v) => v.replace(/^v/, '').split('.').map(Number).reduce((a, b) => a * 1000 + b, 0);
(async function initSince() {
    const SEEN_KEY = LS_SEEN;
    const current = (document.querySelector('.release-tag').textContent.match(/v[\d.]+/) || [])[0];
    if (!current) return;
    let data;
    try {
        const res = await fetch('changes.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data = await res.json();
    } catch (err) {
        console.warn('changes.json unavailable:', err.message);
        return;
    }

    const tagClass = { ADD: 'tag-add', CHG: 'tag-change', DEL: 'tag-remove', FIX: 'tag-fix' };
    const rows = Array.from(document.querySelectorAll('.search-item'));
    const byCode = new Map();
    rows.forEach((row) => row.querySelectorAll('td:first-child code').forEach((chip) => {
        const key = chip.innerText.trim();
        if (!byCode.has(key)) byCode.set(key, row);
    }));
    const findRow = (entry) => {
        if (entry.row) return document.getElementById(entry.row);
        const item = entry.item;
        if (!item) return null;
        if (byCode.has(item)) return byCode.get(item);
        for (const [key, row] of byCode) if (key.startsWith(item + ' ') || key.startsWith(item + '=')) return row;
        for (const [key, row] of byCode) if (key.includes(item)) return row;
        return null;
    };

    const strip = document.getElementById('sinceStrip');
    const text = document.getElementById('sinceText');
    const drawer = document.getElementById('sinceDrawer');
    const body = document.getElementById('sinceBody');
    const title = document.getElementById('sinceDrawerTitle');
    const legend = document.getElementById('legendNew');

    function render() {
        let seen = null;
        try { seen = localStorage.getItem(SEEN_KEY); } catch (err) {}
        rows.forEach((row) => row.querySelectorAll('td:first-child code.new').forEach((chip) => chip.classList.remove('new')));

        let releases;
        if (!seen) releases = data.releases.slice(0, 3);
        else if (versionNumber(seen) < versionNumber(current)) {
            releases = data.releases.filter((rel) => versionNumber(rel.version) > versionNumber(seen)
                && versionNumber(rel.version) <= versionNumber(current));
        } else releases = [];

        const changes = releases.reduce((sum, rel) => sum + rel.entries.length, 0);
        legend.textContent = seen ? 'New since your last visit (' + seen + ')' : 'New in the last 3 releases';
        if (!changes) { strip.hidden = true; drawer.hidden = true; return; }

        const linked = new Set();
        releases.forEach((rel) => rel.entries.forEach((entry) => {
            const row = findRow(entry);
            if (row) { row.querySelector('td:first-child code').classList.add('new'); linked.add(row); }
        }));
        text.innerHTML = seen
            ? '<b>' + releases.length + (releases.length === 1 ? ' release' : ' releases') + ' · ' + changes
                + (changes === 1 ? ' change' : ' changes') + '</b> since your last visit <code>' + seen
                + '</code> → <code>' + current + '</code>; ' + linked.size + ' entries highlighted below'
            : '<b>Welcome.</b> ' + changes + ' changes across the last ' + releases.length
                + ' releases are highlighted; next time you will see only what changed since today';
        strip.hidden = false;
        title.textContent = seen ? 'Since ' + seen : 'Recent changes';
        body.innerHTML = releases.map((rel) =>
            '<section class="since-release"><h3>CC ' + rel.label + ' <span>' + rel.date + '</span></h3><ul>'
            + rel.entries.map((entry) => {
                const row = findRow(entry);
                return '<li' + (row ? ' data-row="' + row.id + '"' : ' class="unlinked"') + '><span class="tag '
                    + (tagClass[entry.tag] || 'tag-add') + '">' + entry.tag + '</span><span>' + entry.html + '</span></li>';
            }).join('') + '</ul></section>').join('');
    }
    render();

    const markRead = () => {
        try { localStorage.setItem(SEEN_KEY, current); } catch (err) {}
        render();
    };
    document.getElementById('sinceShow').addEventListener('click', () => {
        drawer.hidden = false;
        document.getElementById('sinceClose').focus();
    });
    document.getElementById('sinceClose').addEventListener('click', () => { drawer.hidden = true; });
    document.getElementById('sinceRead').addEventListener('click', markRead);
    document.getElementById('sinceReadAll').addEventListener('click', markRead);
    body.addEventListener('click', (e) => {
        const item = e.target.closest('li[data-row]');
        if (!item) return;
        const row = document.getElementById(item.dataset.row);
        if (!row) return;
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        row.classList.remove('flash');
        void row.offsetWidth;
        row.classList.add('flash');
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) drawer.hidden = true; });
})();
