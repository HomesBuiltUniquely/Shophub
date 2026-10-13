export type ClientSavedProfile = {
  email: string;
  displayName: string;
  phone: string;
  location: string;
  propertyType: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  gallery: string[];
  updatedAt?: string;
};

export const EMPTY_CLIENT_PROFILE: ClientSavedProfile = {
  email: '',
  displayName: '',
  phone: '',
  location: '',
  propertyType: '',
  bio: '',
  avatarUrl: '',
  coverUrl: '',
  gallery: [],
};

export const CLIENT_PROFILE_UPDATED_EVENT = 'shophub-client-profile-updated';
