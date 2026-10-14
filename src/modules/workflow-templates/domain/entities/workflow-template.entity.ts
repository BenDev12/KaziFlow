import { Entity } from '../../../../shared/domain/entity.base';
import { ValidationError } from '../../../../shared/domain/errors/domain-error';

/** One step in a template's pipeline — not its own collection; always read/written with its template. */
export interface WorkflowStageProps {
  id: string;
  name: string;
  departmentId: string;
  /** If true, the assignee's completion only marks it "awaiting_approval" — a manager of this stage's department (or org_admin) must separately approve it before the pipeline advances. */
  requiresApproval: boolean;
  /** Copied onto every task spawned at this stage as fresh, unchecked ChecklistItems. */
  checklistTemplate: string[];
  /**
   * Stage(s) to spawn as new, separate tasks once this stage is done — zero,
   * one, or several (fan-out: one approval can kick off multiple follow-ups
   * in different departments at once, not just a single linear hand-off).
   */
  nextStageIds: string[];
}

export interface WorkflowTemplateProps {
  orgId: string;
  name: string;
  entryStageId: string;
  stages: WorkflowStageProps[];
  createdAt: Date;
}

/**
 * An admin-defined SOP (e.g. "LPO Fulfillment", "Site Visit Request") — a
 * graph of stages, each tied to a department, that a Task instance walks
 * through. Tenant-scoped like any other domain resource (see
 * WorkflowTemplateRepository for the one deliberate exception).
 */
export class WorkflowTemplate extends Entity<WorkflowTemplateProps> {
  private constructor(props: WorkflowTemplateProps, id: string) {
    super(props, id);
  }

  static create(
    props: {
      orgId: string;
      name: string;
      entryStageId: string;
      stages: WorkflowStageProps[];
    },
    id: string,
  ): WorkflowTemplate {
    if (!props.name.trim()) throw new ValidationError('Template name is required');
    if (props.stages.length === 0) throw new ValidationError('A template needs at least one stage');

    const stageIds = new Set(props.stages.map((s) => s.id));
    if (stageIds.size !== props.stages.length) {
      throw new ValidationError('Stage ids must be unique within a template');
    }
    if (!stageIds.has(props.entryStageId)) {
      throw new ValidationError("entryStageId must match one of the template's stages");
    }
    for (const stage of props.stages) {
      if (!stage.name.trim()) throw new ValidationError('Every stage needs a name');
      for (const nextId of stage.nextStageIds) {
        if (!stageIds.has(nextId)) {
          throw new ValidationError(
            `Stage "${stage.name}" points to an unknown next stage "${nextId}"`,
          );
        }
      }
    }

    return new WorkflowTemplate(
      {
        orgId: props.orgId,
        name: props.name.trim(),
        entryStageId: props.entryStageId,
        stages: props.stages,
        createdAt: new Date(),
      },
      id,
    );
  }

  static reconstitute(props: WorkflowTemplateProps, id: string): WorkflowTemplate {
    return new WorkflowTemplate(props, id);
  }

  getStage(stageId: string): WorkflowStageProps | undefined {
    return this.props.stages.find((s) => s.id === stageId);
  }

  get orgId(): string {
    return this.props.orgId;
  }

  get name(): string {
    return this.props.name;
  }

  get entryStageId(): string {
    return this.props.entryStageId;
  }

  get stages(): WorkflowStageProps[] {
    return this.props.stages;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
