/* Keep Yahoo's real table and its controls in place. The floating header is a
   visual copy whose controls delegate back to the corresponding original. */
const mountStickyPlayerTable = (() => {
  let current = null;
  return function mountStickyPlayerTable(table) {
    if (current?.table === table && current.header.isConnected && current.signature === table.tHead?.innerHTML) return;
    current?.destroy();
    const header = table?.tHead;
    const rows = header && Array.from(header.rows);
    const firstPlayer = table?.querySelector('tbody a[id^="playernote-"]')?.closest('td');
    const scroller = table?.parentElement;
    if (!header || rows.length !== 2 || !firstPlayer || !scroller) { current = null; return; }
    const playerIndex = firstPlayer.cellIndex;
    if (playerIndex !== 2 || rows[1].cells.length !== firstPlayer.parentElement.cells.length || rows[0].cells[0]?.colSpan !== 3) { current = null; return; }

    table.classList.add('fsc-sticky-table');
    const floating = document.createElement('div');
    floating.className = 'fsc-floating-header';
    floating.hidden = true;
    const copy = table.cloneNode(false);
    copy.removeAttribute('id');
    copy.setAttribute('aria-label', 'Player statistics');
    const copyHead = header.cloneNode(true);
    copyHead.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    copy.append(copyHead);
    floating.append(copy);
    document.body.append(floating);
    const originalCells = Array.from(rows[1].cells);
    const colgroup = document.createElement('colgroup');
    const cols = originalCells.map(() => document.createElement('col'));
    colgroup.append(...cols);
    copy.prepend(colgroup);

    function syncSize() {
      if (!table.isConnected) { destroy(); return; }
      const widths = originalCells.map(cell => cell.getBoundingClientRect().width);
      cols.forEach((col, i) => { col.style.width = `${widths[i]}px`; });
      copy.style.width = `${table.getBoundingClientRect().width}px`;
      const offset1 = widths[0];
      const offset2 = widths[0] + widths[1];
      for (const el of [table, copy]) {
        el.style.setProperty('--fsc-left-one', `${offset1}px`);
        el.style.setProperty('--fsc-left-two', `${offset2}px`);
      }
      syncPosition();
    }
    function syncPosition() {
      if (!table.isConnected) { destroy(); return; }
      const rect = scroller.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const headRect = header.getBoundingClientRect();
      const visible = headRect.top < 0 && tableRect.bottom > headRect.height && rect.width > 0;
      floating.hidden = !visible;
      if (!visible) return;
      floating.style.left = `${rect.left + scroller.clientLeft}px`;
      floating.style.width = `${scroller.clientWidth}px`;
      floating.scrollLeft = scroller.scrollLeft;
    }
    copyHead.addEventListener('click', event => {
      const cell = event.target.closest('th,td');
      const row = cell?.parentElement;
      if (!cell || !row) return;
      const realCell = rows[row.rowIndex]?.cells[cell.cellIndex];
      if (!realCell) return;
      const action = event.target.closest('a,button');
      if (action) {
        const candidates = Array.from(cell.querySelectorAll('a,button'));
        const realAction = realCell.querySelectorAll('a,button')[candidates.indexOf(action)];
        if (realAction) { event.preventDefault(); realAction.click(); return; }
      }
      realCell.click();
    });
    const resize = new ResizeObserver(syncSize);
    resize.observe(table);
    resize.observe(scroller);
    resize.observe(header);
    window.addEventListener('scroll', syncPosition, {passive:true});
    window.addEventListener('resize', syncSize, {passive:true});
    scroller.addEventListener('scroll', syncPosition, {passive:true});
    function destroy() {
      resize.disconnect();
      window.removeEventListener('scroll', syncPosition);
      window.removeEventListener('resize', syncSize);
      scroller.removeEventListener('scroll', syncPosition);
      table.classList.remove('fsc-sticky-table');
      floating.remove();
      if (current?.table === table) current = null;
    }
    current = {table, header, destroy, signature: header.innerHTML};
    syncSize();
  };
})();
