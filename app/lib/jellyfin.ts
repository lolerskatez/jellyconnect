import { Jellyfin } from '@jellyfin/sdk';
import { generateSecurePassword } from './secure-password';
import { UserPolicy, JellyfinRole, getRolePolicyForJellyfin } from './oidc-group-mapping';

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
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `http://${url}`;
  }
  return url;
}

export class JellyfinAuth {
  private api: any;

  constructor(baseUrl: string, apiKey: string) {
    this.api = jellyfin.createApi(baseUrl, apiKey);
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.api.axiosInstance.get('/System/Info/Public');
      return true;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  async getUsers(): Promise<any[]> {
    try {
      const response = await this.api.axiosInstance.get('/Users');
      return response.data;
    } catch (error) {
      console.error('Failed to get users:', error);
      throw error;
    }
  }

  async authenticate(username: string, password: string): Promise<any> {
    try {
      const response = await this.api.axiosInstance.post('/Users/AuthenticateByName', {
        Username: username,
        Pw: password,
      }, {
        headers: {
          'X-Emby-Authorization': 'MediaBrowser Client="JellyConnect", Device="Web App", DeviceId="web-app-1", Version="1.0.0"'
        }
      });
      const data = response.data;
      const user = data.User;
      const isAdmin = user.Policy?.IsAdministrator || false;
      return {
        user,
        token: data.AccessToken,
        is_admin: isAdmin,
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<any> {
    try {
      const response = await this.api.axiosInstance.get(`/Users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get user ${userId}:`, error);
      throw error;
    }
  }

  async createUser(username: string, password?: string): Promise<any> {
    try {
      const response = await this.api.axiosInstance.post('/Users/New', {
        Name: username,
        Password: password || '',
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create user:', error);
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

      console.log('[JELLYFIN] Creating SSO user:', username, 'with role:', role);

      // Create the user
      const createdUser = await this.createUser(username, securePassword);
      const userId = createdUser.Id;

      if (!userId) {
        throw new Error('No user ID returned from Jellyfin');
      }

      // Apply the role policy
      const policy = getRolePolicyForJellyfin(role);
      await this.updateUserPolicy(userId, policy);

      console.log('[JELLYFIN] SSO user created successfully:', userId, 'with role:', role);

      return {
        userId,
        username,
        password: securePassword
      };
    } catch (error) {
      console.error('[JELLYFIN] Failed to create SSO user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.api.axiosInstance.delete(`/Users/${userId}`);
    } catch (error) {
      console.error(`Failed to delete user ${userId}:`, error);
      throw error;
    }
  }

  async updateUserPolicy(userId: string, policy: any): Promise<any> {
    try {
      const response = await this.api.axiosInstance.post(`/Users/${userId}/Policy`, policy);
      return response.data;
    } catch (error) {
      console.error(`Failed to update user policy for ${userId}:`, error);
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
      console.log(`Successfully disabled Jellyfin user ${userId}`);
    } catch (error) {
      console.error(`Failed to disable user ${userId}:`, error);
      throw error;
    }
  }
}