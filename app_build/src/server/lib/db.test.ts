import { describe, it, expect, beforeEach } from 'bun:test';
import { 
  getSetting, setSetting, getAllSettings,
  createMockVariant, getMockVariants, deleteMockVariant, updateMockVariant,
  createScenario, getScenarios, updateScenario, deleteScenario,
  resetDatabase 
} from './db';

describe('Database (SQLite in memory)', () => {
  beforeEach(() => {
    resetDatabase();
  });

  describe('Settings', () => {
    it('should set and get a setting', () => {
      setSetting('TEST_KEY', 'test_value');
      const val = getSetting('TEST_KEY');
      expect(val).toBe('test_value');
    });

    it('should return all settings', () => {
      setSetting('KEY1', 'VAL1');
      setSetting('KEY2', 'VAL2');
      const all = getAllSettings();
      expect(all['KEY1']).toBe('VAL1');
      expect(all['KEY2']).toBe('VAL2');
    });
  });

  describe('Mock Variants', () => {
    it('should create and retrieve a mock variant', () => {
      createMockVariant('v1', 'req1', 'My Variant', true, '{"ok":true}', 'custom', 200, 150, null);
      
      const variants = getMockVariants();
      expect(variants['req1']).toBeDefined();
      expect(variants['req1']?.length).toBe(1);
      
      const v = variants['req1']?.[0];
      expect(v?.id).toBe('v1');
      expect(v?.name).toBe('My Variant');
      expect(v?.isMocked).toBe(true);
      expect(v?.payload).toBe('{"ok":true}');
      expect(v?.latencyMs).toBe(150);
    });

    it('should update a mock variant', () => {
      createMockVariant('v2', 'req2', 'Old Name', false, '', null, 500, 0, null);
      updateMockVariant('v2', { name: 'New Name', isMocked: true, statusCode: 201 });
      
      const variants = getMockVariants();
      const v = variants['req2']?.[0];
      expect(v?.name).toBe('New Name');
      expect(v?.isMocked).toBe(true);
      expect(v?.statusCode).toBe(201);
    });

    it('should delete a mock variant', () => {
      createMockVariant('v3', 'req3', 'To Delete', false, '', null, 200, 0, null);
      deleteMockVariant('v3');
      
      const variants = getMockVariants();
      expect(variants['req3']).toBeUndefined();
    });
  });

  describe('Scenarios', () => {
    it('should create and retrieve a scenario', () => {
      const actions = [{
        requestId: 'req-1',
        isMocked: true,
        statusCode: 200,
        latencyMs: 100,
        payload: '{"ok":true}',
        selectedExample: null,
        pathParamsOverrides: {}
      }];
      
      createScenario('sc1', 'My Scenario', actions);
      
      const scenarios = getScenarios();
      expect(scenarios.length).toBe(1);
      expect(scenarios[0].id).toBe('sc1');
      expect(scenarios[0].name).toBe('My Scenario');
      expect(scenarios[0].actions.length).toBe(1);
      expect(scenarios[0].actions[0].requestId).toBe('req-1');
    });

    it('should update and delete a scenario', () => {
      createScenario('sc2', 'Old', []);
      updateScenario('sc2', 'New', [{
        requestId: 'req-2',
        isMocked: false,
        statusCode: 404,
        latencyMs: 0,
        payload: '',
        selectedExample: null,
        pathParamsOverrides: {}
      }]);
      
      let scenarios = getScenarios();
      expect(scenarios[0].name).toBe('New');
      expect(scenarios[0].actions.length).toBe(1);
      
      deleteScenario('sc2');
      scenarios = getScenarios();
      expect(scenarios.length).toBe(0);
    });
  });
});

import { applyScenarioActions, syncBrunoItemsToDb, getCollectionFromDb } from './db';

describe('Database (SQLite in memory) > Complex operations', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('syncBrunoItemsToDb and getCollectionFromDb should handle full sync', () => {
    syncBrunoItemsToDb(
      [{ id: 'req1', folderId: 'f1', name: 'Req', method: 'GET', url: '/url', examples: [] }],
      [{ id: 'f1', name: 'Folder 1', children: [] }],
      [{ name: 'Env 1', variables: [] }]
    );
    
    const collection = getCollectionFromDb();
    expect(collection.requests.length).toBe(1);
    expect(collection.folders.length).toBe(1);
    expect(collection.environments.length).toBe(1);
  });

  it('applyScenarioActions should upsert scenario variants', () => {
    applyScenarioActions([
      { requestId: 'req1', payload: '{"ok":true}', statusCode: 200, latencyMs: 100 } as any,
      { requestId: 'req1', payload: '{"ok":false}', statusCode: 400 } as any
    ]);
    const variantsMap = getMockVariants();
    const variants = variantsMap['req1'] || [];
    expect(variants.length).toBe(1);
    expect(variants[0]?.name).toBe('Scenario');
    expect(variants[0]?.payload).toBe('{"ok":false}');
    expect(variants[0]?.statusCode).toBe(400);
  });
});
