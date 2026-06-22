const mongoose = require('mongoose');
const connectDB = require('../../src/config/db');
const DocumentCategory = require('../../src/models/category.model');
const initDatabase = require('../../src/config/init-db');

// Mock dependencies
jest.mock('../../src/config/db');
jest.mock('../../src/config/logger');

describe('Database Initialization - Unit Tests', () => {
  let findOneSpy;
  let createSpy;
  let syncIndexesSpy;

  beforeAll(() => {
    syncIndexesSpy = jest.spyOn(mongoose.connection, 'syncIndexes').mockResolvedValue({});
    findOneSpy = jest.spyOn(DocumentCategory, 'findOne');
    createSpy = jest.spyOn(DocumentCategory, 'create');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    syncIndexesSpy.mockRestore();
    findOneSpy.mockRestore();
    createSpy.mockRestore();
  });

  it('should call connectDB, sync indexes, and seed empty categories', async () => {
    connectDB.mockResolvedValue({});
    findOneSpy.mockResolvedValue(null);
    createSpy.mockResolvedValue({});

    await initDatabase();

    expect(connectDB).toHaveBeenCalled();
    expect(syncIndexesSpy).toHaveBeenCalled();
    expect(findOneSpy).toHaveBeenCalledTimes(4);
    expect(createSpy).toHaveBeenCalledTimes(4);
  });

  it('should not seed default categories if they already exist in database', async () => {
    connectDB.mockResolvedValue({});
    findOneSpy.mockResolvedValue({ slug: 'existing' });
    createSpy.mockResolvedValue({});

    await initDatabase();

    expect(connectDB).toHaveBeenCalled();
    expect(syncIndexesSpy).toHaveBeenCalled();
    expect(findOneSpy).toHaveBeenCalledTimes(4);
    expect(createSpy).not.toHaveBeenCalled();
  });
});
