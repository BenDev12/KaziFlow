import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type {
  EmailService,
  SendInviteEmailInput,
} from '../src/modules/iam/application/ports/email.port';

/** Records invite emails instead of calling the real Resend API during tests. */
class FakeEmailService implements EmailService {
  public sent: SendInviteEmailInput[] = [];

  async sendInviteEmail(input: SendInviteEmailInput): Promise<void> {
    this.sent.push(input);
  }
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
});
