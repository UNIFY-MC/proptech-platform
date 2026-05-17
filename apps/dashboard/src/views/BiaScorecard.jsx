// BiaScorecard — wrapper de retrocompatibilidade
// A lógica real mudou para EmployeeScorecardPage (genérico para 26 agentes).
// Esta view existe apenas para manter a rota /employees/bia a funcionar.

import EmployeeScorecardPage from './EmployeeScorecardPage.jsx'

export default function BiaScorecard() {
  return <EmployeeScorecardPage agentId="bia" />
}
