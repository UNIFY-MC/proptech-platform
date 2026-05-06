import { useState, useEffect } from 'react'

export default function BiaTOC({ sections }) {
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    if (!sections.length) return

    const scrollRoot = document.querySelector('.main-content')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      {
        root: scrollRoot,
        rootMargin: '-10% 0px -78% 0px',
        threshold: 0,
      }
    )

    sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [sections])

  function scrollTo(id) {
    const el = document.getElementById(id)
    const container = document.querySelector('.main-content')
    if (!el || !container) return

    // Scroll the container so the element is near the top
    const top = el.offsetTop - container.offsetTop - 24
    container.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <aside className="bia-toc">
      {sections.map(s => (
        <div
          key={s.id}
          className={`bia-toc-item${activeId === s.id ? ' active' : ''}`}
          onClick={() => scrollTo(s.id)}
        >
          {s.title}
        </div>
      ))}
    </aside>
  )
}
