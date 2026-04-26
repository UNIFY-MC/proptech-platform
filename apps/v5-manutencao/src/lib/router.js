import { useState } from 'react'

/**
 * Minimal nav stack for V5.
 * App.jsx owns the actual ecra/tab/selNav state — this hook just tracks the
 * history so goBack() can restore the previous position.
 *
 * Usage in App.jsx:
 *   const nav = useNavStack()
 *   // when navigating forward:
 *   nav.push({ ecra, tab, selNav })
 *   setEcra(next); setSelNav(...)
 *   // when going back:
 *   const prev = nav.pop()
 *   if (prev) { setEcra(prev.ecra); setTab(prev.tab); setSelNav(prev.selNav) }
 *   else setEcra('home')
 *   // when switching tabs (reset history):
 *   nav.clear()
 */
export function useNavStack() {
  const [stack, setStack] = useState([])

  function push(entry) {
    setStack(prev => [...prev, entry])
  }

  // Returns the top entry AND removes it.
  // Must be called before the setEcra/setTab/setSelNav that restores the state.
  function pop() {
    const top = stack[stack.length - 1] || null
    setStack(prev => prev.slice(0, -1))
    return top
  }

  function peek() {
    return stack[stack.length - 1] || null
  }

  function clear() {
    setStack([])
  }

  return { stack, push, pop, peek, clear, depth: stack.length }
}
