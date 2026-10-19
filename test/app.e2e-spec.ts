import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type {
  EmailService,
  SendInviteEmailInput,
  SendPasswordResetEmailInput,
} from '../src/modules/iam/application/ports/email.port';

/** Records invite emails instead of calling the real Resend API during tests. */
class FakeEmailService implements EmailService {
  public sent: SendInviteEmailInput[] = [];

  async sendInviteEmail(input: SendInviteEmailInput): Promise<void> {
    this.sent.push(input);
  }

  async sendPasswordResetEmail(_input: SendPasswordResetEmailInput): Promise<void> {}
}

/**
 * Exercises the real signup -> onboarding -> client -> activity -> issue ->
 * resolve flow end-to-end against an in-memory Mongo instance, then proves
 * the core multi-tenancy guarantee: a second organization's token can never
 * read the first organization's data.
 */
describe('Field Tracker API (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let fakeEmailService: FakeEmailService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = mongod.getUri();
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-must-be-at-least-32-chars';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-must-be-at-least-32-chars';
    process.env.JWT_ACCESS_TTL = '15m';
    process.env.JWT_REFRESH_TTL = '7d';
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.EMAIL_FROM = 'onboarding@resend.dev';

    // Dynamic imports, not static top-of-file ones: AppModule's `@Module({
    // imports: [ConfigModule.forRoot({ validate })] })` decorator evaluates
    // its arguments — including validate(process.env) — the instant the
    // module is imported. A static import gets hoisted above this env setup
    // by the module loader, so validation would run against an empty env.
    const { AppModule } = await import('../src/app.module');
    const { DomainExceptionFilter } =
      await import('../src/shared/infrastructure/filters/domain-exception.filter');
    const { EMAIL_SERVICE } = await import('../src/modules/iam/application/ports/email.port');

    fakeEmailService = new FakeEmailService();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EMAIL_SERVICE)
      .useValue(fakeEmailService)
      .compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  function extractCookies(res: request.Response): string[] {
    const setCookie = res.headers['set-cookie'];
    if (!setCookie) return [];
    return (Array.isArray(setCookie) ? setCookie : [setCookie]).map((c) => c.split(';')[0]);
  }

  /** Display-only decode (no signature check needed — this is the test's own just-issued token) to get a user's id for assertions. */
  function userIdFromCookies(cookies: string[]): string {
    const accessCookie = cookies.find((c) => c.startsWith('access_token='));
    const token = accessCookie!.split('=')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload.sub as string;
  }

  async function signupAndOnboard(email: string, orgName: string) {
    const signupRes = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send({ email, password: 'super-secret-1', name: 'Test Agent' })
      .expect(201);

    let cookies = extractCookies(signupRes);

    const orgRes = await request(app.getHttpServer())
      .post('/v1/org')
      .set('Cookie', cookies)
      .send({
        name: orgName,
        domain: `${orgName.toLowerCase()}.example.com`,
        industry: 'Retail',
        timezone: 'UTC',
      })
      .expect(200);

    cookies = extractCookies(orgRes);
    return { cookies, orgId: orgRes.body.orgId as string };
  }

  it('walks the full visit -> issue -> resolve flow within a single tenant', async () => {
    const { cookies } = await signupAndOnboard('org-a-owner@example.com', 'OrgA');

    const clientRes = await request(app.getHttpServer())
      .post('/v1/clients')
      .set('Cookie', cookies)
      .send({
        name: 'Acme Dental',
        contact: 'Jane Dentist',
        phone: '555-0100',
        callCycle: 'Weekly',
        address: '1 Main St',
      })
      .expect(201);

    const clientId = clientRes.body.id as string;
    expect(clientRes.body.overdue).toBeUndefined(); // create response has no overdue flag, only list does

    const listRes = await request(app.getHttpServer())
      .get('/v1/clients')
      .set('Cookie', cookies)
      .expect(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].overdue).toBe(true); // never visited yet

    const activityRes = await request(app.getHttpServer())
      .post('/v1/activities')
      .set('Cookie', cookies)
      .send({
        clientId,
        activityType: 'office-visit',
        personSpokenTo: 'Jane Dentist',
        notes: 'Discussed new invoice; client unhappy about a billing error',
        raisedIssue: true,
      })
      .expect(201);

    const issueRes = await request(app.getHttpServer())
      .post('/v1/issues')
      .set('Cookie', cookies)
      .send({
        clientId,
        description: 'Billing dispute over last invoice',
        visitNote: 'Client unhappy about a billing error',
        activityLogId: activityRes.body.id,
      })
      .expect(201);

    expect(issueRes.body.status).toBe('open');

    const resolveRes = await request(app.getHttpServer())
      .post(`/v1/issues/${issueRes.body.id}/resolve`)
      .set('Cookie', cookies)
      .send({ note: 'Issued a corrected invoice and a refund' })
      .expect(200);

    expect(resolveRes.body.status).toBe('resolved');

    const afterVisitList = await request(app.getHttpServer())
      .get('/v1/clients')
      .set('Cookie', cookies)
      .expect(200);
    expect(afterVisitList.body[0].overdue).toBe(false); // just visited
  });

  it("never lets one organization read another organization's data", async () => {
    const orgA = await signupAndOnboard('org-a2-owner@example.com', 'OrgA2');
    const orgB = await signupAndOnboard('org-b2-owner@example.com', 'OrgB2');

    const clientRes = await request(app.getHttpServer())
      .post('/v1/clients')
      .set('Cookie', orgA.cookies)
      .send({
        name: 'OrgA Only Client',
        contact: 'Someone',
        phone: '555-0200',
        callCycle: 'Monthly',
        address: '2 Side St',
      })
      .expect(201);
    const orgAClientId = clientRes.body.id as string;

    // Org B's own list must be empty — it must not see Org A's client.
    const orgBList = await request(app.getHttpServer())
      .get('/v1/clients')
      .set('Cookie', orgB.cookies)
      .expect(200);
    expect(orgBList.body).toHaveLength(0);

    // Org B must not be able to fetch Org A's client by id either.
    await request(app.getHttpServer())
      .get(`/v1/clients/${orgAClientId}`)
      .set('Cookie', orgB.cookies)
      .expect(404);

    // Org A can still fetch its own client.
    await request(app.getHttpServer())
      .get(`/v1/clients/${orgAClientId}`)
      .set('Cookie', orgA.cookies)
      .expect(200);
  });

  it('rejects domain-module access before onboarding completes', async () => {
    const signupRes = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send({ email: 'no-org-yet@example.com', password: 'super-secret-1', name: 'No Org Yet' })
      .expect(201);
    const cookies = extractCookies(signupRes);

    await request(app.getHttpServer()).get('/v1/clients').set('Cookie', cookies).expect(403);
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/v1/clients').expect(401);
  });

  it('invites a teammate, emails them, and lets them accept into the same org', async () => {
    const { cookies: adminCookies, orgId } = await signupAndOnboard(
      'invite-admin@example.com',
      'InviteOrg',
    );

    const createRes = await request(app.getHttpServer())
      .post('/v1/invites')
      .set('Cookie', adminCookies)
      .send({ email: 'new-agent@example.com', role: 'agent' })
      .expect(201);
    expect(createRes.body.status).toBe('pending');

    // The real send path ran (through the fake), with a real accept link.
    expect(fakeEmailService.sent).toHaveLength(1);
    expect(fakeEmailService.sent[0].to).toBe('new-agent@example.com');
    const acceptUrl = new URL(fakeEmailService.sent[0].acceptUrl);
    const token = acceptUrl.searchParams.get('token');

    const listRes = await request(app.getHttpServer())
      .get('/v1/invites')
      .set('Cookie', adminCookies)
      .expect(200);
    expect(listRes.body).toHaveLength(1);

    const previewRes = await request(app.getHttpServer()).get(`/v1/invites/${token}`).expect(200);
    expect(previewRes.body).toMatchObject({
      email: 'new-agent@example.com',
      role: 'agent',
      orgName: 'InviteOrg',
      status: 'pending',
    });

    const acceptRes = await request(app.getHttpServer())
      .post(`/v1/invites/${token}/accept`)
      .send({ name: 'New Agent', password: 'super-secret-1' })
      .expect(200);
    expect(acceptRes.body).toMatchObject({ orgId, orgName: 'InviteOrg', role: 'agent' });

    const agentCookies = extractCookies(acceptRes);

    // The accepted invitee landed in the SAME org, not a fresh one.
    await request(app.getHttpServer()).get('/v1/clients').set('Cookie', agentCookies).expect(200);

    // ...but with an agent's permissions, not the admin's.
    await request(app.getHttpServer())
      .post('/v1/invites')
      .set('Cookie', agentCookies)
      .send({ email: 'someone-else@example.com', role: 'agent' })
      .expect(403);

    // The same token can't be redeemed twice.
    await request(app.getHttpServer())
      .post(`/v1/invites/${token}/accept`)
      .send({ name: 'Replay', password: 'super-secret-1' })
      .expect(409);
  });

  it("never lets one organization see or revoke another organization's invites", async () => {
    const orgA = await signupAndOnboard('invite-org-a@example.com', 'InviteOrgA');
    const orgB = await signupAndOnboard('invite-org-b@example.com', 'InviteOrgB');

    const inviteRes = await request(app.getHttpServer())
      .post('/v1/invites')
      .set('Cookie', orgA.cookies)
      .send({ email: 'orga-invitee@example.com', role: 'agent' })
      .expect(201);
    const inviteId = inviteRes.body.id as string;

    const orgBList = await request(app.getHttpServer())
      .get('/v1/invites')
      .set('Cookie', orgB.cookies)
      .expect(200);
    expect(orgBList.body).toHaveLength(0);

    await request(app.getHttpServer())
      .post(`/v1/invites/${inviteId}/revoke`)
      .set('Cookie', orgB.cookies)
      .expect(404);
  });

  /**
   * Mirrors how a real invitee gets from "email sent" to "logged in" —
   * including opening the preview link first, same as a real browser would
   * (and unlike accept, that GET runs with zero cookies: no tenant context
   * at all, which is exactly what tripped up the department-name lookup).
   */
  async function acceptLatestInvite(name: string, password = 'super-secret-1') {
    const acceptUrl = fakeEmailService.sent.at(-1)!.acceptUrl;
    const token = new URL(acceptUrl).searchParams.get('token');
    await request(app.getHttpServer()).get(`/v1/invites/${token}`).expect(200);
    const res = await request(app.getHttpServer())
      .post(`/v1/invites/${token}/accept`)
      .send({ name, password })
      .expect(200);
    return extractCookies(res);
  }

  it('scopes manager visibility to their own department, admin sees everything, and unassigned records stay shared', async () => {
    const admin = await signupAndOnboard('dept-admin@example.com', 'DeptCo');

    const salesRes = await request(app.getHttpServer())
      .post('/v1/departments')
      .set('Cookie', admin.cookies)
      .send({ name: 'Sales' })
      .expect(201);
    const salesId = salesRes.body.id as string;

    const financeRes = await request(app.getHttpServer())
      .post('/v1/departments')
      .set('Cookie', admin.cookies)
      .send({ name: 'Finance' })
      .expect(201);
    const financeId = financeRes.body.id as string;

    await request(app.getHttpServer())
      .post('/v1/invites')
      .set('Cookie', admin.cookies)
      .send({ email: 'dept-sales-mgr@example.com', role: 'manager', departmentId: salesId })
      .expect(201);
    // The public preview (no auth at all) must resolve the department name
    // without blowing up — this is what originally broke (see
    // get-invite-by-token.use-case.ts's findByIdUnscoped).
    const previewUrl = new URL(fakeEmailService.sent.at(-1)!.acceptUrl);
    const previewToken = previewUrl.searchParams.get('token');
    const previewRes = await request(app.getHttpServer())
      .get(`/v1/invites/${previewToken}`)
      .expect(200);
    expect(previewRes.body.departmentName).toBe('Sales');

    const salesCookies = await acceptLatestInvite('Sales Manager');

    await request(app.getHttpServer())
      .post('/v1/invites')
      .set('Cookie', admin.cookies)
      .send({ email: 'finance-mgr@example.com', role: 'manager', departmentId: financeId })
      .expect(201);
    const financeCookies = await acceptLatestInvite('Finance Manager');

    const salesClientRes = await request(app.getHttpServer())
      .post('/v1/clients')
      .set('Cookie', salesCookies)
      .send({ name: 'Sales Client', contact: 'A', phone: '1', callCycle: 'Weekly', address: 'x' })
      .expect(201);
    expect(salesClientRes.body.departmentId).toBe(salesId);
    const salesClientId = salesClientRes.body.id as string;

    const financeClientRes = await request(app.getHttpServer())
      .post('/v1/clients')
      .set('Cookie', financeCookies)
      .send({ name: 'Finance Client', contact: 'B', phone: '2', callCycle: 'Weekly', address: 'y' })
      .expect(201);
    const financeClientId = financeClientRes.body.id as string;

    const salesList = await request(app.getHttpServer())
      .get('/v1/clients')
      .set('Cookie', salesCookies)
      .expect(200);
    expect(salesList.body.map((c: { id: string }) => c.id)).toEqual([salesClientId]);

    const financeList = await request(app.getHttpServer())
      .get('/v1/clients')
      .set('Cookie', financeCookies)
      .expect(200);
    expect(financeList.body.map((c: { id: string }) => c.id)).toEqual([financeClientId]);

    const adminList = await request(app.getHttpServer())
      .get('/v1/clients')
      .set('Cookie', admin.cookies)
      .expect(200);
    expect(adminList.body).toHaveLength(2);

    // A manager can't fetch the other department's client by id either —
    // the list boundary isn't just cosmetic.
    await request(app.getHttpServer())
      .get(`/v1/clients/${financeClientId}`)
      .set('Cookie', salesCookies)
      .expect(404);

    // A client with no department (created by the admin, who is never
    // department-scoped) stays visible to every department.
    const sharedClientRes = await request(app.getHttpServer())
      .post('/v1/clients')
      .set('Cookie', admin.cookies)
      .send({ name: 'Shared Client', contact: 'C', phone: '3', callCycle: 'Weekly', address: 'z' })
      .expect(201);
    expect(sharedClientRes.body.departmentId).toBeNull();

    const salesListAfterShared = await request(app.getHttpServer())
      .get('/v1/clients')
      .set('Cookie', salesCookies)
      .expect(200);
    expect(salesListAfterShared.body.map((c: { id: string }) => c.id).sort()).toEqual(
      [salesClientId, sharedClientRes.body.id].sort(),
    );
  });

  it('restricts department management to org_admin and blocks deleting an occupied department', async () => {
    const admin = await signupAndOnboard('dept-admin2@example.com', 'DeptCo2');

    const deptRes = await request(app.getHttpServer())
      .post('/v1/departments')
      .set('Cookie', admin.cookies)
      .send({ name: 'Ops' })
      .expect(201);
    const deptId = deptRes.body.id as string;

    await request(app.getHttpServer())
      .post('/v1/invites')
      .set('Cookie', admin.cookies)
      .send({ email: 'ops-agent@example.com', role: 'agent', departmentId: deptId })
      .expect(201);
    const agentCookies = await acceptLatestInvite('Ops Agent');

    // Only org_admin manages departments.
    await request(app.getHttpServer())
      .post('/v1/departments')
      .set('Cookie', agentCookies)
      .send({ name: 'Rogue Dept' })
      .expect(403);

    // Can't delete a department while someone is still assigned to it.
    await request(app.getHttpServer())
      .delete(`/v1/departments/${deptId}`)
      .set('Cookie', admin.cookies)
      .expect(409);

    // Listing is open to every onboarded member, not just admins.
    const listRes = await request(app.getHttpServer())
      .get('/v1/departments')
      .set('Cookie', agentCookies)
      .expect(200);
    expect(listRes.body.map((d: { name: string }) => d.name)).toContain('Ops');
  });

  it('runs a full workflow pipeline: fan-out spawning, approval gate, department-scoped assignment, and who may close a task', async () => {
    const admin = await signupAndOnboard('wf-admin@example.com', 'WorkflowCo');

    async function createDept(name: string): Promise<string> {
      const res = await request(app.getHttpServer())
        .post('/v1/departments')
        .set('Cookie', admin.cookies)
        .send({ name })
        .expect(201);
      return res.body.id as string;
    }
    const salesId = await createDept('Sales');
    const engineeringId = await createDept('Engineering');
    const financeId = await createDept('Finance');

    async function inviteAndAccept(
      email: string,
      role: 'manager' | 'agent',
      departmentId: string,
      name: string,
    ) {
      await request(app.getHttpServer())
        .post('/v1/invites')
        .set('Cookie', admin.cookies)
        .send({ email, role, departmentId })
        .expect(201);
      return acceptLatestInvite(name);
    }
    const salesManager = await inviteAndAccept(
      'wf-sales-mgr@example.com',
      'manager',
      salesId,
      'Sales Mgr',
    );
    const salesAgent = await inviteAndAccept(
      'wf-sales-agent@example.com',
      'agent',
      salesId,
      'Sales Agent',
    );
    const salesAgent2 = await inviteAndAccept(
      'wf-sales-agent2@example.com',
      'agent',
      salesId,
      'Sales Agent 2',
    );
    const engManager = await inviteAndAccept(
      'wf-eng-mgr@example.com',
      'manager',
      engineeringId,
      'Eng Mgr',
    );
    const engAgent = await inviteAndAccept(
      'wf-eng-agent@example.com',
      'agent',
      engineeringId,
      'Eng Agent',
    );
    const financeManager = await inviteAndAccept(
      'wf-fin-mgr@example.com',
      'manager',
      financeId,
      'Finance Mgr',
    );

    // A "Site Visit Request" SOP: Sales intake (needs manager sign-off) fans
    // out to Engineering (site work) AND Finance (billing note) at once.
    const templateRes = await request(app.getHttpServer())
      .post('/v1/workflow-templates')
      .set('Cookie', admin.cookies)
      .send({
        name: 'Site Visit Request',
        entryStageId: 'request',
        stages: [
          {
            id: 'request',
            name: 'Request intake',
            departmentId: salesId,
            requiresApproval: true,
            checklistTemplate: ['Confirm client address'],
            nextStageIds: ['field-work', 'notify-finance'],
          },
          {
            id: 'field-work',
            name: 'Site visit',
            departmentId: engineeringId,
            requiresApproval: false,
            checklistTemplate: ['Visit site', 'Submit report'],
            nextStageIds: [],
          },
          {
            id: 'notify-finance',
            name: 'Billing note',
            departmentId: financeId,
            requiresApproval: false,
            checklistTemplate: [],
            nextStageIds: [],
          },
        ],
      })
      .expect(201);
    const templateId = templateRes.body.id as string;

    // Only org_admin manages templates; everyone onboarded can list them.
    await request(app.getHttpServer())
      .post('/v1/workflow-templates')
      .set('Cookie', salesAgent)
      .send({
        name: 'Rogue',
        entryStageId: 'a',
        stages: [{ id: 'a', name: 'A', departmentId: salesId }],
      })
      .expect(403);
    await request(app.getHttpServer())
      .get('/v1/workflow-templates')
      .set('Cookie', engAgent)
      .expect(200);

    const clientRes = await request(app.getHttpServer())
      .post('/v1/clients')
      .set('Cookie', salesAgent)
      .send({
        name: 'Acme Dental',
        contact: 'Jane',
        phone: '555',
        callCycle: 'Weekly',
        address: '1 Main St',
      })
      .expect(201);
    const clientId = clientRes.body.id as string;

    // The Sales agent kicks off the SOP — note: no activityLogId required
    // when a task is spawned/created from a template.
    const taskRes = await request(app.getHttpServer())
      .post('/v1/tasks')
      .set('Cookie', salesAgent)
      .send({
        clientId,
        title: 'Handle new site visit request',
        activityLogId: 'activity-1',
        templateId,
      })
      .expect(201);
    const requestTaskId = taskRes.body.id as string;
    expect(taskRes.body.departmentId).toBe(salesId); // entry stage's department, not the creator's own
    expect(taskRes.body.requiresApproval).toBe(true);
    const checklistItemId = taskRes.body.checklistItems[0].id as string;

    // Engineering can't see a Sales-department task.
    const engList = await request(app.getHttpServer())
      .get('/v1/tasks')
      .set('Cookie', engManager)
      .expect(200);
    expect(engList.body).toHaveLength(0);
    // ...but every Sales member can, agents included (not just the manager).
    const salesAgentList = await request(app.getHttpServer())
      .get('/v1/tasks')
      .set('Cookie', salesAgent)
      .expect(200);
    expect(salesAgentList.body.map((t: { id: string }) => t.id)).toContain(requestTaskId);

    // Only this department's manager (or admin) can assign — and only to a member of that same department.
    await request(app.getHttpServer())
      .post(`/v1/tasks/${requestTaskId}/assign`)
      .set('Cookie', engManager)
      .send({ assigneeUserId: 'whoever' })
      .expect(404); // can't even see it, so it's reported as not-found, not forbidden

    await request(app.getHttpServer())
      .post(`/v1/tasks/${requestTaskId}/assign`)
      .set('Cookie', salesManager)
      .send({ assigneeUserId: 'not-a-real-user-id' })
      .expect(404); // assignee itself must exist

    await request(app.getHttpServer())
      .post(`/v1/tasks/${requestTaskId}/assign`)
      .set('Cookie', salesManager)
      .send({ assigneeUserId: userIdFromCookies(financeManager) })
      .expect(400); // can't assign a Sales task to someone outside Sales

    // Assign to the Sales agent who created it (their own user id, from the task's own agentId).
    await request(app.getHttpServer())
      .post(`/v1/tasks/${requestTaskId}/assign`)
      .set('Cookie', salesManager)
      .send({ assigneeUserId: taskRes.body.agentId })
      .expect(200);

    // Only the assignee or this department's manager/admin may touch the checklist — a peer in the SAME department may not.
    await request(app.getHttpServer())
      .post(`/v1/tasks/${requestTaskId}/checklist/${checklistItemId}`)
      .set('Cookie', salesAgent2)
      .send({ done: true })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/v1/tasks/${requestTaskId}/checklist/${checklistItemId}`)
      .set('Cookie', salesAgent)
      .send({ done: true })
      .expect(200);

    // Notes are pure context, not a workflow gate — unlike the checklist,
    // any Sales member (not just the assignee or manager) may add one.
    const noteRes = await request(app.getHttpServer())
      .post(`/v1/tasks/${requestTaskId}/notes`)
      .set('Cookie', salesAgent2)
      .send({ text: 'Client asked to push the visit to next week.' })
      .expect(201);
    expect(noteRes.body.notes).toHaveLength(1);
    expect(noteRes.body.notes[0].text).toBe('Client asked to push the visit to next week.');

    // Engineering still can't see this Sales task, so it can't note on it either.
    await request(app.getHttpServer())
      .post(`/v1/tasks/${requestTaskId}/notes`)
      .set('Cookie', engManager)
      .send({ text: 'trying to peek' })
      .expect(404);

    // The assignee's own completion is held for approval — the stage requires it.
    const submitRes = await request(app.getHttpServer())
      .post(`/v1/tasks/${requestTaskId}/complete`)
      .set('Cookie', salesAgent)
      .expect(200);
    expect(submitRes.body.status).toBe('awaiting_approval');

    // A peer (not the assignee, not a manager) still can't approve it.
    await request(app.getHttpServer())
      .post(`/v1/tasks/${requestTaskId}/approve`)
      .set('Cookie', salesAgent2)
      .expect(403);

    // The department manager approves — this finishes the task AND fans out
    // into two brand-new tasks, one per next stage.
    const approveRes = await request(app.getHttpServer())
      .post(`/v1/tasks/${requestTaskId}/approve`)
      .set('Cookie', salesManager)
      .expect(200);
    expect(approveRes.body.status).toBe('completed');
    expect(approveRes.body.completedById).not.toBe(taskRes.body.agentId); // the approving manager, not the submitter

    const engListAfter = await request(app.getHttpServer())
      .get('/v1/tasks')
      .set('Cookie', engManager)
      .expect(200);
    expect(engListAfter.body).toHaveLength(1);
    expect(engListAfter.body[0].parentTaskId).toBe(requestTaskId);
    expect(engListAfter.body[0].departmentId).toBe(engineeringId);
    const fieldWorkTaskId = engListAfter.body[0].id as string;

    const finListAfter = await request(app.getHttpServer())
      .get('/v1/tasks')
      .set('Cookie', financeManager)
      .expect(200);
    expect(finListAfter.body).toHaveLength(1);
    expect(finListAfter.body[0].parentTaskId).toBe(requestTaskId);

    // Engineering's stage needs no approval: assigning it to the engineer
    // and having THEM finish it directly (no submit/approve round trip).
    const engAgentId = userIdFromCookies(engAgent);
    await request(app.getHttpServer())
      .post(`/v1/tasks/${fieldWorkTaskId}/assign`)
      .set('Cookie', engManager)
      .send({ assigneeUserId: engAgentId })
      .expect(200);

    const engCompleteRes = await request(app.getHttpServer())
      .post(`/v1/tasks/${fieldWorkTaskId}/complete`)
      .set('Cookie', engAgent)
      .expect(200);
    expect(engCompleteRes.body.status).toBe('completed'); // no approval stage here — finishes immediately

    // That stage had no nextStageIds — the pipeline ends there, nothing new spawned.
    const engListFinal = await request(app.getHttpServer())
      .get('/v1/tasks')
      .set('Cookie', engManager)
      .expect(200);
    expect(engListFinal.body).toHaveLength(1); // still just the one field-work task, no further fan-out

    // Finance's task was never assigned at all — its manager can still close it directly.
    const finCompleteRes = await request(app.getHttpServer())
      .post(`/v1/tasks/${finListAfter.body[0].id}/complete`)
      .set('Cookie', financeManager)
      .expect(200);
    expect(finCompleteRes.body.status).toBe('completed');
    expect(finCompleteRes.body.assignedToUserId).toBeNull();
  });
});
