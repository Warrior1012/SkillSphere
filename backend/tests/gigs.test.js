import request from 'supertest';

jest.mock('../src/config/db.js', () => ({
  connectDB: jest.fn(),
  isDbConnected: jest.fn(() => true),
}));

jest.mock('../src/middleware/auth.js', () => ({
  // Bypasses real JWT verification — these tests are about gig/proposal
  // business logic, not auth (that's covered in auth.test.js). req.user is
  // set per-test via the x-test-user-id / x-test-role headers below.
  protect: (req, res, next) => {
    req.user = {
      _id: req.headers['x-test-user-id'] || 'client1',
      role: req.headers['x-test-role'] || 'client',
      isActive: true,
      isSuspended: false,
    };
    next();
  },
}));

jest.mock('../src/utils/notify.js', () => ({ notify: jest.fn().mockResolvedValue(null) }));

jest.mock('../src/models/Gig.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../src/models/Proposal.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({}),
  },
}));

// eslint-disable-next-line import/first
import app from '../src/app.js';
// eslint-disable-next-line import/first
import Gig from '../src/models/Gig.js';
// eslint-disable-next-line import/first
import Proposal from '../src/models/Proposal.js';

beforeEach(() => jest.clearAllMocks());

function asClient(id = 'client1') {
  return { 'x-test-role': 'client', 'x-test-user-id': id };
}
function asFreelancer(id = 'freelancer1') {
  return { 'x-test-role': 'freelancer', 'x-test-user-id': id };
}

describe('POST /api/gigs', () => {
  it('rejects freelancers posting gigs (role gate)', async () => {
    const res = await request(app)
      .post('/api/gigs')
      .set(asFreelancer())
      .send({ title: 'Fix my sink', description: 'Need a plumber for a leaking sink today.' });
    expect(res.status).toBe(403);
    expect(Gig.create).not.toHaveBeenCalled();
  });

  it('creates a gig for a client with valid input', async () => {
    Gig.create.mockResolvedValue({ _id: 'gig1', title: 'Build a website' });
    const res = await request(app)
      .post('/api/gigs')
      .set(asClient())
      .send({ title: 'Build a website', description: 'Need a 5-page marketing site built in React.' });
    expect(res.status).toBe(201);
    expect(Gig.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a title that is too short before touching the database', async () => {
    const res = await request(app).post('/api/gigs').set(asClient()).send({ title: 'x', description: 'short' });
    expect(res.status).toBe(422);
    expect(Gig.create).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/gigs/:id — ownership', () => {
  it('blocks a client from editing a gig they do not own', async () => {
    Gig.findById.mockResolvedValue({ _id: 'gig1', client: 'someone-else', status: 'open' });
    const res = await request(app).patch('/api/gigs/gig1').set(asClient('client1')).send({ title: 'New title here' });
    expect(res.status).toBe(403);
  });

  it('allows the owning client to edit their own gig', async () => {
    const gig = { _id: 'gig1', client: 'client1', status: 'open', location: {}, save: jest.fn().mockResolvedValue(true) };
    Gig.findById.mockResolvedValue(gig);
    const res = await request(app).patch('/api/gigs/gig1').set(asClient('client1')).send({ title: 'Updated title' });
    expect(res.status).toBe(200);
    expect(gig.save).toHaveBeenCalled();
  });
});

describe('POST /api/gigs/:gigId/proposals', () => {
  it('blocks a client from submitting a proposal (role gate)', async () => {
    const res = await request(app)
      .post('/api/gigs/gig1/proposals')
      .set(asClient())
      .send({ coverLetter: 'I would love to help with this project.', bidAmount: 500, estimatedDays: 5 });
    expect(res.status).toBe(403);
  });

  it('blocks proposing on your own gig', async () => {
    Gig.findById.mockResolvedValue({ _id: 'gig1', client: 'freelancer1', status: 'open' });
    const res = await request(app)
      .post('/api/gigs/gig1/proposals')
      .set(asFreelancer('freelancer1'))
      .send({ coverLetter: 'I would love to help with this project.', bidAmount: 500, estimatedDays: 5 });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate active proposal on the same gig', async () => {
    Gig.findById.mockResolvedValue({ _id: 'gig1', client: 'client1', status: 'open' });
    Proposal.findOne.mockResolvedValue({ _id: 'prop1', status: 'pending' });
    const res = await request(app)
      .post('/api/gigs/gig1/proposals')
      .set(asFreelancer('freelancer1'))
      .send({ coverLetter: 'I would love to help with this project.', bidAmount: 500, estimatedDays: 5 });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/proposals/:id/accept', () => {
  it('rejects accept from someone who is not the gig owner', async () => {
    Proposal.findById.mockResolvedValue({ _id: 'p1', gig: 'gig1', status: 'pending' });
    Gig.findById.mockResolvedValue({ _id: 'gig1', client: 'someone-else', status: 'open' });
    const res = await request(app).post('/api/proposals/p1/accept').set(asClient('client1'));
    expect(res.status).toBe(403);
  });

  it('accepts a pending proposal, moves the gig to in_progress, and rejects the rest', async () => {
    const proposal = { _id: 'p1', gig: 'gig1', freelancer: 'freelancer1', status: 'pending', save: jest.fn().mockResolvedValue(true) };
    const gig = { _id: 'gig1', client: 'client1', status: 'open', save: jest.fn().mockResolvedValue(true) };
    Proposal.findById.mockResolvedValue(proposal);
    Gig.findById.mockResolvedValue(gig);

    const res = await request(app).post('/api/proposals/p1/accept').set(asClient('client1'));

    expect(res.status).toBe(200);
    expect(proposal.status).toBe('accepted');
    expect(gig.status).toBe('in_progress');
    expect(Proposal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ gig: 'gig1', status: 'pending' }),
      expect.objectContaining({ $set: { status: 'rejected' } }),
      expect.anything()
    );
  });
});
