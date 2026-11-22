// Fernhollow (Lens Lab) interactions. Fernhollow is fictional. Some behaviours below are deliberately flawed; see ISSUES.md.
(function () {
  'use strict';

  // Kitchen display: the "Dark mode" button switches the dark theme with an attribute on <html> (ISSUES.md D-06: no prefers-color-scheme rule).
  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
      if (dark) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    });
  }

  // Date-range and view toggles: buttons with aria-pressed that show one panel at a time.
  document.querySelectorAll('[data-toggle-group]').forEach(function (group) {
    var buttons = group.querySelectorAll('button[data-panel]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) {
          var on = b === btn;
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          var panel = document.getElementById(b.getAttribute('data-panel'));
          if (panel) panel.hidden = !on;
        });
      });
    });
  });

  // Schedule: filter shifts by role.
  var roleFilter = document.getElementById('role-filter');
  if (roleFilter) {
    var status = document.getElementById('role-filter-status');
    var apply = function () {
      var shown = 0;
      document.querySelectorAll('.shift[data-role]').forEach(function (el) {
        var visible = roleFilter.value === 'all' || el.getAttribute('data-role') === roleFilter.value;
        el.hidden = !visible;
        if (visible) shown += 1;
      });
      if (status) status.textContent = 'Showing ' + shown + ' shifts.';
    };
    roleFilter.addEventListener('change', apply);
  }

  // Time off: approve or decline a request.
  document.querySelectorAll('button[data-decision]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('tr');
      var cell = row && row.querySelector('[data-status]');
      var decision = btn.getAttribute('data-decision');
      if (cell) cell.textContent = decision;
      var live = document.getElementById('decision-status');
      if (live) live.textContent = 'Request for ' + row.getAttribute('data-person') + ' marked ' + decision.toLowerCase() + '.';
    });
  });

  // Notifications: mark all as read.
  var markAll = document.getElementById('mark-all-read');
  if (markAll) {
    markAll.addEventListener('click', function () {
      document.querySelectorAll('.notice-list li[data-unread="true"]').forEach(function (li) {
        li.setAttribute('data-unread', 'false');
        var tag = li.querySelector('.unread-tag');
        if (tag) tag.remove();
      });
      var live = document.getElementById('notice-status');
      if (live) live.textContent = 'All notifications marked as read.';
    });
  }

  // S-23 (deliberate): tooltips that appear only on mouse hover. No focus or keyboard access,
  // and the values they show are not available anywhere else on the page.
  document.querySelectorAll('[data-hover-tip]').forEach(function (wrap) {
    var tip = wrap.querySelector('.chart-tip');
    wrap.querySelectorAll('[data-tip]').forEach(function (point) {
      point.addEventListener('mouseenter', function () {
        var box = wrap.getBoundingClientRect();
        var p = point.getBoundingClientRect();
        tip.textContent = point.getAttribute('data-tip');
        tip.hidden = false;
        tip.style.left = Math.max(0, p.left - box.left - 40) + 'px';
        tip.style.top = Math.max(0, p.top - box.top - 36) + 'px';
      });
      point.addEventListener('mouseleave', function () { tip.hidden = true; });
    });
  });

  // S-26 (deliberate): funnel steps are divs with a click handler. They cannot be reached
  // or activated with the keyboard.
  window.showFunnelStep = function (step) {
    var detail = document.getElementById('funnel-detail');
    if (detail) detail.textContent = step.getAttribute('data-detail');
  };
})();
