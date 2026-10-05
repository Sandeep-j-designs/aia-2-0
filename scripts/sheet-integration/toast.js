/* Builds the Tost component's shape: a status circle, then the title with an
   optional subtitle under it. `msg` may carry the subtitle after a newline,
   which is how the existing callers can gain one without being rewritten. */
const TOAST_GLYPH = {ok:'i-tick', err:'i-info', warn:'i-info'};
function toastEl(msg,kind=''){
  const el = document.createElement('div');
  el.className = 'toast'+(kind?' toast--'+kind:'');

  const icon = document.createElement('span');
  icon.className = 'toast__icon';
  icon.innerHTML =
    `<svg aria-hidden="true"><use href="#${TOAST_GLYPH[kind]||'i-info'}"/></svg>`;
  el.append(icon);

  const [title,...rest] = String(msg).split('\n');
  const body = document.createElement('div');
  body.className = 'toast__body';
  const t = document.createElement('p');
  t.className = 'toast__ttl'; t.textContent = title;
  body.append(t);
  if(rest.length){
    const s = document.createElement('p');
    s.className = 'toast__sub'; s.textContent = rest.join(' ');
    body.append(s);
  }
  el.append(body);
  return el;
}
function toast(msg,kind=''){
  const el = toastEl(msg,kind);
  $('#toasts').append(el);
  setTimeout(()=>el.remove(),3600);
  return el;
}

/* A toast with a way back out of what it is reporting. It lives longer than a
   plain one, because a notice you are meant to act on and a notice you are
   meant to read cannot be given the same three seconds — and §8 leaves the
   window open, so it is one number, named, in one place.

   Pressing it removes the toast first and acts second: an undo that leaves its
   own offer on screen invites being pressed twice. */
const TOAST_UNDO_MS = 12000;
function toastAction(msg,label,fn,kind='ok'){
  const el = toastEl(msg,kind);
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'toast__act';
  /* The component draws a glyph beside this word, but the glyph it draws is
     undo-2 and the word it draws is "Undo". The only caller here offers
     "Create all N", which no arrow describes, so the chip is the word alone.
     DEV: adding a genuine undo toast means adding an undo-2 symbol to the
     sprite and pairing it here — a chevron standing in for it would read as
     "next", which is the opposite of what the button does. */
  b.append(document.createTextNode(label));
  b.addEventListener('click',()=>{ el.remove(); fn(); });
  el.append(b);
  $('#toasts').append(el);
  setTimeout(()=>el.remove(),TOAST_UNDO_MS);
  return el;
}

