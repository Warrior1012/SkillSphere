import request from 'supertest';

jest.mock('../src/config/db.js', () => ({ connectDB: jest.fn(), isDbConnected: jest.fn(() => true) }));

jest.mock('../src/middleware/auth.js', () => ({
  protect: (req, res, next) => {
    req.user = { _id: req.headers['x-test-user-id'] || 'client1', role: req.headers['x-test-role'] || 'client', isActive: true, isSuspended: false };
    next();
  },
}));

jest.mock('../src/utils/notify.js', () => ({ notify: jest.fn().mockResolvedValue(null) }));

jest.mock('../src/models/Payment.js', () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock('../src/models/Dispute.js', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), create: jest.fn(), findById: jest.fn() },
}));
jest.mock('../src/models/Gig.js', () => ({ __esModule: true, default: { findById: jest.fn() } }));

// eslint-disable-next-line import/first
import app from '../src/app.js';
// eslint-disable-next-line import/first
import Payment from '../src/models/Payment.js';
// eslint-disable-next-line import/first
import Dispute from '../src/models/Dispute.js';
// eslint-disable-next-line import/first
import Gig from '../src/models/Gig.js';

beforeEach(() => jest.clearAllMocks());

function asUser(id, role) {
  return { 'x-test-role': role, 'x-test-user-id': id };
}

describe('POST /api/disputes', () => {
  it('rejects disputing a payment that is not currently held', async () => {
    Payment.findById.mockResolvedValue({ _id: 'pay1', client: 'client1', freelancer: 'f1', status: 'released' });
    const res = await request(app)
      .post('/api/disputes')
      .set(asUser('client1', 'client'))
      .send({ paymentId: 'pay1', reason: 'Work was not delivered as described' });
    expect(res.status).toBe(400);
    expect(Dispute.create).not.toHaveBeenCalled();
  });

  it('rejects a second open dispute on the same payment', async () => {
    Payment.findById.mockResolvedValue({ _id: 'pay1', client: 'client1', freelancer: 'f1', status: 'authorized' });
    Dispute.findOne.mockResolvedValue({ _id: 'existing-dispute' });
    const res = await request(app)
      .post('/api/disputes')
      .set(asUser('client1', 'client'))
      .send({ paymentId: 'pay1', reason: 'Work was not delivered as described' });
    expect(res.status).toBe(409);
  });

  it('raises a valid dispute from a real participant', async () => {
    Payment.findById.mockResolvedValue({ _id: 'pay1', client: 'client1', freelancer: 'f1', status: 'authorized' });
    Dispute.findOne.mockResolvedValue(null);
    Dispute.create.mockResolvedValue({ _id: 'd1' });
    const res = await request(app)
      .post('/api/disputes')
      .set(asUser('client1', 'client'))
      .send({ paymentId: 'pay1', reason: 'Work was not delivered as described' });
    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/gigs/:id/milestones/:milestoneId', () => {
  it('rejects a freelancer trying to approve their own submitted milestone (client-only transition)', async () => {
    const milestone = { status: 'submitted' };
    const gig = {
      _id: 'gig1',
      client: 'client1',
      selectedFreelancer: 'freelancer1',
      milestones: { id: () => milestone },
      save: jest.fn(),
    };
    Gig.findById.mockResolvedValue(gig);
    const res = await request(app).patch('/api/gigs/gig1/milestones/m1').set(asUser('freelancer1', 'freelancer')).send({});
    expect(res.status).toBe(400);
    expect(gig.save).not.toHaveBeenCalled();
  });

  it('allows the freelancer to move pending -> in_progress', async () => {
    const milestone = { status: 'pending', progressLog: [] };
    const gig = {
      _id: 'gig1',
      client: 'client1',
      selectedFreelancer: 'freelancer1',
      milestones: { id: () => milestone },
      save: jest.fn().mockResolvedValue(true),
      computeProgress: () => 0,
    };
    Gig.findById.mockResolvedValue(gig);
    const res = await request(app)
      .patch('/api/gigs/gig1/milestones/m1')
      .set(asUser('freelancer1', 'freelancer'))
      .send({ note: 'Started on this today' });
    expect(res.status).toBe(200);
    expect(milestone.status).toBe('in_progress');
    expect(milestone.progressLog).toHaveLength(1);
  });

  it('rejects someone who is not part of the gig at all', async () => {
    Gig.findById.mockResolvedValue({ _id: 'gig1', client: 'client1', selectedFreelancer: 'freelancer1' });
    const res = await request(app).patch('/api/gigs/gig1/milestones/m1').set(asUser('random-user', 'freelancer')).send({});
    expect(res.status).toBe(403);
  });
});
