// Makes mongoose.startSession()/withTransaction() a no-op passthrough so
// controllers that use transactions (see authController.register) are
// testable with mocked models instead of a real MongoDB replica set.
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    default: {
      ...actual.default,
      startSession: jest.fn().mockResolvedValue({
        withTransaction: async (fn) => fn(),
        endSession: jest.fn(),
      }),
    },
    startSession: jest.fn().mockResolvedValue({
      withTransaction: async (fn) => fn(),
      endSession: jest.fn(),
    }),
  };
});
