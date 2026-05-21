import React from 'react'
import { NavLink } from 'react-router-dom'

/**
 * Sidebar
 * Dashboard navigation side pane. Uses `NavLink` for active states.
 */
export default function Sidebar() {
  return (
    <aside className="np-sidebar" aria-label="Dashboard navigation">
      <ul>
        <li>
          <NavLink to="/dashboard">Overview</NavLink>
        </li>
        <li>
          <NavLink to="/journal">Journal</NavLink>
        </li>
        <li>
          <NavLink to="/simulation">AI Twin</NavLink>
        </li>
        <li>
          <NavLink to="/">Home</NavLink>
        </li>
      </ul>
    </aside>
  )
}
