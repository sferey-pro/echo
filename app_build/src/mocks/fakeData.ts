export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type MockStatus = 'active' | 'inactive';

export interface BrunoFolder {
  id: string;
  name: string;
  children?: BrunoFolder[];
}

export interface ApiRequest {
  id: string;
  folderId: string;
  name: string;
  method: HttpMethod;
  path: string;
  status: MockStatus;
  mockPayload: string;
}

export const FAKE_FOLDERS: BrunoFolder[] = [
  {
    id: 'f1',
    name: 'Users',
    children: [
      { id: 'f1-1', name: 'Auth' },
      { id: 'f1-2', name: 'Profile' }
    ]
  },
  {
    id: 'f2',
    name: 'Products',
  },
  {
    id: 'f3',
    name: 'Orders',
  }
];

export const FAKE_REQUESTS: ApiRequest[] = [
  { id: 'r1', folderId: 'f1-1', name: 'Login User', method: 'POST', path: '/api/v1/auth/login', status: 'active', mockPayload: '{\n  "token": "fake-jwt-token",\n  "user": { "id": 1, "name": "Admin" }\n}' },
  { id: 'r2', folderId: 'f1-1', name: 'Register User', method: 'POST', path: '/api/v1/auth/register', status: 'inactive', mockPayload: '{\n  "success": true\n}' },
  { id: 'r3', folderId: 'f1-2', name: 'Get Profile', method: 'GET', path: '/api/v1/users/me', status: 'active', mockPayload: '{\n  "id": 1,\n  "name": "Admin",\n  "email": "admin@echo.local"\n}' },
  { id: 'r4', folderId: 'f2', name: 'List Products', method: 'GET', path: '/api/v1/products', status: 'active', mockPayload: '[\n  { "id": 101, "name": "Echo Dot" },\n  { "id": 102, "name": "Echo Show" }\n]' },
  { id: 'r5', folderId: 'f3', name: 'Create Order', method: 'POST', path: '/api/v1/orders', status: 'active', mockPayload: '{\n  "orderId": "ORD-12345",\n  "status": "created"\n}' },
];
