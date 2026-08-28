import request from 'supertest';

jest.mock('../src/config/db.js', () => ({
  connectDB: jest.fn(),
  isDbConnected: jest.fn(() => true),
}));

jest.mock('../src/models/User.js', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('../src/models/FreelancerProfile.js', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

jest.mock('../src/models/ClientProfile.js', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

jest.mock('../src/utils/email.js', () => ({
  sendEmail: jest.fn().mockResolvedValue({ simulated: true }),
}));

// eslint-disable-next-line import/first
import app from '../src/app.js';
// eslint-disable-next-line import/first
import User from '../src/models/User.js';
// eslint-disable-next-line import/first
import FreelancerProfile from '../src/models/FreelancerProfile.js';
// eslint-disable-next-line import/first
import { sendEmail } from '../src/utils/email.js';

function fakeUser(overrides = {}) {
  const base = {
    _id: '64f000000000000000000001',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'client',
    isSuspended: false,
    isActive: true,
    twoFactorEnabled: false,
    save: jest.fn().mockResolvedValue(true),
    comparePassword: jest.fn().mockResolvedValue(true),
    toSafeJSON: jest.fn(function () {
      return { _id: this._id, name: this.name, email: this.email, role: this.role };
    }),
    ...overrides,
  };
  return base;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('rejects a role other than client/freelancer (admin is not self-registerable)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Eve',
      email: 'eve@example.com',
      password: 'Password123',
      role: 'admin',
    });
    expect(res.status).toBe(422);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rejects a weak password before ever touching the database', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Eve',
      email: 'eve@example.com',
      password: 'weak',
      role: 'client',
    });
    expect(res.status).toBe(422);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('rejects duplicate email with 409', async () => {
    User.findOne.mockResolvedValue(fakeUser());
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada 2',
      email: 'ada@example.com',
      password: 'Password123',
      role: 'client',
    });
    expect(res.status).toBe(409);
  });

  it('creates a client account, creates a ClientProfile, and sends a verification email', async () => {
    User.findOne.mockResolvedValue(null);
    const created = fakeUser({ role: 'client' });
    User.create.mockResolvedValue([created]);

    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'Password123',
      role: 'client',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(User.create).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toBe('ada@example.com');
  });

  it('creates a FreelancerProfile when role=freelancer', async () => {
    User.findOne.mockResolvedValue(null);
    const created = fakeUser({ role: 'freelancer' });
    User.create.mockResolvedValue([created]);

    const res = await request(app).post('/api/auth/register').send({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'Password123',
      role: 'freelancer',
    });

    expect(res.status).toBe(201);
    expect(FreelancerProfile.create).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/auth/login', () => {
  it('rejects unknown email with a generic 401 (does not reveal the account does not exist)', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Password123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('rejects a wrong password', async () => {
    const user = fakeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const res = await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'WrongPass123' });
    expect(res.status).toBe(401);
  });

  it('rejects a suspended account', async () => {
    const user = fakeUser({ isSuspended: true });
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const res = await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'Password123' });
    expect(res.status).toBe(403);
  });

  it('logs in successfully and sets the refresh cookie', async () => {
    const user = fakeUser();
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

    const res = await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.headers['set-cookie']?.[0]).toMatch(/ss_refresh=/);
  });

  it('returns a 2FA challenge instead of a session when 2FA is enabled', async () => {
    const user = fakeUser({ twoFactorEnabled: true });
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

    const res = await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.requires2FA).toBe(true);
    expect(res.body.data.tempToken).toBeTruthy();
    expect(res.body.data.accessToken).toBeUndefined();
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

describe('GET /api/auth/google', () => {
  it('returns 501 when OAuth credentials are not configured', async () => {
    const res = await request(app).get('/api/auth/google');
    expect(res.status).toBe(501);
  });
});

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
