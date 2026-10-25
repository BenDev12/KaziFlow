import { NextStagePreview } from '../../application/services/task-workflow-preview.service';
import { Task } from '../../domain/entities/task.entity';

export function toTaskResponse(task: Task, nextStages: NextStagePreview[] | null) {
  return {
    id: task.id,
    clientId: task.clientId,
    clientName: task.clientName,
    agentId: task.agentId,
    agentName: task.agentName,
    departmentId: task.departmentId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    priority: task.priority,
    source: task.source,
    activityLogId: task.activityLogId,
    status: task.status,
    templateId: task.templateId,
    stageId: task.stageId,
    requiresApproval: task.requiresApproval,
    checklistItems: task.checklistItems,
    assignedToUserId: task.assignedToUserId,
    assignedToName: task.assignedToName,
    links: task.links,
    notes: task.notes,
    history: task.history,
    parentTaskId: task.parentTaskId,
    submittedForApprovalById: task.submittedForApprovalById,
    submittedForApprovalByName: task.submittedForApprovalByName,
    submittedForApprovalAt: task.submittedForApprovalAt,
    completedById: task.completedById,
    completedByName: task.completedByName,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    // Where this hands off to once finished, if it's a pending/awaiting
    // workflow stage with a next stage — null otherwise (plain task, or
    // nothing further to spawn). See TaskWorkflowPreviewService.
    nextStages,
  };
}
