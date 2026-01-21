export default {
  post: jest.fn(() =>
    Promise.resolve({
      status: 200,
      data: { success: true },
    })
  ),
  get: jest.fn(() =>
    Promise.resolve({
      status: 200,
      data: {},
    })
  ),
  create: jest.fn(function () {
    return this;
  }),
};
