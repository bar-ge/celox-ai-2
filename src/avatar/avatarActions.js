// TCEL-062 — navigation action handler. Maps an LLM-returned actionId to an
// in-app tab switch. This app has no router (App.jsx does its own top-level
// URL branching, but the fleet manager itself navigates via activeTab state),
// so "navigation" here means calling setActiveTab, not history.push.

// TCEL-019/anchors must match the real tab ids in fleet-manager.jsx's `tabs` array.
export const NAV_ACTIONS = {
  go_dashboard:     'dashboard',
  go_cars:          'cars',
  go_fleet:         'cars',
  go_drivers:       'drivers',
  go_branches:      'branches',
  go_costs:         'costs',
  go_violations:    'violations',
  go_integrations:  'integrations',
  go_reports:       'reports',
  go_settings:      'settings',
}

/**
 * @param {string} actionId
 * @param {(tab: string) => void} setActiveTab
 * @returns {boolean} whether the actionId was recognized
 */
export function runNavAction(actionId, setActiveTab) {
  const tab = NAV_ACTIONS[actionId]
  if (!tab) return false
  setActiveTab(tab)
  return true
}
