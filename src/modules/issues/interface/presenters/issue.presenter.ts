import { Issue } from '../../domain/entities/issue.entity';

export function toIssueResponse(issue: Issue) {
  return {
    id: issue.id,
    clientId: issue.clientId,
    clientName: issue.clientName,
    agentId: issue.agentId,
    agentName: issue.agentName,
    departmentId: issue.departmentId,
    description: issue.description,
    visitNote: issue.visitNote,
    activityLogId: issue.activityLogId,
    status: issue.status,
    resolutionNote: issue.resolutionNote,
    resolvedById: issue.resolvedById,
    resolvedByName: issue.resolvedByName,
    resolvedAt: issue.resolvedAt,
    createdAt: issue.createdAt,
  };
}
