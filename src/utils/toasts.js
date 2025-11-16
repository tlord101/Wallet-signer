export function ensureContainer() {
  let c = document.getElementById('toastContainer')
  if (!c) {
    c = document.createElement('div')
    c.id = 'toastContainer'
    document.body.appendChild(c)
  }
  return c
}

export default function showToast(type = 'info', title = '', subtitle = '', duration = 4500) {
  const container = ensureContainer()

  const toast = document.createElement('div')
  toast.className = `toast toast-enter ${type}`

  const icon = document.createElement('div')
  icon.className = 't-icon'
  // basic inline svg icons per type
  if (type === 'success') {
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  } else if (type === 'error') {
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  } else {
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2"/></svg>`
  }

  const body = document.createElement('div')
  body.className = 't-body'
  const t = document.createElement('div')
  t.className = 't-title'
  t.textContent = title
  const s = document.createElement('div')
  s.className = 't-sub'
  s.textContent = subtitle

  body.appendChild(t)
  if (subtitle) body.appendChild(s)

  toast.appendChild(icon)
  toast.appendChild(body)

  container.prepend(toast)

  let hideTimer = null
  const remove = () => {
    toast.classList.remove('toast-enter')
    toast.classList.add('toast-exit')
    clearTimeout(hideTimer)
    setTimeout(() => { try { toast.remove() } catch(e){} }, 300)
  }

  hideTimer = setTimeout(remove, duration)

  // allow manual dismiss on click
  toast.addEventListener('click', () => remove())

  return { remove }
}
