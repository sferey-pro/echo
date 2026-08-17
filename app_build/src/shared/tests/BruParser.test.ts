import { describe, it, expect } from 'bun:test';
import { BruParser } from '../lib/parsers/BruParser';

describe('BruParser', () => {
  const parser = new BruParser();

  it('should parse a valid .bru file correctly', () => {
    const bruContent = `meta {
  name: Get Users
}
get {
  url: https://api.example.com/users
}
`;
    const result = parser.parse(bruContent);
    
    expect(result).not.toBeNull();
    expect(result?.info?.name).toBe('Get Users');
    expect(result?.info?.type).toBe('http');
    expect(result?.http?.method).toBe('GET');
    expect(result?.http?.url).toBe('https://api.example.com/users');
  });

  it('should handle missing meta safely', () => {
    const bruContent = `get {
  url: https://api.example.com/users
}
`;
    const result = parser.parse(bruContent);
    
    expect(result).not.toBeNull();
    expect(result?.info?.name).toBe('Unknown');
    expect(result?.http?.method).toBe('GET');
    expect(result?.http?.url).toBe('https://api.example.com/users');
  });
});
