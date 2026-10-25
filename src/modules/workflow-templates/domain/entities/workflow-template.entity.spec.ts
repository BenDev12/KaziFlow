import { ValidationError } from '../../../../shared/domain/errors/domain-error';
import { WorkflowStageProps, WorkflowTemplate } from './workflow-template.entity';

function stage(id: string, nextStageIds: string[] = []): WorkflowStageProps {
  return {
    id,
    name: `Stage ${id}`,
    departmentId: 'dept-1',
    requiresApproval: false,
    checklistTemplate: [],
    nextStageIds,
    position: null,
  };
}

function createTemplate(): WorkflowTemplate {
  return WorkflowTemplate.create(
    {
      orgId: 'org-1',
      name: 'Order fulfilment',
      entryStageId: 'a',
      stages: [stage('a', ['b']), stage('b')],
    },
    'template-1',
  );
}

describe('WorkflowTemplate.update', () => {
  it('replaces the name, entry stage and the whole stage graph', () => {
    const template = createTemplate();

    template.update({
      name: '  Order fulfilment v2  ',
      entryStageId: 'c',
      stages: [{ ...stage('c', ['a']), position: { x: 10, y: 20 } }, stage('a')],
    });

    expect(template.name).toBe('Order fulfilment v2');
    expect(template.entryStageId).toBe('c');
    expect(template.stages.map((s) => s.id)).toEqual(['c', 'a']);
    expect(template.getStage('c')?.nextStageIds).toEqual(['a']);
    expect(template.getStage('c')?.position).toEqual({ x: 10, y: 20 });
    expect(template.getStage('b')).toBeUndefined();
  });

  it('rejects a connection to a stage that no longer exists, leaving the template unchanged', () => {
    const template = createTemplate();

    expect(() =>
      template.update({ name: 'Broken', entryStageId: 'a', stages: [stage('a', ['b'])] }),
    ).toThrow(ValidationError);
    expect(template.name).toBe('Order fulfilment');
    expect(template.stages).toHaveLength(2);
  });

  it('rejects an entry stage that is not one of the stages', () => {
    const template = createTemplate();

    expect(() =>
      template.update({ name: 'Order fulfilment', entryStageId: 'z', stages: [stage('a')] }),
    ).toThrow(ValidationError);
  });
});
