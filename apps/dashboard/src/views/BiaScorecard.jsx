import { useBiaMeta }         from '../hooks/useBiaMeta'
import { useBiaInstructions } from '../hooks/useBiaInstructions'
import { useBiaStats }        from '../hooks/useBiaStats'
import BiaHeader              from '../components/bia/BiaHeader'
import BiaStats               from '../components/bia/BiaStats'
import BiaInstructions        from '../components/bia/BiaInstructions'
import BiaIntegrations        from '../components/bia/BiaIntegrations'

export default function BiaScorecard() {
  const meta         = useBiaMeta()
  const instructions = useBiaInstructions()
  const { stats, loading: statsLoading } = useBiaStats()

  const isEditing = instructions.mode === 'edit'

  return (
    <div className="bia-scorecard">
      <BiaHeader meta={meta} isEditing={isEditing} />

      <BiaStats
        stats={stats}
        loading={statsLoading}
        dimmed={isEditing}
      />

      <BiaInstructions {...instructions} />

      {!isEditing && (
        <BiaIntegrations integrations={meta.integrations} />
      )}
    </div>
  )
}
