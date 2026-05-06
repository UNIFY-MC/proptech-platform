import biaMeta from '../../../../.claude/employees/bia.meta.json'

export function useBiaMeta() {
  return {
    ...biaMeta,
    peer_reads: (biaMeta.peerReads || []).map(p => ({
      sprint: p.stage,
      agents: !p.value || p.value === '— none' ? [] : p.value.split(' + '),
    })),
  }
}
