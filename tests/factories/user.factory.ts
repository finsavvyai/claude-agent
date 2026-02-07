/**
 * User factory for generating test user data
 */

import { faker } from '@faker-js/faker';

export interface UserFactoryOptions {
  id?: string;
  email?: string;
  name?: string;
  password?: string;
  role?: 'user' | 'admin' | 'moderator';
  avatar?: string;
  preferences?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class UserFactory {
  /**
   * Create a single test user
   */
  static create(overrides: UserFactoryOptions = {}): any {
    const id = overrides.id || faker.datatype.uuid();
    const email = overrides.email || faker.internet.email().toLowerCase();
    const name = overrides.name || faker.person.fullName();
    const password = overrides.password || 'TestPassword123!';

    return {
      id,
      email,
      name,
      password,
      role: overrides.role || 'user',
      avatar: overrides.avatar || faker.image.avatar(),
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: true,
        ...overrides.preferences,
      },
      metadata: {
        source: 'test',
        createdAt: new Date().toISOString(),
        ...overrides.metadata,
      },
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };
  }

  /**
   * Create multiple test users
   */
  static createMany(count: number, overrides: UserFactoryOptions = {}): any[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        ...(overrides.id ? {} : {
          id: `${overrides.id || 'user'}-${index + 1}`
        })
      })
    );
  }

  /**
   * Create an admin user
   */
  static createAdmin(overrides: UserFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      role: 'admin',
      email: overrides.email || 'admin@test.com',
      name: overrides.name || 'Admin User',
    });
  }

  /**
   * Create a moderator user
   */
  static createModerator(overrides: UserFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      role: 'moderator',
      email: overrides.email || 'moderator@test.com',
      name: overrides.name || 'Moderator User',
    });
  }

  /**
   * Create user with specific email domain
   */
  static createWithDomain(domain: string, overrides: UserFactoryOptions = {}): any {
    const localPart = faker.internet.userName();
    const email = overrides.email || `${localPart}@${domain}`;

    return this.create({
      ...overrides,
      email,
    });
  }

  /**
   * Create user with specific preferences
   */
  static createWithPreferences(preferences: Record<string, any>, overrides: UserFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      preferences,
    });
  }

  /**
   * Create user for API testing (minimal data)
   */
  static createForAPI(overrides: UserFactoryOptions = {}): any {
    return {
      id: overrides.id || faker.datatype.uuid(),
      email: overrides.email || faker.internet.email().toLowerCase(),
      name: overrides.name || faker.person.fullName(),
      role: overrides.role || 'user',
    };
  }

  /**
   * Create user registration payload
   */
  static createRegistrationPayload(overrides: UserFactoryOptions = {}): any {
    const user = this.create(overrides);
    return {
      email: user.email,
      password: user.password,
      name: user.name,
    };
  }

  /**
   * Create user login payload
   */
  static createLoginPayload(overrides: UserFactoryOptions = {}): any {
    const user = this.create(overrides);
    return {
      email: user.email,
      password: user.password,
    };
  }

  /**
   * Create user update payload
   */
  static createUpdatePayload(overrides: UserFactoryOptions = {}): any {
    return {
      name: overrides.name || faker.person.fullName(),
      avatar: overrides.avatar || faker.image.avatar(),
      preferences: overrides.preferences || {
        theme: faker.helpers.arrayElement(['light', 'dark']),
        language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de']),
        notifications: faker.datatype.boolean(),
      },
    };
  }
}
