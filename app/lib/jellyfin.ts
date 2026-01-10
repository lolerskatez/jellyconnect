import { Jellyfin } from '@jellyfin/sdk';
import { generateSecurePassword } from './secure-password';
import { UserPolicy, JellyfinRole, getRolePolicyForJellyfin } from './oidc-group-mapping';
import { jellyfinLogger } from './logger';

export const jellyfin = new Jellyfin({
  clientInfo: {
    name: 'JellyConnect',
    version: '1.0.0'
  },
  deviceInfo: {
    name: 'Web App',
    id: 'web-app-1'
  }
});

export function buildJellyfinBaseUrl(url: string): string {
  if (!url) {
    return '';
  }
  
  // If URL already has a scheme, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Add http:// scheme for URLs without one (like localIP:8096)
  return `http://${url}`;
}

export class JellyfinAuth {
  private api: any;
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    if (!baseUrl || !apiKey) {
      jellyfinLogger.error('JellyfinAuth initialization failed', {
        hasBaseUrl: !!baseUrl,
        hasApiKey: !!apiKey,
        baseUrl: baseUrl || 'EMPTY',
        apiKeyLength: apiKey?.length || 0
      });
    }
    jellyfinLogger.debug('Creating JellyfinAuth instance', { 
      baseUrl, 
      apiKeyLength: apiKey?.length || 0,
      hasApiKey: !!apiKey
    });
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.api = jellyfin.createApi(baseUrl, apiKey);
    jellyfinLogger.debug('JellyfinAuth instance created successfully');
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Use native fetch instead of SDK's axiosInstance for better reliability
      const response = await fetch(`${this.baseUrl}/System/Info`, {
        method: 'GET',
        headers: {
          'X-Emby-Token': this.apiKey,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        jellyfinLogger.info('API key validation successful', { 
          status: response.status,
          serverName: data?.ServerName 
        });
        return true;
      } else {
        jellyfinLogger.error('API key validation failed', { 
          status: response.status,
          statusText: response.statusText,
          url: `${this.baseUrl}/System/Info`
        });
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      jellyfinLogger.error('API key validation error', { 
        error: errorMsg,
        baseUrl: this.baseUrl,
        apiKeyLength: this.apiKey?.length || 0
      });
      return false;
    }
  }

  async getUsers(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/Users`, {
        method: 'GET',
        headers: {
          'X-Emby-Token': this.apiKey,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        throw new Error(`Failed to get users: HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      jellyfinLogger.error('Failed to get users', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error;
    }
  }

  async authenticate(username: string, password: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Authorization': 'MediaBrowser Client="JellyConnect", Device="Web App", DeviceId="web-app-1", Version="1.0.0"'
        },
        body: JSON.stringify({
          Username: username,
          Pw: password
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        throw new Error(`Authentication failed: HTTP ${response.status}`);
      }
      const data = await response.json();
      const user = data.User;
      const isAdmin = user.Policy?.IsAdministrator || false;
      return {
        user,
        token: data.AccessToken,
        is_admin: isAdmin,
      };
    } catch (error) {
      const errorDetails: any = { username };
      if (error instanceof Error) {
        errorDetails.message = error.message;
        errorDetails.name = error.name;
        errorDetails.stack = error.stack;
      } else if (typeof error === 'object' && error !== null) {
        errorDetails.error = JSON.stringify(error);
        if ('response' in error) {
          errorDetails.status = (error as any).response?.status;
          errorDetails.statusText = (error as any).response?.statusText;
          errorDetails.responseData = (error as any).response?.data;
        }
        if ('config' in error) {
          errorDetails.url = (error as any).config?.url;
          errorDetails.method = (error as any).config?.method;
        }
      } else {
        errorDetails.error = String(error);
      }
      jellyfinLogger.error('Authentication failed', errorDetails)
      throw error;
    }
  }

  async getUserById(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/Users/${userId}`, {
        method: 'GET',
        headers: {
          'X-Emby-Token': this.apiKey,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        throw new Error(`Failed to get user: HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      const errorDetails: any = { userId };
      if (error instanceof Error) {
        errorDetails.message = error.message;
        errorDetails.name = error.name;
        errorDetails.stack = error.stack;
      } else if (typeof error === 'object' && error !== null) {
        errorDetails.error = JSON.stringify(error);
        if ('response' in error) {
          errorDetails.status = (error as any).response?.status;
          errorDetails.statusText = (error as any).response?.statusText;
          errorDetails.responseData = (error as any).response?.data;
        }
        if ('config' in error) {
          errorDetails.url = (error as any).config?.url;
          errorDetails.method = (error as any).config?.method;
        }
      } else {
        errorDetails.error = String(error);
      }
      jellyfinLogger.error('Failed to get user', errorDetails)
      throw error;
    }
  }

  async createUser(username: string, password?: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/Users/New`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Token': this.apiKey
        },
        body: JSON.stringify({
          Name: username,
          Password: password || ''
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        throw new Error(`Failed to create user: HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      jellyfinLogger.error('Failed to create user', { username, error: error instanceof Error ? error.message : 'Unknown error' })
      throw error;
    }
  }

  /**
   * Creates a new Jellyfin user with a secure random password and optional role/policy
   * Used for SSO first-time user creation
   */
  async createSSOUser(
    username: string,
    email: string,
    role: JellyfinRole = 'user'
  ): Promise<{ userId: string; username: string; password: string }> {
    try {
      // Generate a secure random password
      const securePassword = generateSecurePassword();

      jellyfinLogger.info('Creating SSO user', { username, role, email })

      // Create the user
      const createdUser = await this.createUser(username, securePassword);
      const userId = createdUser.Id;

      if (!userId) {
        throw new Error('No user ID returned from Jellyfin');
      }

      // Apply the role policy
      const policy = getRolePolicyForJellyfin(role);
      await this.updateUserPolicy(userId, policy);

      jellyfinLogger.info('SSO user created successfully', { userId, username, role })

      return {
        userId,
        username,
        password: securePassword
      };
    } catch (error) {
      jellyfinLogger.error('Failed to create SSO user', { username, role, error: error instanceof Error ? error.message : 'Unknown error' })
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/Users/${userId}`, {
        method: 'DELETE',
        headers: {
          'X-Emby-Token': this.apiKey
        },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        throw new Error(`Failed to delete user: HTTP ${response.status}`);
      }
    } catch (error) {
      jellyfinLogger.error('Failed to delete user', { userId, error: error instanceof Error ? error.message : 'Unknown error' })
      throw error;
    }
  }

  async updateUserPolicy(userId: string, policy: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/Users/${userId}/Policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Token': this.apiKey
        },
        body: JSON.stringify(policy),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        throw new Error(`Failed to update user policy: HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      jellyfinLogger.error('Failed to update user policy', { userId, error: error instanceof Error ? error.message : 'Unknown error' })
      throw error;
    }
  }

  async disableUser(userId: string): Promise<void> {
    try {
      // Get current user policy first
      const user = await this.getUserById(userId);

      // Update policy to disable the user
      const updatedPolicy = {
        ...user.Policy,
        IsDisabled: true
      };

      await this.updateUserPolicy(userId, updatedPolicy);
      jellyfinLogger.info('Successfully disabled Jellyfin user', { userId })
    } catch (error) {
      jellyfinLogger.error('Failed to disable user', { userId, error: error instanceof Error ? error.message : 'Unknown error' })
      throw error;
    }
  }
}