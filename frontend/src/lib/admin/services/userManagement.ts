export interface User {
	id: string;
	username: string;
	isAdmin: boolean;
	createdAt: string;
	totpEnabled: boolean;
}

export interface CreateUserData {
	username: string;
	password: string;
	isAdmin: boolean;
}

export interface UpdateUserData {
	username?: string;
	password?: string;
	isAdmin?: boolean;
	totpEnabled?: boolean;
}

export interface UserManagementResponse {
	success: boolean;
	message?: string;
	user?: User;
	users?: User[];
	count?: number;
}

class UserManagementService {
	private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const response = await fetch(endpoint, {
			...options,
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			}
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({
				error: 'Request failed',
				message: `HTTP ${response.status}: ${response.statusText}`
			}));

			throw new Error(errorData.message || errorData.error || 'Request failed');
		}

		return response.json();
	}

	async getAllUsers(): Promise<User[]> {
		const data = await this.makeRequest<UserManagementResponse>('/api/users');
		return data.users || [];
	}

	async getUserById(id: string): Promise<User> {
		const data = await this.makeRequest<UserManagementResponse>(`/api/users/${id}`);
		if (!data.user) {
			throw new Error('User not found');
		}
		return data.user;
	}

	async createUser(userData: CreateUserData): Promise<User> {
		const data = await this.makeRequest<UserManagementResponse>('/api/users', {
			method: 'POST',
			body: JSON.stringify(userData)
		});
		if (!data.user) {
			throw new Error(data.message || 'Failed to create user');
		}
		return data.user;
	}

	async updateUser(id: string, userData: UpdateUserData): Promise<User> {
		const data = await this.makeRequest<UserManagementResponse>(`/api/users/${id}`, {
			method: 'PUT',
			body: JSON.stringify(userData)
		});
		if (!data.user) {
			throw new Error(data.message || 'Failed to update user');
		}
		return data.user;
	}

	async deleteUser(id: string): Promise<void> {
		await this.makeRequest<UserManagementResponse>(`/api/users/${id}`, {
			method: 'DELETE'
		});
	}

	async resetPassword(id: string, newPassword: string): Promise<void> {
		await this.makeRequest<UserManagementResponse>(`/api/users/${id}/reset-password`, {
			method: 'POST',
			body: JSON.stringify({ newPassword })
		});
	}

	async reset2FA(id: string): Promise<void> {
		await this.makeRequest<UserManagementResponse>(`/api/users/${id}/reset-2fa`, {
			method: 'POST'
		});
	}
}

export const userManagementService = new UserManagementService();
