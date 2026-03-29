import { UserModel } from '../../models/User.js';
import type { ProfileUpdateSection } from './profile.types.js';

const TOKEN_PROJECTION = {
  twoFactorSecret: 0,
  googleToken: 0,
  githubToken: 0,
  facebookToken: 0,
  xToken: 0,
  appleToken: 0,
  discordToken: 0,
} as const;

export const profileRepository = {
  async findLeanById(userId: string) {
    return UserModel.findById(userId).lean();
  },

  async findLeanByIdSelect(userId: string, spaceSeparatedFields: string) {
    return UserModel.findById(userId).select(spaceSeparatedFields).lean();
  },

  async findOneUsernameConflict(usernameLower: string, excludeUserId: string) {
    return UserModel.findOne({
      username: usernameLower,
      _id: { $ne: excludeUserId },
    })
      .select('_id')
      .lean();
  },

  async updateById(userId: string, updates: Record<string, unknown>) {
    return UserModel.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
      projection: TOKEN_PROJECTION,
    }).lean();
  },

  /** Semantic entry points for logging and future multi-collection transactions. */
  async updateBasic(userId: string, updates: Record<string, unknown>) {
    return this.updateById(userId, updates);
  },

  async updateSocial(userId: string, updates: Record<string, unknown>) {
    return this.updateById(userId, updates);
  },

  async updateWork(userId: string, updates: Record<string, unknown>) {
    return this.updateById(userId, updates);
  },

  async updateEducation(userId: string, updates: Record<string, unknown>) {
    return this.updateById(userId, updates);
  },

  async updateCertifications(userId: string, updates: Record<string, unknown>) {
    return this.updateById(userId, updates);
  },

  async updateProjects(userId: string, updates: Record<string, unknown>) {
    return this.updateById(userId, updates);
  },

  async updateSetup(userId: string, updates: Record<string, unknown>) {
    return this.updateById(userId, updates);
  },

  async updateBySection(userId: string, section: ProfileUpdateSection | 'legacy', updates: Record<string, unknown>) {
    switch (section) {
      case 'basic':
        return this.updateBasic(userId, updates);
      case 'social':
        return this.updateSocial(userId, updates);
      case 'work':
        return this.updateWork(userId, updates);
      case 'education':
        return this.updateEducation(userId, updates);
      case 'certifications':
        return this.updateCertifications(userId, updates);
      case 'projects':
        return this.updateProjects(userId, updates);
      case 'setup':
        return this.updateSetup(userId, updates);
      default:
        return this.updateById(userId, updates);
    }
  },
};
