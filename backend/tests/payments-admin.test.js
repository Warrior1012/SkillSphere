import request from 'supertest';

jest.mock('../src/config/db.js', () => ({ connectDB: jest.fn(), isDbConnected: jest.fn(() => true) }));

jest.mock('../src/middleware/auth.js', () => ({
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
  default: { findById: jest.fn(), countDocuments: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue([]) },
}));
jest.mock('../src/models/Payment.js', () => ({
  __esModule: true,
  default: { create: jest.fn(), findById: jest.fn(), aggregate: jest.fn().mockResolvedValue([]) },
}));
jest.mock('../src/models/ClientProfile.js', () => ({ __esModule: true, default: { updateOne: jest.fn().mockResolvedValue({}) } }));
jest.mock('../src/models/FreelancerProfile.js', () => ({ __esModule: true, default: { updateOne: jest.fn().mockResolvedValue({}) } }));
jest.mock('../src/models/User.js', () => ({ __esModule: true, default: { countDocuments: jest.fn().mockResolvedValue(0) } }));
jest.mock('../src/models/Review.js', () => ({ __esModule: true, default: {} }));
jest.mock('../src/models/Dispute.js', () => ({ __esModule: true, default: { findOne: jest.fn().mockResolvedValue(null) } }));

// eslint-disable-next-line import/first
import app from '../src/app.js';
// eslint-disable-next-line import/first
import Gig from '../src/models/Gig.js';
// eslint-disable-next-line import/first
import Payment from '../src/models/Payment.js';

beforeEach(() => jest.clearAllMocks());

function asUser(id, role) {
  return { 'x-test-role': role, 'x-test-user-id': id };
}

describe('POST /api/payments/fund', () => {
  it('rejects funding a gig you do not own', async () => {
    Gig.findById.mockResolvedValue({ _id: 'gig1', client: 'someone-else', selectedFreelancer: 'f1' });
    const res = await request(app).post('/api/payments/fund').set(asUser('client1', 'client')).send({ gigId: 'gig1', amount: 100 });
    expect(res.status).toBe(403);
  });

  it('rejects funding a gig with no accepted freelancer yet', async () => {
    Gig.findById.mockResolvedValue({ _id: 'gig1', client: 'client1', selectedFreelancer: null });
    const res = await request(app).post('/api/payments/fund').set(asUser('client1', 'client')).send({ gigId: 'gig1', amount: 100 });
    expect(res.status).toBe(400);
  });

  it('funds successfully and auto-confirms with the mock provider (no real keys configured in test env)', async () => {
    Gig.findById.mockResolvedValue({ _id: 'gig1', client: 'client1', selectedFreelancer: 'freelancer1', milestones: { id: () => null } });
    const paymentDoc = { _id: 'pay1', save: jest.fn().mockResolvedValue(true) };
    Payment.create.mockResolvedValue(paymentDoc);

    const res = await request(app).post('/api/payments/fund').set(asUser('client1', 'client')).send({ gigId: 'gig1', amount: 250 });

    expect(res.status).toBe(201);
    expect(res.body.data.provider).toBe('mock');
    expect(paymentDoc.status).toBe('authorized'); // mock auto-confirms
  });
});

describe('POST /api/payments/:id/release', () => {
  it('rejects releasing a payment that is not in authorized state', async () => {
    Payment.findById.mockResolvedValue({ _id: 'pay1', client: 'client1', status: 'created' });
    const res = await request(app).post('/api/payments/pay1/release').set(asUser('client1', 'client'));
    expect(res.status).toBe(400);
  });

  it('releases an authorized payment and updates profile totals', async () => {
    const payment = { _id: 'pay1', client: 'client1', freelancer: 'freelancer1', status: 'authorized', amount: 300, providerPaymentId: 'mock_payment_x', save: jest.fn().mockResolvedValue(true) };
    Payment.findById.mockResolvedValue(payment);

    const res = await request(app).post('/api/payments/pay1/release').set(asUser('client1', 'client'));

    expect(res.status).toBe(200);
    expect(payment.status).toBe('released');
  });
});

describe('Admin routes', () => {
  it('rejects a non-admin from listing users', async () => {
    const res = await request(app).get('/api/admin/users').set(asUser('user1', 'client'));
    expect(res.status).toBe(403);
  });

  it('allows an admin to fetch analytics', async () => {
    const res = await request(app).get('/api/admin/analytics').set(asUser('admin1', 'admin'));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('platformRevenue');
    expect(res.body.data).toHaveProperty('jobSuccessRate');
  });
});
