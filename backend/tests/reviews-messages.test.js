import request from 'supertest';

jest.mock('../src/config/db.js', () => ({
  connectDB: jest.fn(),
  isDbConnected: jest.fn(() => true),
}));

jest.mock('../src/middleware/auth.js', () => ({
  protect: (req, res, next) => {
    req.user = {
      _id: req.headers['x-test-user-id'] || 'client1',
      role: req.headers['x-test-role'] || 'client',
      name: 'Test User',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old — not "new account"
      isActive: true,
      isSuspended: false,
    };
    next();
  },
}));

jest.mock('../src/sockets/index.js', () => ({ getIO: jest.fn(() => null) }));
jest.mock('../src/utils/notify.js', () => ({ notify: jest.fn().mockResolvedValue(null) }));

jest.mock('../src/models/Gig.js', () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock('../src/models/Review.js', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]), create: jest.fn() },
}));
jest.mock('../src/models/FreelancerProfile.js', () => ({ __esModule: true, default: { findOne: jest.fn().mockResolvedValue(null) } }));
jest.mock('../src/models/Conversation.js', () => ({ __esModule: true, default: { findById: jest.fn(), findOne: jest.fn(), create: jest.fn() } }));
jest.mock('../src/models/Message.js', () => ({ __esModule: true, default: { create: jest.fn(), find: jest.fn() } }));

// eslint-disable-next-line import/first
import app from '../src/app.js';
// eslint-disable-next-line import/first
import Gig from '../src/models/Gig.js';
// eslint-disable-next-line import/first
import Review from '../src/models/Review.js';
// eslint-disable-next-line import/first
import Conversation from '../src/models/Conversation.js';

beforeEach(() => jest.clearAllMocks());

function asUser(id, role = 'client') {
  return { 'x-test-role': role, 'x-test-user-id': id };
}

describe('POST /api/reviews', () => {
  it('rejects reviewing a gig that is not completed', async () => {
    Gig.findById.mockResolvedValue({ _id: 'gig1', status: 'in_progress', client: 'client1', selectedFreelancer: 'freelancer1' });
    const res = await request(app)
      .post('/api/reviews')
      .set(asUser('client1'))
      .send({ gigId: 'gig1', revieweeId: 'freelancer1', rating: 5, comment: 'Great work' });
    expect(res.status).toBe(400);
    expect(Review.create).not.toHaveBeenCalled();
  });

  it('rejects a reviewer who was not part of the gig', async () => {
    Gig.findById.mockResolvedValue({ _id: 'gig1', status: 'completed', client: 'client1', selectedFreelancer: 'freelancer1' });
    const res = await request(app)
      .post('/api/reviews')
      .set(asUser('some-random-user'))
      .send({ gigId: 'gig1', revieweeId: 'freelancer1', rating: 5, comment: 'Great work' });
    expect(res.status).toBe(403);
  });

  it('rejects a duplicate review on the same gig', async () => {
    Gig.findById.mockResolvedValue({ _id: 'gig1', status: 'completed', client: 'client1', selectedFreelancer: 'freelancer1' });
    Review.findOne.mockResolvedValue({ _id: 'existing-review' });
    const res = await request(app)
      .post('/api/reviews')
      .set(asUser('client1'))
      .send({ gigId: 'gig1', revieweeId: 'freelancer1', rating: 5, comment: 'Again?' });
    expect(res.status).toBe(409);
  });

  it('accepts a valid review from a real participant on a completed gig', async () => {
    Gig.findById.mockResolvedValue({
      _id: 'gig1',
      status: 'completed',
      client: 'client1',
      selectedFreelancer: 'freelancer1',
      updatedAt: new Date(Date.now() - 60 * 60 * 1000), // completed an hour ago
    });
    Review.findOne.mockResolvedValue(null);
    Review.create.mockResolvedValue({ _id: 'review1', rating: 5 });

    const res = await request(app)
      .post('/api/reviews')
      .set(asUser('client1'))
      .send({ gigId: 'gig1', revieweeId: 'freelancer1', rating: 5, comment: 'Excellent, on time.' });

    expect(res.status).toBe(201);
    expect(Review.create).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/conversations/:conversationId/messages', () => {
  it('rejects sending into a conversation you are not part of', async () => {
    Conversation.findById.mockResolvedValue({ _id: 'c1', participants: ['userA', 'userB'] });
    const res = await request(app)
      .post('/api/conversations/c1/messages')
      .set(asUser('userC'))
      .send({ text: 'hi' });
    expect(res.status).toBe(403);
  });

  it('rejects an empty message with no text and no attachments', async () => {
    Conversation.findById.mockResolvedValue({ _id: 'c1', participants: ['client1', 'userB'], save: jest.fn() });
    const res = await request(app).post('/api/conversations/c1/messages').set(asUser('client1')).send({ text: '   ' });
    expect(res.status).toBe(400);
  });
});
